import Link from "next/link";
import {revalidatePath} from "next/cache";
import {requirePortalRole,airtableList,airtableCreate,asText,TABLES} from "@/lib/portal";
const ids=(v:unknown):string[]=>Array.isArray(v)?v.filter((s):s is string=>typeof s==="string"):[];
const dateText=(v:unknown)=>asText(v).slice(0,10);
function chicagoDate(){return new Intl.DateTimeFormat("en-CA",{timeZone:"America/Chicago",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());}
function clinicInstant(date:string,time:string){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!/^\d{2}:\d{2}$/.test(time))throw Error("Invalid date or time.");
 const midday=new Date(date+"T18:00:00Z");
 const offset=new Intl.DateTimeFormat("en-US",{timeZone:"America/Chicago",timeZoneName:"shortOffset"}).formatToParts(midday).find(p=>p.type==="timeZoneName")?.value||"GMT-6";
 const hours=Number(offset.match(/GMT([+-]\d+)/)?.[1]||"-6");
 const timestamp=Date.parse(date+"T"+time+":00Z")-hours*3600000;
 const instant=new Date(timestamp);
 if(!Number.isFinite(timestamp)||new Intl.DateTimeFormat("en-CA",{timeZone:"America/Chicago",year:"numeric",month:"2-digit",day:"2-digit"}).format(instant)!==date)throw Error("Invalid clinic time.");
 return instant;
}
export default async function ClinicVolunteerAttendance({searchParams}:{searchParams:Promise<{date?:string}>}){
 const user=await requirePortalRole("Clinic Team");
 const [dates,responses,members,volunteers,hours]=await Promise.all([
 airtableList(TABLES.clinicDates,["Clinic Date","Scheduling Stage"]),
 airtableList(TABLES.clinicResponses,["Clinic Date","Team Member","Team Member Role","Final Attendance Plan","Initial Response","Clinic Assignment","Clinic Assignments","Confirmed Volunteer Score"]),
 airtableList(TABLES.clinicMembers,["Team Member Name","Email","Role","Volunteer Record","Active"]),
 airtableList(TABLES.volunteers,["Volunteer Name","Status"]),
 airtableList(TABLES.volunteerHours,["Date","Volunteer","Volunteer Activity","Related Event / Shift","Check In At","Check Out At","Hours","Attendance Review Status"])
 ]);
 const q=await searchParams;const selected=dates.find(d=>d.id===q.date)||dates.filter(d=>dateText(d.fields["Clinic Date"])<=chicagoDate()).sort((a,b)=>dateText(b.fields["Clinic Date"]).localeCompare(dateText(a.fields["Clinic Date"])))[0];
 const clinicDate=dateText(selected?.fields["Clinic Date"]);const matching=responses.filter(r=>ids(r.fields["Clinic Date"]).includes(selected?.id||""));
 const memberById=new Map(members.map(m=>[m.id,m]));const volunteersById=new Map(volunteers.map(v=>[v.id,v]));
 const currentMember=members.find(m=>asText(m.fields.Email).toLowerCase()===user.email.toLowerCase()&&Boolean(m.fields.Active));
 const assignedFrontRoom=matching.some(r=>ids(r.fields["Team Member"]).includes(currentMember?.id||"")&&[...ids(r.fields["Clinic Assignments"]),asText(r.fields["Clinic Assignment"])].includes("Front Room System"));
 const authorized=user.isAdministrator||assignedFrontRoom;
 const roster=matching.flatMap(r=>ids(r.fields["Team Member"]).map(id=>({response:r,member:memberById.get(id)})))
 .filter(x=>x.member&&asText(x.member.fields.Role)==="Clinic Volunteer"&&asText(x.response.fields["Final Attendance Plan"])!=="Not Attending"&&asText(x.response.fields["Initial Response"])!=="No");
 const recordKey="Clinic Staffing Date: "+(selected?.id||"");
 const existingFor=(volunteerId:string)=>hours.find(h=>ids(h.fields.Volunteer).includes(volunteerId)&&asText(h.fields["Related Event / Shift"])===recordKey);
 async function record(form:FormData){
 "use server";
 const actor=await requirePortalRole("Clinic Team","write");
 const clinicId=String(form.get("clinic")||"");const memberId=String(form.get("member")||"");
 const [cd,rs,ms,vs,hs]=await Promise.all([airtableList(TABLES.clinicDates,["Clinic Date"]),airtableList(TABLES.clinicResponses,["Clinic Date","Team Member","Clinic Assignment","Clinic Assignments","Final Attendance Plan","Initial Response"]),airtableList(TABLES.clinicMembers,["Email","Role","Volunteer Record","Active"]),airtableList(TABLES.volunteers,["Status"]),airtableList(TABLES.volunteerHours,["Volunteer","Related Event / Shift"])]);
 const day=cd.find(x=>x.id===clinicId);if(!day)throw Error("Clinic date not found");const date=dateText(day.fields["Clinic Date"]);if(date>chicagoDate())throw Error("Future attendance cannot be recorded");
 const self=ms.find(m=>asText(m.fields.Email).toLowerCase()===actor.email.toLowerCase()&&Boolean(m.fields.Active));
 const canRecord=actor.isAdministrator||rs.some(r=>ids(r.fields["Clinic Date"]).includes(clinicId)&&ids(r.fields["Team Member"]).includes(self?.id||"")&&[...ids(r.fields["Clinic Assignments"]),asText(r.fields["Clinic Assignment"])].includes("Front Room System"));
 if(!canRecord)throw Error("Front Room System assignment or administrator authorization required.");
 const member=ms.find(m=>m.id===memberId&&asText(m.fields.Role)==="Clinic Volunteer"&&Boolean(m.fields.Active));
 const scheduled=rs.some(r=>ids(r.fields["Clinic Date"]).includes(clinicId)&&ids(r.fields["Team Member"]).includes(memberId)&&asText(r.fields["Final Attendance Plan"])!=="Not Attending"&&asText(r.fields["Initial Response"])!=="No");
 if(!member||!scheduled)throw Error("Volunteer is not on the active clinic roster");
 const volunteerId=ids(member.fields["Volunteer Record"])[0];
 if(!volunteerId||!vs.some(v=>v.id===volunteerId&&asText(v.fields.Status)==="Active"))throw Error("Link an active Volunteer record to this Clinic Team Member before recording hours.");
 const key="Clinic Staffing Date: "+clinicId;
 if(hs.some(h=>ids(h.fields.Volunteer).includes(volunteerId)&&asText(h.fields["Related Event / Shift"])===key))throw Error("Hours for this volunteer and clinic have already been recorded; request a correction instead.");
 const start=clinicInstant(date,String(form.get("start")||""));const end=clinicInstant(date,String(form.get("end")||""));
 const minutes=(end.getTime()-start.getTime())/60000;if(minutes<=0||minutes>18*60)throw Error("Check departure time. Use coordinator correction for overnight or unusually long attendance.");
 await airtableCreate(TABLES.volunteerHours,{Date:date,Volunteer:[volunteerId],"Volunteer Activity":"Clinic",Hours:Math.round(minutes/60*100)/100,"Check In At":start.toISOString(),"Check Out At":end.toISOString(),"Attendance Review Status":"Pending Review","Related Event / Shift":key,Notes:"Clinic roster entry recorded by "+(actor.displayName||actor.email)},true);
 revalidatePath("/portal/clinic/attendance");
 revalidatePath("/portal/staff/reports/volunteer-hours");
 }
 return <main className="min-h-screen bg-slate-50"><div className="container-custom max-w-5xl py-10"><Link className="text-primary" href="/portal/clinic?section=staffing">← Clinic Staffing Calendar</Link><h1 className="mt-5 text-3xl font-bold">Clinic Volunteer Attendance</h1><p className="mt-2 text-slate-600">The Front Room System volunteer records actual hours for the clinic roster. Hours flow into Volunteer Hours once and await coordinator verification.</p>
 <form className="mt-5 flex items-center gap-3"><label className="text-sm font-semibold">Clinic date <select name="date" defaultValue={selected?.id} className="ml-2 rounded-lg border p-3">{dates.filter(d=>dateText(d.fields["Clinic Date"])<=chicagoDate()).sort((a,b)=>dateText(b.fields["Clinic Date"]).localeCompare(dateText(a.fields["Clinic Date"]))).slice(0,30).map(d=><option key={d.id} value={d.id}>{dateText(d.fields["Clinic Date"])}</option>)}</select></label><button className="rounded-full bg-primary px-5 py-3 font-semibold text-white">Show Roster</button></form>
 {!authorized?<section className="mt-5 rounded-xl border bg-white p-5">Attendance entry is restricted to the volunteer assigned to Front Room System for this clinic or an administrator. Ask the clinic lead for help if coverage changes.</section>:<section className="mt-5 space-y-3">{roster.map(({member,response})=>{const linked=ids(member!.fields["Volunteer Record"])[0];const saved=linked?existingFor(linked):undefined;return <div key={member!.id} className="rounded-xl border bg-white p-5"><h2 className="font-bold">{asText(member!.fields["Team Member Name"])}</h2><p className="mt-1 text-sm text-slate-600">{[...ids(response.fields["Clinic Assignments"]),asText(response.fields["Clinic Assignment"])].filter(Boolean).join(", ")||"Clinic volunteer"}</p>{!linked?<p className="mt-2 text-sm font-semibold text-amber-800">Volunteer record link missing. Coordinator must reconcile this member before hours can be recorded.</p>:saved?<p className="mt-2 text-sm font-semibold text-green-800">Recorded · {String(saved.fields.Hours||0)} hours · {asText(saved.fields["Attendance Review Status"])||"Unreviewed"}</p>:<form action={record} className="mt-3 flex flex-wrap items-end gap-3"><input type="hidden" name="clinic" value={selected?.id||""}/><input type="hidden" name="member" value={member!.id}/><label className="text-sm">Arrival<input name="start" type="time" required className="mt-1 block rounded-lg border p-2"/></label><label className="text-sm">Departure<input name="end" type="time" required className="mt-1 block rounded-lg border p-2"/></label><button className="rounded-full bg-primary px-4 py-2 font-semibold text-white">Record Hours</button></form>}</div>})}{!roster.length&&<p>No scheduled clinic volunteers found for this date.</p>}</section>}
 <p className="mt-5 text-sm text-slate-600">Do not record veterinarian or veterinary technician hours here. A designated backup role and correction process remain to be developed before replacing paper attendance.</p></div></main>;
}