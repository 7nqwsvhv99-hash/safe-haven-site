import assert from 'node:assert/strict';
import test from 'node:test';
import sync,{capacities} from '../netlify/functions/sync-clinic-dates.mjs';
const CD='tblnOw4Qr5AvCRWvQ', D='tblJvWn5fh7Rtfp3O',R='tblEVlmHvHzItbcVl',M='tblVG88gCVYbRC8Qo',Q='tblrvVMkJ0QerkaIp';
const future='2030-10-12', moved='2030-10-19';
function fixture(){return {[CD]:[{id:'day1',fields:{Clinic_Date:future,'Clinic Type':'Full Day','Clinic Day Status':'Scheduled','Max Capacity':30,'Scheduled Cases':9}}],[D]:[{id:'clinic1',fields:{'ClinicDay Record ID':'day1','Clinic Date':future,'ClinicDay Session Type':'Full Day','Volunteer Target':4,'Scheduling Stage':'Staffed','Last Reviewed Schedule':JSON.stringify({date:future,type:'Full Day',sourceDate:future,sourceType:'Full Day',cancelled:false})}}],[R]:[{id:'response1',fields:{'Clinic Date':['clinic1'],'Team Member':['member1'],'Initial Response':'Yes','One-Week Reconfirmation':'Yes, still attending','Availability Clinic Date':future}}],[M]:[{id:'member1',fields:{Email:'test@example.invalid','Receive Scheduling Emails':true}}],[Q]:[]};}
async function run(db,failAfter=Infinity){
 const oldFetch=global.fetch,oldTimeout=global.setTimeout;let writes=0;
 process.env.AIRTABLE_ACCESS_TOKEN='test';process.env.CLINIC_SCHEDULING_V2_ENABLED='true';
 global.setTimeout=fn=>{fn();return 0;};
 global.fetch=async(url,options)=>{
  const table=new URL(url).pathname.split('/').at(-1), records=db[table];
  assert.ok(records,`Known table ${table}`);
  if(options.method==='GET')return {ok:true,status:200,json:async()=>({records:structuredClone(records)})};
  if(++writes>failAfter)throw Error('simulated interruption');
  const body=JSON.parse(options.body),result=[];
  for(const record of body.records){
   let found=record.id?records.find(x=>x.id===record.id):records.find(x=>body.performUpsert.fieldsToMergeOn.every(k=>x.fields[k]===record.fields[k]));
   if(!found){found={id:'new'+records.length,fields:{}};records.push(found);}
   Object.assign(found.fields,record.fields);result.push(structuredClone(found));
  }
  return {ok:true,status:200,json:async()=>({records:result})};
 };
 try{return await sync();}finally{global.fetch=oldFetch;global.setTimeout=oldTimeout;}
}
test('full day capacity 26, target six, canonical matching remains idempotent',async()=>{
 const db=fixture();db[D][0].fields['ClinicDay Record ID']='SYNC-old';await run(db);await run(db);
 assert.equal(db[D].length,1);assert.equal(db[D][0].fields['ClinicDay Record ID'],'day1');assert.equal(db[D][0].fields['Volunteer Target'],6);assert.equal(db[CD][0].fields['Max Capacity'],26);assert.equal(db[Q].length,0);assert.equal(capacities('Full Day')['Max Capacity'],26);
});
test('source date change invalidates commitments, holds bookings and queues notices once',async()=>{
 const db=fixture();db[CD][0].fields.Clinic_Date=moved;await run(db);const count=db[Q].length;await run(db);
 assert.equal(db[D][0].fields['Clinic Date'],moved);assert.equal(db[R][0].fields['Initial Response'],'No Response');assert.equal(db[R][0].fields['Reconfirmation Date'],null);assert.equal(db[D][0].fields['Patient Follow-Up Required'],true);assert.equal(db[CD][0].fields['Scheduling Hold?'],true);assert.equal(count,3);assert.equal(db[Q].length,count);
});
test('local date change preserves booked patient date until coordinator clears follow-up',async()=>{
 const db=fixture();db[D][0].fields['Clinic Date']=moved;await run(db);assert.equal(db[CD][0].fields.Clinic_Date,future);await run(db);assert.equal(db[CD][0].fields.Clinic_Date,future);
 db[D][0].fields['Patient Follow-Up Required']=false;await run(db);assert.equal(db[CD][0].fields.Clinic_Date,moved);
});
test('cancellation propagates through explicit flag, preserves patient records and closes staffing',async()=>{
 const db=fixture();db[D][0].fields['Scheduling Stage']='Cancelled';await run(db);assert.equal(db[CD][0].fields['Clinic Cancelled'],true);assert.equal(db[CD][0].fields['Scheduled Cases'],9);assert.equal(db[D][0].fields['Scheduling Stage'],'Cancelled');assert.equal(db[CD][0].fields['Scheduling Hold?'],true);
});
test('duplicate legacy dates stop reconciliation instead of guessing',async()=>{
 const db=fixture();delete db[D][0].fields['ClinicDay Record ID'];db[D].push(structuredClone({...db[D][0],id:'duplicate'}));await assert.rejects(run(db),/Duplicate staffing/);
});
test('unlinked staffing dates also reset old commitments after a change',async()=>{
 const db=fixture();db[CD]=[];delete db[D][0].fields['ClinicDay Record ID'];db[D][0].fields['Clinic Date']=moved;await run(db);assert.equal(db[R][0].fields['Initial Response'],'No Response');assert.equal(db[D][0].fields['Scheduling Stage'],'Proposed');
});

