// Canonical cross-base date synchronization. Airtable's legacy synced-view writers
// are retired; ClinicDay Record ID always contains the actual ClinicDay record ID.
const CD = 'app3AcoD2G64aMsEz';
const SH = 'app2vpch2JJVrP9pu';
const DAYS = 'tblnOw4Qr5AvCRWvQ';
const DATES = 'tblJvWn5fh7Rtfp3O';
const RESPONSES = 'tblEVlmHvHzItbcVl';
const QUEUE = 'tblrvVMkJ0QerkaIp';
const COORDINATORS = ['rachelyn001@yahoo.com', 'jenpopp@hotmail.com'];
export const dateKey = value => String(value || '').slice(0, 10);
export const todayChicago = () => new Intl.DateTimeFormat('en-CA', { timeZone:'America/Chicago', year:'numeric', month:'2-digit', day:'2-digit' }).format(new Date());
export const clinicType = date => ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][new Date(date+'T12:00:00Z').getUTCDay()];
export const capacities = type => type === 'Half Day'
  ? {'Legacy Surgical Capacity':12,'Non-Surgical Capacity':5,'Base Public Surgical Capacity':5,'Max Capacity':21}
  : {'Legacy Surgical Capacity':21,'Non-Surgical Capacity':9,'Base Public Surgical Capacity':4,'Max Capacity':26};
async function request(base, table, method='GET', payload, query='') {
  // Stay below Airtable's per-base request rate, including multi-page reads.
  await new Promise(resolve=>setTimeout(resolve,220));
  for(let attempt=0;attempt<3;attempt++) {
    const response=await fetch(`https://api.airtable.com/v0/${base}/${table}${query}`, {method,headers:{Authorization:`Bearer ${process.env.AIRTABLE_ACCESS_TOKEN}`,'Content-Type':'application/json'},...(payload?{body:JSON.stringify(payload)}:{})});
    if(response.status===429 && attempt<2){await new Promise(resolve=>setTimeout(resolve,30000));continue;}
    const body=await response.json();
    if(!response.ok) throw new Error(`Airtable ${method} ${table}: ${response.status} ${JSON.stringify(body)}`);
    return body;
  }
}
const recordCache = new Map();
async function list(base,table){const records=[];let offset;do{const body=await request(base,table,'GET',undefined,'?pageSize=100'+(offset?'&offset='+encodeURIComponent(offset):''));records.push(...(body.records||[]));for(const row of body.records||[])recordCache.set(base+table+row.id,row.fields);offset=body.offset;}while(offset);return records;}
async function patch(base,table,id,fields){
 const current=recordCache.get(base+table+id)||{};
 const changed=Object.fromEntries(Object.entries(fields).filter(([key,value])=>key!=='Last ClinicDay Sync' && JSON.stringify(current[key]??null)!==JSON.stringify(value??null)));
 if(!Object.keys(changed).length)return;
 if(fields['Last ClinicDay Sync'])changed['Last ClinicDay Sync']=fields['Last ClinicDay Sync'];
 await request(base,table,'PATCH',{records:[{id,fields:changed}]});
 recordCache.set(base+table+id,{...current,...changed});
}
async function upsert(base,table,key,fields){return (await request(base,table,'PATCH',{performUpsert:{fieldsToMergeOn:[key]},records:[{fields}]})).records[0];}
export default async () => {
 if(process.env.CLINIC_SCHEDULING_V2_ENABLED !== 'true') return new Response(JSON.stringify({ok:true,paused:'Awaiting Airtable automation activation'}));
 if(!process.env.AIRTABLE_ACCESS_TOKEN) throw new Error('AIRTABLE_ACCESS_TOKEN is missing');
 recordCache.clear();
 const today=todayChicago();
 const source=await list(CD,DAYS);
 const staffing=await list(SH,DATES);
 const responses=await list(SH,RESPONSES);
 const members=await list(SH,'tblVG88gCVYbRC8Qo');
 const queue=await list(SH,QUEUE);
 const queued=new Set(queue.map(r=>r.fields['Notification Key']));
 const memberById=new Map(members.map(r=>[r.id,r.fields]));
 const enqueue=async(key,email,subject,message)=>{
   const full=key+'|'+email.toLowerCase(); if(!email||queued.has(full))return;
   await upsert(SH,QUEUE,'Notification Key',{'Notification Key':full,Recipient:email,Subject:subject,Message:message}); queued.add(full);
 };
 const notices=async(row,kind,oldDate,newDate,patients)=>{
   const key=`${row.id}|${kind}|${oldDate}|${newDate}|${row.fields['Last Reviewed Schedule']||'initial'}`;
   const message=`Clinic schedule changed: ${oldDate} → ${newDate}. ${kind}.\n\nPrevious commitments must not be carried over. Please open the Clinic Team Portal and submit fresh availability when the new invitation appears.\nhttps://same-abupp8cny20-latest.netlify.app/portal/clinic`;
   const recipients=new Set();
   for(const response of responses.filter(r=>(r.fields['Clinic Date']||[]).includes(row.id))) {
     for(const id of response.fields['Team Member']||[]) {const m=memberById.get(id);const email=m?.Email;if(email&&m['Receive Scheduling Emails'])recipients.add(email);}
     await patch(SH,RESPONSES,response.id,{'Initial Response':'No Response','Initial Response Date':null,'One-Week Reconfirmation':'Awaiting Response','Reconfirmation Date':null,'Final Attendance Plan':'Unconfirmed','Clinic Assignment':null,'Availability Clinic Date':newDate});
   }
   for(const email of recipients) await enqueue(key,email,'Safe Haven clinic schedule change',message);
   for(const email of COORDINATORS) await enqueue(key,email,'Clinic schedule change: coordinator review required',message+`\n\n${patients} scheduled patient cases. Booking has been placed on hold. Review the linked ClinicDay date and contact each affected owner/partner; document the outcome before moving or cancelling patient appointments. Clear Booked Appointment Follow-Up Required only after that work, and release Scheduling Hold in ClinicDay only when staffing is safe.`);
 };
 // First reconcile known canonical links. Unique date matches migrate legacy SYNC IDs.
 for(const day of source) {
   const sf=day.fields, sourceDate=dateKey(sf.Clinic_Date), status=sf['Clinic Day Status'];
   const linkedRows=staffing.filter(r=>r.fields['ClinicDay Record ID']===day.id);
   if(linkedRows.length>1)throw new Error(`Multiple staffing records link to ClinicDay ${day.id}. Reconcile duplicates before syncing.`);
   let row=linkedRows[0];
   if(!row && sourceDate>=today) {
     const candidates=staffing.filter(r=>dateKey(r.fields['Clinic Date'])===sourceDate && (!r.fields['ClinicDay Record ID']||String(r.fields['ClinicDay Record ID']).startsWith('SYNC-')));
     if(candidates.length>1) throw new Error(`Duplicate staffing dates need reconciliation: ${sourceDate}`);
     row=candidates[0];
   }
   if(!row) {
     if(sourceDate<today||sf['Clinic Cancelled']||!['Scheduled','Active'].includes(status))continue;
     // Upsert by canonical source ID makes retries duplicate-safe.
     row=await upsert(SH,DATES,'ClinicDay Record ID',{'ClinicDay Record ID':day.id,'Clinic Date':sourceDate,'Clinic Type':['Wednesday','Saturday'].includes(clinicType(sourceDate))?clinicType(sourceDate):'Other','ClinicDay Session Type':sf['Clinic Type']||'Full Day','Scheduling Stage':'Proposed','Volunteer Target':6,'Staffing Source':'ClinicDay','Synced from ClinicDay':true,'Primary Follow-Up Email':COORDINATORS[0],'Secondary Follow-Up Email':COORDINATORS[1]});
     staffing.push(row);
   }
   const f=row.fields;
   if(sourceDate<today && dateKey(f['Clinic Date'])<today)continue;
   let previous;try{previous=JSON.parse(f['Last Reviewed Schedule']||'null');}catch{previous=null;}
   const localDate=dateKey(f['Clinic Date']);
   const localType=f['ClinicDay Session Type']||sf['Clinic Type']||'Full Day';
   const localCancelled=f['Scheduling Stage']==='Cancelled';
   const sourceCancelled=Boolean(sf['Clinic Cancelled']);
   const sourceChanged=previous && (previous.sourceDate!==sourceDate||previous.sourceType!==sf['Clinic Type']);
   const localChanged=previous && (previous.date!==localDate||previous.type!==localType);
   const cancelled=localCancelled||sourceCancelled;
   const cancellationChanged=previous ? previous.cancelled!==cancelled : localCancelled!==sourceCancelled;
   if(localChanged&&sourceChanged&&(localDate!==sourceDate||localType!==sf['Clinic Type'])) {
     await patch(CD,DAYS,day.id,{'Scheduling Hold?':true});
     await patch(SH,DATES,row.id,{'Booked Appointment Follow-Up Required':true,'Sync Review Notes':'Conflicting edits in both bases. Resolve the clinic date/type in both records before clearing this flag.'});
     for(const email of COORDINATORS) await enqueue(row.id+'|sync-conflict|'+localDate+'|'+sourceDate,email,'Clinic date sync conflict','Both clinic dates changed. Booking is on hold. Review both bases before resolving.');
     continue;
   }
   const targetDate=localChanged?localDate:sourceChanged?sourceDate:localDate;
   const targetType=localChanged?localType:sourceChanged?(sf['Clinic Type']||localType):localType;
   const patients=Number(sf['Scheduled Cases']||0);
   const change=Boolean(sourceChanged||localChanged||cancellationChanged);
   if(change){
     await patch(CD,DAYS,day.id,{'Scheduling Hold?':true});
     await patch(SH,DATES,row.id,{'Clinic Date':targetDate,'Scheduling Stage':cancelled?'Cancelled':'Proposed'});
     await notices(row,cancelled?'Cancelled':'Rescheduled',previous?.date||localDate,targetDate,patients);
   }
   const sourcePatch=cancelled?{'Scheduling Hold?':true}:{};
   if(targetType==='Full Day'&&Number(sf['Max Capacity'])!==26)sourcePatch['Max Capacity']=26;
   if(localCancelled&&!sourceCancelled)sourcePatch['Clinic Cancelled']=true;
   // Never silently move a clinic containing booked patients. Coordinator follows up first.
   if((targetDate!==sourceDate||targetType!==sf['Clinic Type']) && (!patients || (!change&&!f['Booked Appointment Follow-Up Required']))) {
     sourcePatch.Clinic_Date=targetDate;sourcePatch['Clinic Type']=targetType;
   }
   if(Object.keys(sourcePatch).length)await patch(CD,DAYS,day.id,sourcePatch);
   const nextSourceDate=sourcePatch.Clinic_Date||sourceDate;
   const nextSourceType=sourcePatch['Clinic Type']||sf['Clinic Type'];
   const update={'ClinicDay Record ID':day.id,'Clinic Date':targetDate,'ClinicDay Session Type':targetType,'Volunteer Target':6,'Synced from ClinicDay':true,'Last ClinicDay Sync':new Date().toISOString(),'Clinic Type':['Wednesday','Saturday'].includes(clinicType(targetDate))?clinicType(targetDate):'Other','Primary Follow-Up Email':f['Primary Follow-Up Email']||COORDINATORS[0],'Secondary Follow-Up Email':f['Secondary Follow-Up Email']||COORDINATORS[1],'Last Reviewed Schedule':JSON.stringify({date:targetDate,type:targetType,sourceDate:nextSourceDate,sourceType:nextSourceType,cancelled})};
   if(cancelled){update['Scheduling Stage']='Cancelled';sourcePatch['Scheduling Hold?']=true;}
   else if(status==='Complete')update['Scheduling Stage']='Completed';
   else if(change)update['Scheduling Stage']='Proposed';
   if(change){update['Booked Appointment Follow-Up Required']=patients>0;update['Sync Review Notes']=patients>0?'Schedule changed. Contact and reconcile all booked patients before clearing follow-up and releasing the ClinicDay scheduling hold.':'Schedule changed. Obtain fresh staffing responses and review the ClinicDay scheduling hold.';}
   await patch(SH,DATES,row.id,update);Object.assign(f,update);
 }
 for(const row of staffing) {
   const f=row.fields,date=dateKey(f['Clinic Date']);
   if(!date || date<today) continue;
   if(f['ClinicDay Record ID']) {
     if(!source.some(r=>r.id===f['ClinicDay Record ID'])) {
       await patch(SH,DATES,row.id,{'Booked Appointment Follow-Up Required':true,'Sync Review Notes':'Linked ClinicDay record is missing. Restore or explicitly reconcile its canonical link. Do not create another date.'});
       for(const email of COORDINATORS) await enqueue(row.id+'|missing-source',email,'ClinicDay link needs review',`Clinic ${date} has a missing ClinicDay record. Review patient bookings and restore the link.`);
     }
     continue;
   }
   const type=f['ClinicDay Session Type']||'Full Day',cancelled=f['Scheduling Stage']==='Cancelled';
   let prev;try{prev=JSON.parse(f['Last Reviewed Schedule']||'null');}catch{prev=null;}
   const changed=prev&&(prev.date!==date||prev.type!==type||prev.cancelled!==cancelled);
   if(changed) await notices(row,cancelled?'Cancelled':'Rescheduled',prev.date,date,0);
   const fields={'Volunteer Target':6,'Last Reviewed Schedule':JSON.stringify({date,type,cancelled})};
   if(changed&&!cancelled)fields['Scheduling Stage']='Proposed';
   await patch(SH,DATES,row.id,fields); Object.assign(f,fields);
   if(changed){f['Confirmed Veterinarians']=0;f['Confirmed Vet Techs']=0;}
 }
 // Staffing-origin dates only become patient-booking dates after vet and tech coverage.
 for(const row of staffing) {
   const f=row.fields,date=dateKey(f['Clinic Date']);
   if(date<today||!date||['Completed','Cancelled'].includes(f['Scheduling Stage'])||f['ClinicDay Record ID']||Number(f['Confirmed Veterinarians']||0)<1||Number(f['Confirmed Vet Techs']||0)<1)continue;
   const matches=source.filter(r=>dateKey(r.fields.Clinic_Date)===date);
   if(matches.length>1)throw new Error(`Multiple ClinicDay dates match ${date}`);
   let day=matches[0];
   if(day&&(day.fields['Clinic Cancelled']||day.fields['Clinic Day Status']==='Complete')){await patch(SH,DATES,row.id,{'Sync Review Notes':'Existing ClinicDay date is cancelled or complete. Coordinator must reconcile before reopening.'});continue;}
   const type=f['ClinicDay Session Type']||'Full Day';
   if(!day){day=await upsert(CD,DAYS,'Clinic_Date',{Clinic_Date:date,'Clinic Type':type,'Clinic Day Status':'Scheduled',...capacities(type)});source.push(day);}
   await patch(SH,DATES,row.id,{'ClinicDay Record ID':day.id,'Volunteer Target':6,'Last ClinicDay Sync':new Date().toISOString(),'Last Reviewed Schedule':JSON.stringify({date,type,sourceDate:date,sourceType:day.fields['Clinic Type'],cancelled:false})});
 }
 return new Response(JSON.stringify({ok:true}),{headers:{'Content-Type':'application/json'}});
};
export const config={schedule:'15 */6 * * *'};
