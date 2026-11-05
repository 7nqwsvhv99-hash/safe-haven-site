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
 return <main className="min-h-screen bg-slate-50"><div className="container-custom py-8 sm:py-12"><Link href="/portal/staff/scheduling" className="text-primary text-sm font-semibold">← Staff Scheduling</Link><h1 className="mt-4 text-3xl font-bold">Shift Coverage Opportunities</h1><p className="mt-2 text-sm text-slate-600">Employees can volunteer for offered shifts. Management must approve a replacement in Schedule Requests before the schedule changes.</p>
 {manager&&<section className="mt-6 rounded-2xl border bg-white p-5"><h2 className="font-semibold">Offer an open shift</h2><form action={offer} className="mt-3 grid gap-3 sm:grid-cols-2"><label className="text-sm">Coverage request<select name="request" required className="mt-1 w-full rounded-xl border p-3"><option value="">Choose request</option>{requests.filter(x=>asText(x.fields["Shift Record ID"])&&["Pending","Seeking Coverage"].includes(asText(x.fields.Status))).map(x=><option key={x.id} value={x.id}>{asText(x.fields.Request)}</option>)}</select></label><label className="text-sm">Qualified employee email<input required type="email" name="email" className="mt-1 w-full rounded-xl border p-3" placeholder="Authorized employee"/></label><button className="rounded-full bg-primary px-5 py-3 font-semibold text-white sm:col-span-2">Offer shift</button></form></section>}
 <h2 className="mt-8 text-xl font-semibold">{manager?"All coverage offers":"Offers for me"}</h2><div className="mt-3 space-y-3">{visible.map(x=><section key={x.id} className="rounded-2xl border bg-white p-4"><div className="font-semibold">{asText(x.fields.Offer)}</div><p className="text-sm text-slate-600">Offered to {asText(x.fields["Employee Email"])} · Response: {asText(x.fields.Response)}</p>{!manager&&asText(x.fields.Response)==="Pending"&&<form action={respond} className="mt-3 flex gap-2"><input type="hidden" name="id" value={x.id}/><button name="choice" value="Available" className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white">I'm available</button><button name="choice" value="Unavailable" className="rounded-full border px-4 py-2 text-sm">Not available</button></form>}</section>)}</div>{visible.length===0&&<p className="mt-4 text-sm text-slate-500">No coverage offers.</p>}</div></main>;
}
