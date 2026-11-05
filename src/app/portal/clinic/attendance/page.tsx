import Link from "next/link";
import {revalidatePath} from "next/cache";
import {requirePortalRole,airtableList,airtableCreate,airtableUpdate,asText,TABLES} from "@/lib/portal";
import ClinicAttendanceDatePicker from "./clinic-attendance-date-picker";

type Row={id:string;fields:Record<string,unknown>};
const ids=(v:unknown):string[]=>Array.isArray(v)?v.filter((s):s is string=>typeof s==="string"):[];
const values=(v:unknown):string[]=>Array.isArray(v)?v.filter((s):s is string=>typeof s==="string"):[];
const dateText=(v:unknown)=>asText(v).slice(0,10);
const todayChicago=()=>new Intl.DateTimeFormat("en-CA",{timeZone:"America/Chicago",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
const fmtTime=(v:unknown)=>{const t=Date.parse(asText(v));return Number.isFinite(t)?new Date(t).toLocaleTimeString("en-US",{timeZone:"America/Chicago",hour:"numeric",minute:"2-digit"}):"";};
type HistoryEntry={action:"arrived"|"departed"|"undo-arrived"|"undo-departed";at:string;by:string;previous?:string};
function readHistory(v:unknown):HistoryEntry[]{return asText(v).split("\n").flatMap(line=>{try{const o=JSON.parse(line);return o&&["arrived","departed","undo-arrived","undo-departed"].includes(o.action)&&typeof o.at==="string"&&typeof o.by==="string"?[o as HistoryEntry]:[];}catch{return [];}});}
function addHistory(current:unknown,event:HistoryEntry){return [asText(current),JSON.stringify(event)].filter(Boolean).join("\n");}
const activeRole=(r:Row,role:string)=>Array.from(new Set([...values(r.fields["Clinic Assignments"]),asText(r.fields["Clinic Assignment"])] .filter(Boolean))).includes(role);
const activeResponse=(r:Row)=>asText(r.fields["Final Attendance Plan"])!=="Not Attending"&&asText(r.fields["Initial Response"])!=="No";
const keyFor=(clinicId:string)=>"Clinic Staffing Date: "+clinicId;
function canManage(actor:{isAdministrator:boolean;email:string},clinicId:string,responses:Row[],members:Row[]){
 if(actor.isAdministrator)return true;
 const self=members.find(m=>asText(m.fields.Email).toLowerCase()===actor.email.toLowerCase()&&Boolean(m.fields.Active));
 return Boolean(self&&responses.some(r=>ids(r.fields["Clinic Date"]).includes(clinicId)&&ids(r.fields["Team Member"]).includes(self.id)&&activeResponse(r)&&(activeRole(r,"Front Room System")||activeRole(r,"Back Room System"))));
}
async function load(){return Promise.all([
 airtableList(TABLES.clinicDates,["Clinic Date","Scheduling Stage"]),
 airtableList(TABLES.clinicResponses,["Clinic Date","Team Member","Final Attendance Plan","Initial Response","Clinic Assignment","Clinic Assignments"]),
 airtableList(TABLES.clinicMembers,["Team Member Name","Email","Role","Volunteer Record","Active"]),
 airtableList(TABLES.volunteers,["Volunteer Name","Status"]),
 airtableList(TABLES.volunteerHours,["Date","Volunteer","Volunteer Activity","Related Event / Shift","Check In At","Check Out At","Hours","Attendance Review Status","Attendance Correction History"])
 ]) as Promise<[Row[],Row[],Row[],Row[],Row[]]>;}
async function changeAttendance(form:FormData){
 "use server";
 const actor=await requirePortalRole("Clinic Team","write");
 const clinicId=String(form.get("clinic")||""),memberId=String(form.get("member")||""),mode=String(form.get("mode")||"");
 if(!["arrived","departed"].includes(mode))throw Error("Unknown attendance action");
 const [dates,responses,members,volunteers,hours]=await load();
 const day=dates.find(d=>d.id===clinicId);
 if(!day)throw Error("Clinic date not found");
 const date=dateText(day.fields["Clinic Date"]);
 if(date!==todayChicago())throw Error("Live attendance buttons are available only on the clinic date. Contact an administrator for a historical correction.");
 if(!canManage(actor,clinicId,responses,members))throw Error("Front Room System, Back Room System backup, or administrator authorization required.");
 const member=members.find(m=>m.id===memberId&&asText(m.fields.Role)==="Clinic Volunteer"&&Boolean(m.fields.Active));
 if(!member||!responses.some(r=>ids(r.fields["Clinic Date"]).includes(clinicId)&&ids(r.fields["Team Member"]).includes(memberId)&&activeResponse(r)))throw Error("Volunteer not on the active clinic roster");
 const volunteerId=ids(member.fields["Volunteer Record"])[0];
 if(!volunteerId||!volunteers.some(v=>v.id===volunteerId&&asText(v.fields.Status)==="Active"))throw Error("Volunteer record missing or inactive. Contact administrator.");
 const existing=hours.filter(h=>ids(h.fields.Volunteer).includes(volunteerId)&&asText(h.fields["Related Event / Shift"])===keyFor(clinicId));
 if(existing.length>1)throw Error("Duplicate attendance records found. Contact administrator.");
 const record=existing[0];
 const start=record?asText(record.fields["Check In At"]):"";
 const end=record?asText(record.fields["Check Out At"]):"";
 const now=new Date();
 const event={action:mode as "arrived"|"departed",at:now.toISOString(),by:actor.email};
 if(mode==="arrived"){
  if(start)throw Error("Volunteer has already arrived.");
  if(record)await airtableUpdate(TABLES.volunteerHours,record.id,{"Check In At":now.toISOString(),"Check Out At":null,Hours:0,"Attendance Review Status":"Checked In","Attendance Correction History":addHistory(record.fields["Attendance Correction History"],event)},true);
  else await airtableCreate(TABLES.volunteerHours,{Date:date,Volunteer:[volunteerId],"Volunteer Activity":"Clinic",Hours:0,"Check In At":now.toISOString(),"Attendance Review Status":"Checked In","Related Event / Shift":keyFor(clinicId),"Attendance Correction History":JSON.stringify(event),Notes:"Clinic roster entry recorded by "+(actor.displayName||actor.email)},true);
 }else{
  if(!record||!start||end)throw Error("Volunteer must be arrived and not yet departed.");
  const minutes=(now.getTime()-Date.parse(start))/60000;
  if(!Number.isFinite(minutes)||minutes<=0||minutes>18*60)throw Error("Attendance duration needs coordinator review.");
  await airtableUpdate(TABLES.volunteerHours,record.id,{"Check Out At":now.toISOString(),Hours:Math.round(minutes/60*100)/100,"Attendance Review Status":"Pending Review","Attendance Correction History":addHistory(record.fields["Attendance Correction History"],event)},true);
 }
 revalidatePath("/portal/clinic/attendance");
 revalidatePath("/portal/staff/volunteer-attendance");
 revalidatePath("/portal/staff/reports/volunteer-hours");
}
async function undoAttendance(form:FormData){
 "use server";
 const actor=await requirePortalRole("Clinic Team","write");
 const clinicId=String(form.get("clinic")||""),target=String(form.get("record")||""),expected=String(form.get("expected")||"");
 const [dates,responses,members,,hours]=await load();
 if(!dates.some(d=>d.id===clinicId&&dateText(d.fields["Clinic Date"])===todayChicago()))throw Error("Only today's attendance can be undone. Contact an administrator for older corrections.");
 if(!canManage(actor,clinicId,responses,members))throw Error("Not authorized to undo attendance.");
 const all=hours.filter(h=>asText(h.fields["Related Event / Shift"])===keyFor(clinicId));
 const actions=all.flatMap(h=>readHistory(h.fields["Attendance Correction History"]).map(e=>({...e,record:h}))).sort((a,b)=>b.at.localeCompare(a.at));
 // Only reverse the most recent unreversed action; never silently erase an earlier change.
 const undone=new Set<string>();
 const outstanding:typeof actions=[];
 for(const a of actions){if(a.action==="undo-arrived"||a.action==="undo-departed"){undone.add(a.previous||"");continue;}if(!undone.has(a.at))outstanding.push(a);}
 const latest=outstanding[0];
 if(!latest||latest.record.id!==target||latest.at!==expected)throw Error("Attendance changed since this page loaded. Refresh before undoing.");
 if(!actor.isAdministrator&&latest.by.toLowerCase()!==actor.email.toLowerCase())throw Error("Only the person who recorded this action or an administrator can undo it.");
 const h=latest.record;
 if(asText(h.fields["Attendance Review Status"])==="Verified")throw Error("Verified attendance requires a coordinator correction.");
 if(latest.action==="departed"){
  if(!asText(h.fields["Check Out At"]))throw Error("Departure already reversed.");
  await airtableUpdate(TABLES.volunteerHours,h.id,{"Check Out At":null,Hours:0,"Attendance Review Status":"Checked In","Attendance Correction History":addHistory(h.fields["Attendance Correction History"],{action:"undo-departed",at:new Date().toISOString(),by:actor.email,previous:latest.at})},true);
 }else{
  if(!asText(h.fields["Check In At"])||asText(h.fields["Check Out At"]))throw Error("Arrival cannot be reversed while a departure is recorded.");
  await airtableUpdate(TABLES.volunteerHours,h.id,{"Check In At":null,Hours:0,"Attendance Review Status":"Undone","Attendance Correction History":addHistory(h.fields["Attendance Correction History"],{action:"undo-arrived",at:new Date().toISOString(),by:actor.email,previous:latest.at})},true);
 }
 revalidatePath("/portal/clinic/attendance");
 revalidatePath("/portal/staff/volunteer-attendance");
 revalidatePath("/portal/staff/reports/volunteer-hours");
}
export default async function ClinicVolunteerAttendance({searchParams}:{searchParams:Promise<{date?:string}>}){
 const user=await requirePortalRole("Clinic Team");
 const [dates,responses,members,volunteers,hours]=await load();
 const query=await searchParams;
 const options=dates.filter(d=>dateText(d.fields["Clinic Date"])<=todayChicago()).sort((a,b)=>dateText(b.fields["Clinic Date"]).localeCompare(dateText(a.fields["Clinic Date"]))).slice(0,30);
 const selected=options.find(d=>d.id===query.date)||options[0];
 const clinicId=selected?.id||"",date=dateText(selected?.fields["Clinic Date"]);
 const isToday=date===todayChicago();
 const matches=responses.filter(r=>ids(r.fields["Clinic Date"]).includes(clinicId)&&activeResponse(r));
 const membersById=new Map(members.map(m=>[m.id,m]));
 const volunteersById=new Map(volunteers.map(v=>[v.id,v]));
 const authorized=canManage(user,clinicId,responses,members);
 const rosterMap=new Map<string,{id:string;name:string;volunteerId:string;roles:string[];record?:Row;error:string}>();
 for(const response of matches)for(const id of ids(response.fields["Team Member"])){
  const member=membersById.get(id);if(!member||asText(member.fields.Role)!=="Clinic Volunteer")continue;
  const volunteerId=ids(member.fields["Volunteer Record"])[0]||"";
  const existing=rosterMap.get(id);
  const roles=Array.from(new Set([...values(response.fields["Clinic Assignments"]),asText(response.fields["Clinic Assignment"])].filter(Boolean)));
  if(existing){existing.roles=Array.from(new Set([...existing.roles,...roles]));continue;}
  const matching=hours.filter(h=>ids(h.fields.Volunteer).includes(volunteerId)&&asText(h.fields["Related Event / Shift"])===keyFor(clinicId));
  const valid=volunteerId&&asText(volunteersById.get(volunteerId)?.fields.Status)==="Active";
  rosterMap.set(id,{id,name:asText(member.fields["Team Member Name"]),volunteerId,roles,record:matching[0],error:!valid?"Volunteer record needs reconciliation.":matching.length>1?"Duplicate attendance records need reconciliation.":""});
 }
 const roster=Array.from(rosterMap.values()).sort((a,b)=>a.name.localeCompare(b.name));
 const state=(p:typeof roster[number])=>asText(p.record?.fields["Check Out At"])?"departed":asText(p.record?.fields["Check In At"])?"arrived":"awaiting";
 const arrived=roster.filter(p=>state(p)!=="awaiting").length;
 const departed=roster.filter(p=>state(p)==="departed").length;
 const all=hours.filter(h=>asText(h.fields["Related Event / Shift"])===keyFor(clinicId));
 const actions=all.flatMap(h=>readHistory(h.fields["Attendance Correction History"]).map(e=>({...e,record:h}))).sort((a,b)=>b.at.localeCompare(a.at));
 const undone=new Set<string>();let lastAction:typeof actions[number]|undefined;
 for(const a of actions){if(a.action==="undo-arrived"||a.action==="undo-departed"){undone.add(a.previous||"");continue;}if(!undone.has(a.at)){lastAction=a;break;}}
 const dateLabel=date?new Date(date+"T12:00:00Z").toLocaleDateString("en-US",{timeZone:"America/Chicago",weekday:"long",month:"long",day:"numeric",year:"numeric"}):"No clinic date";
 function renderSection(title:string,kind:"awaiting"|"arrived"|"departed"){
  const group=roster.filter(p=>state(p)===kind);
  return <section className="mt-5"><div className="mb-2 flex items-center justify-between"><h2 className="text-base font-bold text-slate-900">{title}</h2><span className="text-xs text-slate-500">{group.length}</span></div>
   <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
    {group.map(p=><div key={p.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-slate-100 px-3 py-2 last:border-0 sm:flex-nowrap">
     <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1">
      <span className="shrink-0 text-sm font-semibold text-slate-900">{p.name}</span>
      <div className="flex min-w-0 flex-wrap gap-1">{(p.roles.length?p.roles:["Clinic volunteer"]).map(role=><span key={role} className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">{role}</span>)}</div>
      {kind!=="awaiting"&&<span className="text-xs text-slate-500">{kind==="arrived"?"Arrived "+fmtTime(p.record?.fields["Check In At"]):"Arrived "+fmtTime(p.record?.fields["Check In At"])+" · Departed "+fmtTime(p.record?.fields["Check Out At"])}</span>}
     </div>
     {p.error?<p className="w-full text-xs font-medium text-amber-800">{p.error} <a className="underline underline-offset-2" href="mailto:hello@brookebernard.com">Contact administrator</a>.</p>:kind==="departed"?<span className="flex shrink-0 items-center gap-1 text-xs font-medium text-green-700">✓ Recorded</span>:authorized&&isToday?<form action={changeAttendance} className="shrink-0"><input type="hidden" name="clinic" value={clinicId}/><input type="hidden" name="member" value={p.id}/><button type="submit" name="mode" value={kind==="awaiting"?"arrived":"departed"} className="min-h-9 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500">{kind==="awaiting"?"Arrived":"Departed"}</button></form>:<span className="shrink-0 text-xs text-slate-400">{isToday?"Read only":"Historical"}</span>}
    </div>)}
    {!group.length&&<p className="px-3 py-3 text-sm text-slate-500">No volunteers in this section</p>}
   </div>
  </section>;
 }
 return <main className="min-h-screen bg-slate-50"><div className="container-custom max-w-5xl py-8">
  <Link className="text-primary" href="/portal/clinic?section=staffing">← Clinic Staffing Calendar</Link>
  <h1 className="mt-4 text-2xl font-bold text-slate-900">Clinic Volunteer Attendance</h1>
  <p className="mt-1 text-sm text-slate-600">Record volunteer arrival and departure. Each volunteer's hours are counted once and verified by a coordinator.</p>
  <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
   <ClinicAttendanceDatePicker dates={options.map(d=>({id:d.id,label:dateText(d.fields["Clinic Date"])}))} selected={clinicId}/>
   <span className="text-sm text-slate-500">{dateLabel}</span>
  </div>
  <div className="mt-4 grid grid-cols-3 gap-2">
   {[["Total Volunteers",roster.length],["Volunteers Arrived",arrived],["Volunteers Departed",departed]].map(([label,count])=><div key={label} className="rounded-lg bg-white px-3 py-3 ring-1 ring-slate-200"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 text-xl font-bold tabular-nums text-slate-900">{count}</p></div>)}
  </div>
  {!isToday&&<p className="mt-4 text-sm text-slate-600">Historical clinic attendance is read-only. Contact an administrator for missing times or corrections.</p>}
  {!authorized&&<p className="mt-4 text-sm text-slate-600">Only the assigned Front Room System volunteer, Back Room System backup, or an administrator can record attendance.</p>}
  {renderSection("Awaiting Arrival","awaiting")}
  {renderSection("Arrived","arrived")}
  {renderSection("Departed","departed")}
  <div className="mt-4 flex items-center justify-between gap-3">
   <p className="text-xs text-slate-500">Veterinarian and veterinary technician hours are not included.</p>
   {authorized&&isToday&&lastAction&&<form action={undoAttendance} className="shrink-0"><input type="hidden" name="clinic" value={clinicId}/><input type="hidden" name="record" value={lastAction.record.id}/><input type="hidden" name="expected" value={lastAction.at}/><button className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-100">↶ Undo last action</button></form>}
  </div>
 </div></main>;
}
