import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const script=await fs.readFile(new URL('./airtable/daily-staffing-follow-up.js',import.meta.url),'utf8');
const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;
const date=new Date(Date.now()+86400000).toISOString().slice(0,10);
function record(id,fields,allowed){return {id,fields,getCellValue(name){assert.ok(allowed.includes(name),`Unknown field ${name}`);return fields[name]??null;},getCellValueAsString(name){const value=this.getCellValue(name);return value?.name??String(value??'');}};}
function fixture(){
 const memberFields=['Role','Active','Receive Scheduling Emails','Email'];
 const responseFields=['Clinic Date','Team Member','Team Member Role','Team Member Name','Computed Attendance Plan','Clinic Assignment','Availability Clinic Date','Initial Response','Initial Response Date','Reconfirmation Date','One-Week Reconfirmation','Invitation Created At'];
 const dateFields=['Clinic Date','Scheduling Stage','Last Reviewed Schedule','Booked Appointment Follow-Up Required','Volunteer Target'];
 const data={
 'Clinic Staffing Dates':[record('clinic',{ 'Clinic Date':date,'Scheduling Stage':'Awaiting Vet Tech','Volunteer Target':6},dateFields)],
 'Clinic Team Members':[record('vet',{Role:'Veterinarian',Active:true,'Receive Scheduling Emails':true,Email:'vet@example.invalid'},memberFields),record('tech',{Role:'Vet Tech',Active:true,'Receive Scheduling Emails':true,Email:'tech@example.invalid'},memberFields)],
 'Clinic Staffing Responses':[record('response',{'Clinic Date':[{id:'clinic'}],'Team Member':[{id:'vet'}],'Team Member Role':'Veterinarian','Computed Attendance Plan':'Attending','Initial Response':'Yes','Initial Response Date':new Date().toISOString(),'One-Week Reconfirmation':'Awaiting Response','Availability Clinic Date':date},responseFields)],
 'Clinic Staffing Notifications':[]};
 const base={getTable(name){assert.ok(data[name],name);return {selectRecordsAsync:async()=>({records:data[name]}),createRecordAsync:async fields=>{const id='new'+data[name].length;data[name].push(record(id,fields,name==='Clinic Staffing Responses'?responseFields:['Notification Key','Recipient','Subject','Message']));return id;},updateRecordAsync:async(id,fields)=>Object.assign(data[name].find(r=>r.id===id).fields,fields)};}};
 return {base,data};
}
test('late signup receives reconfirmation, new tech receives invitation record, coordinators get escalation',async()=>{
 const {base,data}=fixture();await new AsyncFunction('base',script)(base);
 assert.equal(data['Clinic Staffing Responses'].length,2);
 const queue=data['Clinic Staffing Notifications'];assert.equal(queue.filter(r=>r.fields.Recipient==='vet@example.invalid').length,1);assert.equal(queue.filter(r=>r.fields.Subject.startsWith('Clinic staffing deadline')).length,2);
 await new AsyncFunction('base',script)(base);assert.equal(data['Clinic Staffing Responses'].length,2);assert.equal(queue.filter(r=>r.fields.Recipient==='vet@example.invalid').length,1);
});
test('cancelled dates produce no invitations or reminders',async()=>{
 const {base,data}=fixture();data['Clinic Staffing Dates'][0].fields['Scheduling Stage']='Cancelled';await new AsyncFunction('base',script)(base);assert.equal(data['Clinic Staffing Notifications'].length,0);assert.equal(data['Clinic Staffing Responses'].length,1);
});
test('a newer reconfirmation suppresses follow-up but an older one does not',async()=>{
 const {base,data}=fixture();const row=data['Clinic Staffing Responses'][0];row.fields['One-Week Reconfirmation']='Yes, still attending';row.fields['Reconfirmation Date']=new Date(Date.now()+1000).toISOString();await new AsyncFunction('base',script)(base);assert.equal(data['Clinic Staffing Notifications'].filter(r=>r.fields.Recipient==='vet@example.invalid').length,0);
 row.fields['Reconfirmation Date']='2000-01-01T00:00:00Z';await new AsyncFunction('base',script)(base);assert.equal(data['Clinic Staffing Notifications'].filter(r=>r.fields.Recipient==='vet@example.invalid').length,1);
});
