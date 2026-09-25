// Daily catch-up, reminders and coordinator escalation. No email is sent by this script.
const dates = base.getTable('Clinic Staffing Dates');
const responses = base.getTable('Clinic Staffing Responses');
const members = base.getTable('Clinic Team Members');
const notifications = base.getTable('Clinic Staffing Notifications');
const today = new Intl.DateTimeFormat('en-CA',{timeZone:'America/Chicago',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const dateRecords = (await dates.selectRecordsAsync()).records;
const responseRecords = (await responses.selectRecordsAsync()).records;
const memberRecords = (await members.selectRecordsAsync()).records;
const queued = new Set((await notifications.selectRecordsAsync({fields:['Notification Key']})).records.map(r=>r.getCellValueAsString('Notification Key')));
const portal = 'https://same-abupp8cny20-latest.netlify.app/portal/clinic';
async function queue(key,email,subject,message) {
  if(!email) return;
  key += '|'+email.toLowerCase();
  if(queued.has(key))return;
  await notifications.createRecordAsync({'Notification Key':key,Recipient:email,Subject:subject,Message:message});
  queued.add(key);
}
for(const clinic of dateRecords) {
  const date=String(clinic.getCellValue('Clinic Date')||'').slice(0,10);
  const stage=clinic.getCellValueAsString('Scheduling Stage');
  if(!date||date<today||['Cancelled','Completed'].includes(stage))continue;
  const days=Math.round((Date.parse(date+'T12:00:00Z')-Date.parse(today+'T12:00:00Z'))/86400000);
  const rows=responseRecords.filter(r=>(r.getCellValue('Clinic Date')||[]).some(x=>x.id===clinic.id));
  const attending=rows.filter(r=>r.getCellValueAsString('Computed Attendance Plan')==='Attending');
  const vets=attending.filter(r=>r.getCellValueAsString('Team Member Role')==='Veterinarian');
  const techs=attending.filter(r=>r.getCellValueAsString('Team Member Role')==='Vet Tech');
  const volunteers=attending.filter(r=>r.getCellValueAsString('Team Member Role')==='Clinic Volunteer');
  const covered=new Set();
  for(const volunteer of volunteers) {
    const assignments=volunteer.getCellValue('Clinic Assignments')||[];
    if(assignments.length) assignments.forEach(x=>covered.add(x.name||String(x)));
    else {
      const legacy=volunteer.getCellValueAsString('Clinic Assignment');
      if(legacy) covered.add(legacy);
    }
  }
  const missing=['Front Room System','Back Room System','Autoclave'].filter(x=>!covered.has(x));
  const eligibleRoles=new Set(['Veterinarian',...(vets.length?['Vet Tech']:[]),...(vets.length&&techs.length?['Clinic Volunteer']:[])]);
  const existing=new Set(rows.flatMap(r=>(r.getCellValue('Team Member')||[]).map(x=>x.id)));
  // Catch newly approved members and dates that existed before an automation was enabled.
  for(const member of memberRecords) {
    if(!member.getCellValue('Active')||!member.getCellValue('Receive Scheduling Emails')||!member.getCellValueAsString('Email')||!eligibleRoles.has(member.getCellValueAsString('Role'))||existing.has(member.id))continue;
    await responses.createRecordAsync({'Clinic Date':[{id:clinic.id}],'Team Member':[{id:member.id}],'Initial Response':{name:'No Response'},'One-Week Reconfirmation':{name:'Awaiting Response'},'Final Attendance Plan':{name:'Unconfirmed'},'Availability Clinic Date':date,'Veterinarian for Invitation':vets[0]?.getCellValueAsString('Team Member Name')||''});
    existing.add(member.id);
  }
  let unanswered=0,missingReconfirmations=0;
  for(const row of rows) {
    const memberId=(row.getCellValue('Team Member')||[])[0]?.id;
    const member=memberRecords.find(m=>m.id===memberId);
    if(!member||!member.getCellValue('Active')||!member.getCellValue('Receive Scheduling Emails')||!eligibleRoles.has(member.getCellValueAsString('Role')))continue;
    const email=member.getCellValueAsString('Email');
    const stamp=row.getCellValueAsString('Availability Clinic Date');
    if(stamp&&stamp!==date)continue; // The sync must clear stale commitments first.
    const initial=row.getCellValueAsString('Initial Response');
    const epoch=clinic.getCellValueAsString('Last Reviewed Schedule');
    const key=clinic.id+'|'+date+'|'+row.id+'|'+epoch;
    if(!initial||initial==='No Response') {
      unanswered++;
      const created=row.getCellValue('Invitation Created At');
      // Daily catch-up also covers a next-round invitation whose existing row was reset.
      await queue(key+'|invitation',email,'Safe Haven clinic availability: '+date,`Please tell us whether you can attend the clinic on ${date}.\n\n${portal}`);
      if(created&&Date.now()-Date.parse(created)>48*3600000)await queue(key+'|unanswered|'+today,email,'Please reply: clinic availability '+date,`We have not received your availability for ${date}. Please answer Yes or No in the portal.\n\n${portal}`);
    }
    const initialAt=row.getCellValue('Initial Response Date');
    const reconfirmedAt=row.getCellValue('Reconfirmation Date');
    const reconfirm=row.getCellValueAsString('One-Week Reconfirmation');
    const fresh=Boolean(reconfirmedAt)&&(!initialAt||Date.parse(reconfirmedAt)>=Date.parse(initialAt))&&['Yes, still attending','No, can no longer attend'].includes(reconfirm);
    if(days<=7&&row.getCellValueAsString('Computed Attendance Plan')==='Attending'&&!fresh) {
      missingReconfirmations++;
      await queue(key+'|reconfirm|'+String(initialAt||'')+'|'+today,email,'Please reconfirm clinic attendance: '+date,`The clinic is ${days===0?'today':`in ${days} day(s)`}. Please reconfirm your attendance, including if you signed up within the last week.\n\n${portal}`);
    }
  }
  const ready=vets.length>=1&&techs.length>=1&&volunteers.length>=6&&!missing.length&&!clinic.getCellValue('Booked Appointment Follow-Up Required');
  const next=ready?'Staffed':vets.length?(techs.length?(volunteers.length?'Staffing In Progress':'Awaiting Volunteers'):'Awaiting Vet Tech'):(stage==='Proposed'?'Proposed':'At Risk');
  if(next!==stage||clinic.getCellValue('Volunteer Target')!==6)await dates.updateRecordAsync(clinic.id,{'Scheduling Stage':{name:next},'Volunteer Target':6});
  if(days<=7&&(!ready||unanswered||missingReconfirmations)) {
    const message=`Clinic ${date}: ${vets.length} veterinarian(s), ${techs.length} vet tech(s), ${volunteers.length}/6 volunteers.\nMissing specialist coverage: ${missing.join(', ')||'None'}.\nUnanswered invitations: ${unanswered}. Missing reconfirmations: ${missingReconfirmations}.\nPatient follow-up required: ${clinic.getCellValue('Booked Appointment Follow-Up Required')?'Yes':'No'}.\nPlease resolve coverage and contact nonresponders.\n\n${portal}`;
    for(const email of ['rachelyn001@yahoo.com','jenpopp@hotmail.com'])await queue(clinic.id+'|deadline|'+date+'|'+today,email,'Clinic staffing deadline: '+date,message);
  }
}
