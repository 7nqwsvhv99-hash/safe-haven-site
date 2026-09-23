// Keeps the document register aligned with the signed waiver in onboarding.
const {applicationId}=input.config();
const app=await base.getTable('Volunteer Applications').selectRecordAsync(applicationId);
if(!app)return;
const volunteers=app.getCellValue('Volunteers')||[];
const files=app.getCellValue('Signed Volunteer Waiver')||[];
if(volunteers.length!==1||!files.length||!app.getCellValue('Waiver Signed Date')||!app.getCellValueAsString('Waiver Signed By'))return;
const docs=base.getTable('Documents & Agreements');
const records=(await docs.selectRecordsAsync({fields:['Document Type','Volunteer','External Document ID']})).records;
const key='VOL-WAIVER-'+app.id;
const exact=records.filter(r=>r.getCellValueAsString('External Document ID')===key);
const legacy=records.filter(r=>r.getCellValueAsString('Document Type')==='Volunteer Waiver'&&(r.getCellValue('Volunteer')||[]).some(v=>v.id===volunteers[0].id)&&!r.getCellValueAsString('External Document ID'));
const matches=exact.length?exact:legacy;
if(matches.length>1)throw Error('Multiple volunteer waivers match. Reconcile the document register before retrying.');
const fields={'Document Type':{name:'Volunteer Waiver'},Status:{name:'Signed'},Volunteer:volunteers,'External Document ID':key,'Signed Date':app.getCellValue('Waiver Signed Date'),'Signed By':app.getCellValueAsString('Waiver Signed By'),'Document File':files.map(f=>({url:f.url,filename:f.filename})),'Notes':'Signed document reviewed through Staff Portal Volunteer Onboarding. Application: '+app.id};
if(matches[0])await docs.updateRecordAsync(matches[0].id,fields);else await docs.createRecordAsync(fields);
