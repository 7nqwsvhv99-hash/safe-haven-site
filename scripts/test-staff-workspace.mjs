import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';
const policy=ts.transpileModule(await fs.readFile('src/lib/staff-policy.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText;
const p=await import('data:text/javascript;base64,'+Buffer.from(policy).toString('base64'));
test('staff management excludes volunteer coordinator and ordinary staff',()=>{
 for(const r of ['Administrator','Shelter Manager'])assert.equal(p.managesStaff([r]),true);
 for(const r of ['Staff','Volunteer Coordinator','Medical','Clinic Team','Volunteer'])assert.equal(p.managesStaff([r]),false);
 assert.equal(p.isStaff(['Staff']),true);assert.equal(p.isStaff(['Volunteer Coordinator']),false);
});
test('Central Time conversion handles seasons and rejects ambiguous/skipped times',()=>{
 assert.equal(p.chicagoISO('2026-09-24T09:00'),'2026-09-24T14:00:00.000Z');
 assert.equal(p.chicagoISO('2026-12-24T09:00'),'2026-12-24T15:00:00.000Z');
 assert.throws(()=>p.chicagoISO('2026-03-08T02:30'));assert.throws(()=>p.chicagoISO('2026-11-01T01:30'));
});
test('overlapping shifts rejected but adjoining shifts allowed',()=>{
 assert.equal(p.overlaps('2026-09-24T09:00Z','2026-09-24T12:00Z','2026-09-24T11:00Z','2026-09-24T13:00Z'),true);
 assert.equal(p.overlaps('2026-09-24T09:00Z','2026-09-24T12:00Z','2026-09-24T12:00Z','2026-09-24T13:00Z'),false);
 assert.throws(()=>p.safeResource('javascript:alert(1)'));
});
const code=ts.transpileModule(await fs.readFile('src/app/portal/staff/workspace-actions.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
function harness(data) {
 const writes=[];const exports={};const redirect=url=>{throw new Error('REDIRECT:'+url)};
 const workspace={STAFF:{tasks:'tasks',shifts:'shifts'},FIELDS:{},staffData:async()=>data,staffContext:async(manager)=>{if(manager&&!data.context.manager)throw new Error('Forbidden');return data.context}};
 const portal={asText:v=>typeof v==='string'?v:'',airtableCreate:async(t,f)=>writes.push({t,f}),airtableUpdate:async(t,id,f)=>writes.push({t,id,f})};
 const modules={'next/navigation':{redirect},'next/cache':{revalidatePath(){}},'@/lib/portal':portal,'@/lib/staff-workspace':workspace,'@/lib/staff-policy':p};
 vm.runInNewContext(code,{exports,require:n=>modules[n],Date,URL,console});
 return {actions:exports,writes};
}
const form=obj=>{const f=new FormData();Object.entries(obj).forEach(([k,v])=>f.set(k,v));return f};
const base=()=>({context:{manager:true,email:'manager@example.org'},ownEmail:'manager@example.org',roster:[{id:'person',email:'staff@example.org',name:'Staff'}],rows:[],materials:[]});
test('staff cannot call manager mutations',async()=>{
 const d=base();d.context.manager=false;const h=harness(d);
 for(const fn of ['saveShift','assignTraining','saveMaterial'])await assert.rejects(h.actions[fn](form({})),/Forbidden/);
 assert.equal(h.writes.length,0);
});
test('staff cannot confirm another person’s shift or a stale schedule',async()=>{
 const d=base();d.rows=[{id:'shift',fields:{'Staff Email':'staff@example.org',Status:'Scheduled',Start:'new',End:'new'}}];const h=harness(d);
 await assert.rejects(h.actions.respondShift(form({id:'shift',response:'Confirmed'})),/error=/);assert.equal(h.writes.length,0);
 d.ownEmail='staff@example.org';await assert.rejects(h.actions.respondShift(form({id:'shift',snapshot:'old',response:'Confirmed'})),/error=/);assert.equal(h.writes.length,0);
});
test('rescheduling resets old confirmation and notes',async()=>{
 const d=base();d.rows=[{id:'shift',fields:{'Staff Email':'staff@example.org',Start:'2026-09-24T14:00:00.000Z',End:'2026-09-24T18:00:00.000Z',Status:'Scheduled',Response:'Confirmed'}}];const h=harness(d);
 await assert.rejects(h.actions.saveShift(form({id:'shift',person:'person',title:'Care',start:'2026-09-25T09:00',end:'2026-09-25T13:00',status:'Scheduled'})),/saved=1/);
 assert.equal(h.writes[0].f.Response,'Pending');assert.equal(h.writes[0].f['Staff Notes'],'');
});
test('manager cannot verify unfinished training; staff cannot complete others’ tasks',async()=>{
 const d=base();d.rows=[{id:'task',fields:{Status:'Assigned','Staff Email':'staff@example.org'}}];const h=harness(d);
 await assert.rejects(h.actions.updateTraining(form({id:'task',mode:'review',status:'Verified'})),/error=/);
 await assert.rejects(h.actions.updateTraining(form({id:'task'})),/error=/);assert.equal(h.writes.length,0);
});
