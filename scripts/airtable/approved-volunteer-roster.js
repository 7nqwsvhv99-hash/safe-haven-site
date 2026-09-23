// Airtable automation script. Staff approves the application and clinic role/skills.
const { applicationId } = input.config();
const applications = base.getTable('Volunteer Applications');
const volunteers = base.getTable('Volunteers');
const members = base.getTable('Clinic Team Members');
const app = await applications.selectRecordAsync(applicationId);
if (!app || app.getCellValueAsString('Status') !== 'Approved') return;
const text = name => app.getCellValueAsString(name).trim();
const email = text('Email').toLowerCase();
if (!email) throw new Error('Approved application needs an email.');
const linked = (app.getCellValue('Volunteers') || []).map(x => x.id);
const roster = await volunteers.selectRecordsAsync({ fields: ['Email', 'Application', 'Status'] });
const candidates = roster.records.filter(r => linked.includes(r.id) || r.getCellValueAsString('Email').trim().toLowerCase() === email);
if (candidates.length > 1) throw new Error('Multiple volunteer profiles match. Resolve duplicates before processing.');
let volunteer = candidates[0];
const fields = {
  'Volunteer Name': text('Applicant Name'), Email: email, 'Cell Phone': text('Cell Phone'),
  Availability: text('Availability'), 'Application Interests / Experience': text('Experience & Interests'),
  'Preferred Contact': text('Preferred Contact') ? {name:text('Preferred Contact')} : null,
  Application: [...new Set([...(volunteer?.getCellValue('Application') || []).map(x=>x.id), app.id])].map(id=>({id})),
};
if (volunteer) await volunteers.updateRecordAsync(volunteer.id, fields);
else {
  const id = await volunteers.createRecordAsync({...fields, Status:{name:'Active'}, 'Start Date':new Date().toISOString().slice(0,10), 'Follow-Up Status':{name:'Not Due'}});
  volunteer = await volunteers.selectRecordAsync(id);
}
const role = text('Approved Clinic Role');
if (!role) return; // Application approval alone never grants clinical credentials.
const links = app.getCellValue('Clinic Team Member') || [];
if (links.length > 1) throw new Error('Select only one Clinic Team Member.');
const team = await members.selectRecordsAsync({fields:['Email','Team Member Name','Volunteer Skills','Volunteer Record']});
const matches = team.records.filter(r => links.some(x=>x.id===r.id) || r.getCellValueAsString('Email').trim().toLowerCase()===email);
if(matches.length>1) throw new Error('Multiple clinic profiles match. Reconcile before processing.');
let member = matches[0];
if(!member && team.records.some(r=>!r.getCellValueAsString('Email') && r.getCellValueAsString('Team Member Name').trim().split(/\s+/)[0].toLowerCase()===text('Applicant Name').split(/\s+/)[0].toLowerCase())) {
  throw new Error('An existing clinic member may have a missing email. Staff must select the existing Clinic Team Member on this application.');
}
const skills = app.getCellValue('Approved Clinic Skills') || [];
const update = {
 'Team Member Name':text('Applicant Name'), Email:email, Phone:text('Cell Phone'),
 Role:{name:role}, Active:true, 'Receive Scheduling Emails':Boolean(app.getCellValue('Scheduling Email Consent')),
 'Preferred Contact':text('Preferred Contact') ? {name:text('Preferred Contact')} : null,
 'Volunteer Record':[{id:volunteer.id}],
 ...(skills.length ? {'Volunteer Skills':skills.map(s=>({name:s.name}))} : {}),
};
if(member) await members.updateRecordAsync(member.id,update);
else { const id=await members.createRecordAsync(update); member=await members.selectRecordAsync(id); }
if(!links.some(x=>x.id===member.id)) await applications.updateRecordAsync(app.id,{'Clinic Team Member':[{id:member.id}]});
