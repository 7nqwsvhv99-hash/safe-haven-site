import ClockButton from "./clock-button";
import {staffUi} from "../staff-ui";
import Link from "next/link";
import {revalidatePath} from "next/cache";
import {airtableList,airtableCreate,airtableUpdate,asText,requirePortalRole,getStaffPortalData,TABLES} from "@/lib/portal";
export default async function MyShift(){
 const u=await requirePortalRole("Staff");
 async function clockIn(){"use server";const user=await requirePortalRole("Staff","write");const entries=await airtableList(TABLES.timeEntries,["Staff Email","Status"]);if(entries.some(x=>asText(x.fields["Staff Email"]).toLowerCase()===user.email.toLowerCase()&&asText(x.fields.Status)==="Open"))throw Error("You are already clocked in.");await airtableCreate(TABLES.timeEntries,{"Entry":user.email+" · "+new Date().toISOString(),"Staff Email":user.email,"Clock In":new Date().toISOString(),"Status":"Open"},true);revalidatePath("/portal/staff/my-shift");}
 async function clockOut(){"use server";const user=await requirePortalRole("Staff","write");const entries=await airtableList(TABLES.timeEntries,["Staff Email","Status"]);const open=entries.filter(x=>asText(x.fields["Staff Email"]).toLowerCase()===user.email.toLowerCase()&&asText(x.fields.Status)==="Open");if(open.length!==1)throw Error("No unique open time entry. Ask management to review.");await airtableUpdate(TABLES.timeEntries,open[0].id,{"Clock Out":new Date().toISOString(),"Status":"Closed"},true);revalidatePath("/portal/staff/my-shift");}
 const [entries,tasks,schedule,access,data,checklist,offers]=await Promise.all([airtableList(TABLES.timeEntries,["Staff Email","Status","Clock In","Clock Out"]),airtableList(TABLES.staffTasks,["Task","Assigned To","Assigned Role","Status","Priority","Acknowledged By","Description"]),airtableList(TABLES.staffSchedule,["Shift","Staff Email","Staff Name","Start","End","Status"]),airtableList(TABLES.portalAccess,["Email","Display Name","Shelter Position"]),getStaffPortalData(),airtableList(TABLES.shiftChecklist,["Staff Email","Shift Date","Shift","Step","Status","Completed At"]),airtableList(TABLES.coverageOffers,["Employee Email","Offer","Response","Shift Record ID"])]);
 const profile=access.find(x=>asText(x.fields.Email).toLowerCase()===u.email.toLowerCase());const displayName=asText(profile?.fields["Display Name"])||u.displayName||u.email;const position=asText(profile?.fields["Shelter Position"])||"Staff member";const today=new Intl.DateTimeFormat("en-CA",{timeZone:"America/Chicago",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());const assigned=schedule.filter(x=>asText(x.fields["Staff Email"]).toLowerCase()===u.email.toLowerCase()&&asText(x.fields.Start).slice(0,10)===today&&asText(x.fields.Status)!=="Cancelled");const shift=assigned[0];const fmt=(v:string)=>v?new Date(v).toLocaleTimeString("en-US",{timeZone:"America/Chicago",hour:"numeric",minute:"2-digit"}):"";
 const careRole=/animal care/i.test(position);const shiftType=asText(shift?.fields.Shift).toLowerCase().includes("pm")?"PM":"AM";const shiftSteps=shiftType==="AM"?["Review overnight handoffs and animal welfare concerns","Complete assigned morning feeding and fresh water","Complete cleaning and sanitation for assigned animal areas","Observe animals and document changes requiring follow-up","Prepare outstanding work for the next shift"]:["Review morning handoffs and animal welfare concerns","Complete assigned afternoon feeding and fresh water","Complete cleaning, housing and comfort checks","Document animal concerns and unfinished responsibilities","Prepare shift handoff before clock-out"];const completed=checklist.filter(x=>asText(x.fields["Staff Email"]).toLowerCase()===u.email.toLowerCase()&&asText(x.fields["Shift Date"]).slice(0,10)===today&&asText(x.fields.Shift)===shiftType&&asText(x.fields.Status)==="Completed");async function toggleStep(f:FormData){"use server";const user=await requirePortalRole("Staff","write");const step=String(f.get("step")||""),kind=String(f.get("shift")||"AM");const valid=(kind==="AM"?["Review overnight handoffs and animal welfare concerns","Complete assigned morning feeding and fresh water","Complete cleaning and sanitation for assigned animal areas","Observe animals and document changes requiring follow-up","Prepare outstanding work for the next shift"]:["Review morning handoffs and animal welfare concerns","Complete assigned afternoon feeding and fresh water","Complete cleaning, housing and comfort checks","Document animal concerns and unfinished responsibilities","Prepare shift handoff before clock-out"]);if(!valid.includes(step))throw Error("Invalid shift checklist item");const date=new Intl.DateTimeFormat("en-CA",{timeZone:"America/Chicago",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());const records=await airtableList(TABLES.shiftChecklist,["Staff Email","Shift Date","Shift","Step","Status"]);const existing=records.find(x=>asText(x.fields["Staff Email"]).toLowerCase()===user.email.toLowerCase()&&asText(x.fields["Shift Date"]).slice(0,10)===date&&asText(x.fields.Shift)===kind&&asText(x.fields.Step)===step);if(existing){await airtableUpdate(TABLES.shiftChecklist,existing.id,{"Status":asText(existing.fields.Status)==="Completed"?"Pending":"Completed","Completed At":asText(existing.fields.Status)==="Completed"?null:new Date().toISOString()},true);}else{await airtableCreate(TABLES.shiftChecklist,{"Checklist Item":date+" · "+kind+" · "+step,"Staff Email":user.email,"Shift Date":date,"Shift":kind,"Step":step,"Status":"Completed","Completed At":new Date().toISOString()},true);}revalidatePath("/portal/staff/my-shift");}
 const received=tasks.filter(x=>!["Completed","Cancelled"].includes(asText(x.fields.Status))&&asText(x.fields["Assigned To"]).toLowerCase()===u.email.toLowerCase()&&!asText(x.fields["Acknowledged By"]));const pendingOffers=offers.filter(x=>asText(x.fields["Employee Email"]).toLowerCase()===u.email.toLowerCase()&&asText(x.fields.Response)==="Pending");async function acknowledge(f:FormData){"use server";const user=await requirePortalRole("Staff","write");const id=String(f.get("id")||"");const records=await airtableList(TABLES.staffTasks,["Assigned To","Status","Acknowledged By"]);const task=records.find(x=>x.id===id);if(!task||asText(task.fields["Assigned To"]).toLowerCase()!==user.email.toLowerCase()||["Completed","Cancelled"].includes(asText(task.fields.Status)))throw Error("Handoff not available");await airtableUpdate(TABLES.staffTasks,id,{"Acknowledged By":user.email,"Acknowledged At":new Date().toISOString()},true);revalidatePath("/portal/staff/my-shift");}
 async function offerResponse(f:FormData){"use server";const user=await requirePortalRole("Staff","write");const id=String(f.get("id")||""),choice=String(f.get("choice")||"");if(!["Available","Unavailable"].includes(choice))throw Error("Invalid response");const records=await airtableList(TABLES.coverageOffers,["Employee Email","Response"]);const offer=records.find(x=>x.id===id);if(!offer||asText(offer.fields["Employee Email"]).toLowerCase()!==user.email.toLowerCase()||asText(offer.fields.Response)!=="Pending")throw Error("Invitation unavailable");await airtableUpdate(TABLES.coverageOffers,id,{"Response":choice,"Responded At":new Date().toISOString()},true);revalidatePath("/portal/staff/my-shift");}
 const mine=entries.filter(x=>asText(x.fields["Staff Email"]).toLowerCase()===u.email.toLowerCase());const open=mine.find(x=>asText(x.fields.Status)==="Open");const lastClosed=mine.filter(x=>asText(x.fields.Status)==="Closed"&&asText(x.fields["Clock Out"])).sort((a,b)=>Date.parse(asText(b.fields["Clock Out"]))-Date.parse(asText(a.fields["Clock Out"])))[0];
 const work=tasks.filter(x=>!["Completed","Cancelled"].includes(asText(x.fields.Status))&&asText(x.fields["Assigned To"]).toLowerCase()===u.email.toLowerCase());

 return <main className="min-h-screen bg-slate-50">
  <div className="container-custom max-w-6xl py-8 sm:py-12">
   <Link href="/portal/staff?all=1" className={staffUi.backLink}>← Staff Portal</Link>
   <header className="mt-6 mb-7">
    <p className={staffUi.eyebrow}>STAFF PORTAL · MY SHIFT</p>
    <h1 className={staffUi.pageTitle}>Welcome, {displayName}</h1>
    <p className="mt-2 text-slate-600">Your shift, responsibilities, and team updates.</p>
    <p className="mt-3 text-sm font-semibold text-slate-800">{position} · {shift?asText(shift.fields.Shift):"No confirmed shift assigned today"}{shift?" · "+fmt(asText(shift.fields.Start))+"–"+fmt(asText(shift.fields.End)):""}</p>
   </header>
   <nav aria-label="Staff workspace shortcuts" className="mb-7 grid grid-cols-2 gap-3 sm:flex sm:flex-wrap">
    {[{href:"/portal/staff/scheduling",label:"My Schedule"},{href:"/portal/staff/tasks",label:"Tasks & Handoffs"},{href:"/portal/staff/care",label:"Daily Animal Care"},{href:"/portal/staff/training",label:"Training Resources"}].map(item=><Link key={item.href} href={item.href} className={staffUi.shortcut}>{item.label}</Link>)}
   </nav>
   <div className="space-y-5">
    <section className={staffUi.panel} aria-labelledby="shift-time-heading">
     <div className="flex flex-wrap items-start justify-between gap-3">
      <div><p className={staffUi.eyebrow}>START YOUR SHIFT</p><h2 id="shift-time-heading" className={staffUi.sectionTitle}>My Time Today</h2></div>
      <span role="status" className={open||lastClosed?"rounded-full bg-green-100 px-3 py-2 text-sm font-semibold text-green-800":"rounded-full bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700"}>{open?"Clocked in":lastClosed?"Clock-out saved":"Not clocked in"}</span>
     </div>
     {open&&<p className="mt-2 text-sm text-slate-600">Clocked in at {new Date(asText(open.fields["Clock In"])).toLocaleString("en-US",{timeZone:"America/Chicago",dateStyle:"medium",timeStyle:"short"})}</p>}
     {!open&&lastClosed&&<p className="mt-2 text-sm text-slate-600">Last clock-out: {new Date(asText(lastClosed.fields["Clock Out"])).toLocaleString("en-US",{timeZone:"America/Chicago",dateStyle:"medium",timeStyle:"short"})}</p>}
     <form action={open?clockOut:clockIn} className="mt-4"><ClockButton clockedIn={Boolean(open)}/></form>
     <p className="mt-3 text-xs text-slate-500">Your actual start and end times are recorded by the server. Work beyond approved hours requires management authorization.</p>
    </section>
    {(received.length>0||work.length>0||pendingOffers.length>0||data.inventoryAttentionCount>0||data.highPriorityNeedsCount>0||data.fosterAlertCount>0||data.medical.pendingReviewCount>0)&&
    <section className={staffUi.panel} aria-labelledby="attention-heading">
     <p className={staffUi.eyebrow}>REVIEW PRIORITIES</p><h2 id="attention-heading" className={staffUi.sectionTitle}>Needs My Attention</h2>
     <p className="mt-1 text-sm text-slate-600">Items requiring follow-up, not your routine daily care checklist.</p>
     <div className="mt-4 grid gap-3 sm:grid-cols-2">
      {received.length>0&&<a href="#received-handoffs" className={staffUi.attentionCard}><strong>{received.length} handoff{received.length===1?"":"s"} awaiting acknowledgment</strong><span className="text-sm text-slate-600">Review received work</span></a>}
      {work.length>0&&<Link href="/portal/staff/tasks" className={staffUi.attentionCard}><strong>{work.length} assigned follow-up{work.length===1?"":"s"}</strong><span className="text-sm text-slate-600">Review additional tasks</span></Link>}
      {pendingOffers.length>0&&<a href="#shift-offers" className={staffUi.attentionCard}><strong>{pendingOffers.length} available shift invitation{pendingOffers.length===1?"":"s"}</strong><span className="text-sm text-slate-600">Respond to a coverage offer</span></a>}
      {[{count:data.highPriorityNeedsCount,title:"High-Priority Needs",href:"/portal/staff/needs"},{count:data.inventoryAttentionCount,title:"Inventory Attention",href:"/portal/staff/inventory?attention=1"},{count:data.fosterAlertCount,title:"Foster Alerts",href:"/portal/staff/fosters?attention=1"},{count:data.medical.pendingReviewCount,title:"Medical Review",href:"/portal/medical?view=review"}].filter(x=>x.count>0).map(x=><Link key={x.title} href={x.href} className={staffUi.attentionCard}><strong>{x.count} {x.title}</strong><span className="text-sm text-slate-600">Open work queue</span></Link>)}
     </div>
    </section>}
    {received.length>0&&<section id="received-handoffs" className={staffUi.panel}>
     <h2 className={staffUi.sectionTitle}>Handoffs Awaiting My Acknowledgment ({received.length})</h2>
     <p className="mt-1 text-sm text-slate-600">Acknowledging confirms receipt. It does not mark the work complete.</p>
     {received.map(t=><form key={t.id} action={acknowledge} className="mt-3 rounded-xl border bg-slate-50 p-4"><p className="font-semibold">{asText(t.fields.Task)}</p><p className="mt-1 text-sm text-slate-600">{asText(t.fields.Description)}</p><input type="hidden" name="id" value={t.id}/><button className={staffUi.secondaryButton+" mt-3"}>Acknowledge Received</button></form>)}
    </section>}
    <section className={staffUi.panel} aria-labelledby="daily-work-heading">
     <p className={staffUi.eyebrow}>COMPLETE YOUR WORK</p><h2 id="daily-work-heading" className={staffUi.sectionTitle}>Routine Shift Responsibilities</h2>
     <p className="mt-2 text-sm text-slate-600">Routine care stays separate from additional assignments and handoffs. Follow approved procedures for each care activity.</p>
     {careRole?<div className="mt-4">
      <div className="mb-3 flex items-center justify-between text-sm font-semibold"><span>Checklist progress</span><span>{completed.length} of {shiftSteps.length} completed</span></div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuenow={completed.length} aria-valuemin={0} aria-valuemax={shiftSteps.length} aria-label="Routine checklist progress"><div className="h-full rounded-full bg-primary" style={{width:(100*completed.length/shiftSteps.length)+"%"}}/></div>
      <div className="mt-4 space-y-2">{shiftSteps.map(step=><form key={step} action={toggleStep} className="flex flex-col gap-3 rounded-xl border bg-slate-50 p-3 sm:flex-row sm:items-center"><input type="hidden" name="step" value={step}/><input type="hidden" name="shift" value={shiftType}/><span className="flex-1 text-sm">{completed.some(x=>asText(x.fields.Step)===step)?"✓ ":""}{step}</span><button className={staffUi.secondaryButton}>{completed.some(x=>asText(x.fields.Step)===step)?"Undo":"Mark done"}</button></form>)}</div>
     </div>:<p className="mt-3 text-sm text-slate-600">See your role-specific responsibilities and assigned tasks.</p>}
     <div className="mt-5 flex flex-wrap gap-3"><Link href="/portal/staff/care" className={staffUi.primaryButton}>Open Daily Care</Link><Link href="/portal/staff/tasks" className={staffUi.secondaryButton}>Tasks & Handoffs ({work.length})</Link></div>
    </section>
    <section className={staffUi.panel}>
     <h2 className={staffUi.sectionTitle}>Record an Animal Concern</h2>
     <p className="mt-2 text-sm text-slate-600">Record the animal, the health or behavior observation, and any follow-up needed. For immediate concerns, contact the responsible supervisor or veterinarian directly.</p>
     <Link href="/portal/staff/care#record-care" className={staffUi.primaryButton+" mt-4"}>Record Animal Concern</Link>
    </section>
    {pendingOffers.length>0&&<section id="shift-offers" className={staffUi.panel}>
     <h2 className={staffUi.sectionTitle}>Available Shift Invitations ({pendingOffers.length})</h2><p className="mt-2 text-sm text-slate-600">Management approval is required before a schedule changes.</p>
     {pendingOffers.map(o=><form key={o.id} action={offerResponse} className="mt-3 rounded-xl border p-4"><p className="font-medium">{asText(o.fields.Offer)}</p><input type="hidden" name="id" value={o.id}/><div className="mt-3 flex flex-wrap gap-2"><button name="choice" value="Available" className={staffUi.primaryButton}>I'm Available</button><button name="choice" value="Unavailable" className={staffUi.secondaryButton}>Not Available</button></div></form>)}
    </section>}
    <section className={staffUi.panel}>
     <p className={staffUi.eyebrow}>FINISH YOUR SHIFT</p><h2 className={staffUi.sectionTitle}>End-of-Shift Review</h2>
     <p className="mt-2 text-sm text-slate-600">Check unfinished care, share what the next shift needs to know, and review open assignments. This review does not prevent clock-out.</p>
     <p className="mt-3 text-sm font-medium">Routine checklist: {careRole?shiftSteps.length-completed.length+" remaining":"See role-specific duties"} · Additional follow-ups: {work.length} open</p>
     <Link href="/portal/staff/tasks" className={staffUi.secondaryButton+" mt-4"}>Create or Review Handoff</Link>
    </section>
    {data.announcements.length>0&&<section className={staffUi.panel}>
     <h2 className={staffUi.sectionTitle}>Team Announcements</h2>
     <div className="mt-3 grid gap-3 sm:grid-cols-2">{data.announcements.slice(0,4).map(a=><div key={a.id} className="rounded-xl bg-slate-50 p-4"><p className="font-semibold">{a.title}</p><p className="mt-1 text-sm text-slate-600">{a.message}</p></div>)}</div>
    </section>}
   </div>
  </div>
 </main>;
}
