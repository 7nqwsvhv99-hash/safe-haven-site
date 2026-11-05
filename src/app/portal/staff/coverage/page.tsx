import Link from "next/link";
import {redirect} from "next/navigation";
import OfferCoverageForm from "./offer-coverage-form";
import {revalidatePath} from "next/cache";
import {airtableList,airtableCreate,airtableUpdate,asText,requirePortalRole,TABLES} from "@/lib/portal";
const get=(f:FormData,k:string)=>String(f.get(k)||"").trim();
export default async function CoverageOffers({searchParams}:{searchParams:Promise<{notice?:string}>}){
 const query=await searchParams;
 const user=await requirePortalRole("Staff");
 const grants=await airtableList(TABLES.portalAccess,["Email","Shelter Position"]);
 const userPosition=asText(grants.find(x=>asText(x.fields.Email).toLowerCase()===user.email.toLowerCase())?.fields["Shelter Position"]);
 const manager=user.isAdministrator||user.roles.includes("Shelter Manager")||["Animal Welfare Manager","Executive Director"].includes(userPosition);
 const [offers,shifts,requests]=await Promise.all([
  airtableList(TABLES.coverageOffers,["Offer","Request ID","Shift Record ID","Employee Email","Response","Manager Status"]),
  airtableList(TABLES.staffSchedule,["Shift","Staff Email","Staff Name","Start","End","Status"]),
  airtableList(TABLES.scheduleRequests,["Request","Status","Shift Record ID"])
 ]);
 async function offer(f:FormData){"use server";
 const u=await requirePortalRole("Staff","write");
 if(!u.isAdministrator&&!u.roles.includes("Shelter Manager")){
  const records=await airtableList(TABLES.portalAccess,["Email","Shelter Position"]);
  const position=asText(records.find(x=>asText(x.fields.Email).toLowerCase()===u.email.toLowerCase())?.fields["Shelter Position"]);
  if(!["Animal Welfare Manager","Executive Director"].includes(position))throw Error("Management only");
 }
 const requestId=get(f,"request"),audience=get(f,"audience");
 if(!["all","specific"].includes(audience))throw Error("Choose a coverage audience");
 const reqs=await airtableList(TABLES.scheduleRequests,["Shift Record ID","Status","Request"]);
 const req=reqs.find(x=>x.id===requestId);
 if(!req||!["Pending","Seeking Coverage"].includes(asText(req.fields.Status))||!asText(req.fields["Shift Record ID"]))throw Error("Select an open request with a scheduled shift");
 const shiftId=asText(req.fields["Shift Record ID"]);
 const [schedule,templates,accessList,allOffers]=await Promise.all([
  airtableList(TABLES.staffSchedule,["Shift","Start","End","Staff Email","Status"]),
  airtableList(TABLES.recurringShifts,["Staff Email","Position","Active","Proposed"]),
  airtableList(TABLES.portalAccess,["Email","Shelter Position","Active","Display Name"]),
  airtableList(TABLES.coverageOffers,["Request ID","Employee Email","Response","Manager Status"])
 ]);
 const target=schedule.find(x=>x.id===shiftId);
 if(!target||!["Animal Care AM","Animal Care PM"].includes(asText(target.fields.Shift)))throw Error("Animal Care shift not found");
 const start=Date.parse(asText(target.fields.Start)),end=Date.parse(asText(target.fields.End));
 if(!Number.isFinite(start)||!Number.isFinite(end)||end<=start)throw Error("Invalid shift times");
 const qualified=[...new Set(templates.filter(x=>x.fields.Active===true&&x.fields.Proposed!==true&&asText(x.fields.Position).startsWith("Animal Care")).map(x=>asText(x.fields["Staff Email"]).toLowerCase()).filter(Boolean))];
 const eligible=qualified.filter(email=>
  accessList.some(x=>x.fields.Active===true&&asText(x.fields.Email).toLowerCase()===email)&&
  !schedule.some(x=>x.id!==shiftId&&asText(x.fields["Staff Email"]).toLowerCase()===email&&!["Cancelled","Declined"].includes(asText(x.fields.Status))&&Date.parse(asText(x.fields.Start))<end&&Date.parse(asText(x.fields.End))>start)
 );
 const desired=audience==="specific"?[get(f,"employee").toLowerCase()]:eligible;
 if(desired.some(x=>!eligible.includes(x)))throw Error("Selected employee is not qualified or available");
 const offered=new Set(allOffers.filter(x=>asText(x.fields["Request ID"])===requestId).map(x=>asText(x.fields["Employee Email"]).toLowerCase()));
 const pending=desired.filter(email=>!offered.has(email));
 if(!pending.length)redirect("/portal/staff/coverage?notice=no-new");
 for(const email of pending){
  const person=accessList.find(x=>asText(x.fields.Email).toLowerCase()===email);
  const record=await airtableCreate(TABLES.coverageOffers,{"Offer":"Coverage · "+asText(target.fields.Shift)+" · "+asText(target.fields.Start).slice(0,10)+" · "+email,"Request ID":requestId,"Shift Record ID":shiftId,"Employee Email":email,"Employee Name":asText(person?.fields["Display Name"]),"Response":"Pending","Manager Status":"Awaiting Response","Offered At":new Date().toISOString()},true);
  if(!record?.id)throw Error("Unable to save every coverage offer. Check existing offers before retrying.");
 }
 await airtableUpdate(TABLES.scheduleRequests,requestId,{"Status":"Seeking Coverage"},true);
 revalidatePath("/portal/staff/coverage");revalidatePath("/portal/staff/my-shift");revalidatePath("/portal/staff/scheduling");
 redirect("/portal/staff/coverage?notice=sent");
 }
 async function respond(f:FormData){"use server";const u=await requirePortalRole("Staff","write");const id=get(f,"id"),choice=get(f,"choice");if(!["Available","Unavailable"].includes(choice))throw Error("Invalid response");
 const records=await airtableList(TABLES.coverageOffers,["Employee Email","Response"]);const offer=records.find(x=>x.id===id);if(!offer||asText(offer.fields["Employee Email"]).toLowerCase()!==u.email.toLowerCase())throw Error("Not your offer");
 await airtableUpdate(TABLES.coverageOffers,id,{Response:choice,"Responded At":new Date().toISOString()},true);revalidatePath("/portal/staff/coverage");
 }
 const visible=manager?offers:offers.filter(x=>asText(x.fields["Employee Email"]).toLowerCase()===user.email.toLowerCase());
 const openRequests=requests.filter(x=>asText(x.fields["Shift Record ID"])&&["Pending","Seeking Coverage"].includes(asText(x.fields.Status)));
 const options=openRequests.map(r=>{
  const shift=shifts.find(x=>x.id===asText(r.fields["Shift Record ID"]));
  const date=asText(shift?.fields.Start);
  const start=date?new Date(date):null;
  const end=asText(shift?.fields.End)?new Date(asText(shift?.fields.End)):null;
  const label=shift&&start&&end?start.toLocaleDateString("en-US",{timeZone:"America/Chicago",weekday:"short",month:"short",day:"numeric"})+" · "+asText(shift.fields.Shift)+" · "+start.toLocaleTimeString("en-US",{timeZone:"America/Chicago",hour:"numeric",minute:"2-digit"})+"–"+end.toLocaleTimeString("en-US",{timeZone:"America/Chicago",hour:"numeric",minute:"2-digit"}):asText(r.fields.Request);
  const pending=offers.filter(o=>asText(o.fields["Request ID"])===r.id&&asText(o.fields.Response)==="Pending").length;
  return {id:r.id,label,pending};
 });
 const recipients=(await airtableList(TABLES.portalAccess,["Email","Display Name","Active","Shelter Position"])).filter(p=>p.fields.Active===true);
 const templates=await airtableList(TABLES.recurringShifts,["Staff Email","Position","Active","Proposed"]);
 const employees=[...new Set(templates.filter(t=>t.fields.Active===true&&t.fields.Proposed!==true&&asText(t.fields.Position).startsWith("Animal Care")).map(t=>asText(t.fields["Staff Email"]).toLowerCase()).filter(Boolean))].filter(email=>recipients.some(p=>asText(p.fields.Email).toLowerCase()===email)).map(email=>({email,name:asText(recipients.find(p=>asText(p.fields.Email).toLowerCase()===email)?.fields["Display Name"])||email})).sort((a,b)=>a.name.localeCompare(b.name));
 return <main className="min-h-screen bg-slate-50"><div className="container-custom max-w-4xl py-8 sm:py-10">
  <Link href="/portal/staff/scheduling" className="text-primary text-sm font-semibold">← Staff Scheduling</Link>
  <h1 className="mt-4 text-3xl font-bold">Shift Coverage Opportunities</h1>
  <p className="mt-2 text-sm text-slate-600">Employees respond to available shifts here. The Animal Welfare Manager or Executive Director approves the final assignment.</p>
  {query.notice==="sent"&&<p role="status" className="mt-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-900">Coverage offers sent to eligible employees.</p>}
  {query.notice==="no-new"&&<p role="status" className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">No new eligible recipients. Check existing offers or the active employee roster.</p>}
  {manager&&<section className="mt-5 rounded-2xl border bg-white p-5"><h2 className="font-semibold">Offer an open shift</h2><OfferCoverageForm action={offer} requests={options} employees={employees}/></section>}
  <h2 className="mt-6 text-xl font-semibold">{manager?"All coverage offers":"Offers for me"}</h2>
  <div className="mt-3 space-y-3">{visible.map(x=>{
    const shift=shifts.find(v=>v.id===asText(x.fields["Shift Record ID"]));
    const name=asText(shift?.fields.Shift)||"Shift";
    const when=asText(shift?.fields.Start);
    return <section key={x.id} className="rounded-xl border bg-white p-4"><div className="font-semibold">{name}{when?" · "+new Date(when).toLocaleDateString("en-US",{timeZone:"America/Chicago",weekday:"short",month:"short",day:"numeric"}):""}</div>
     <p className="mt-1 text-sm text-slate-600">{manager?"Offered to "+(asText(x.fields["Employee Name"])||asText(x.fields["Employee Email"]))+" · ":""}{asText(x.fields.Response)||"Pending"}</p>
     {!manager&&asText(x.fields.Response)==="Pending"&&<form action={respond} className="mt-3 flex flex-wrap gap-2"><input type="hidden" name="id" value={x.id}/><button name="choice" value="Available" className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white">I'm Available</button><button name="choice" value="Unavailable" className="rounded-full border px-4 py-2 text-sm">Not Available</button></form>}
    </section>;
  })}</div>
  {visible.length===0&&<p className="mt-4 text-sm text-slate-500">No coverage offers yet.</p>}
 </div></main>;
}
