import Link from "next/link";
import {revalidatePath} from "next/cache";
import {airtableList,airtableCreate,airtableUpdate,asText,requirePortalRole,TABLES} from "@/lib/portal";
const get=(f:FormData,k:string)=>String(f.get(k)||"").trim();
export default async function CoverageOffers(){
 const user=await requirePortalRole("Staff");
 const manager=user.isAdministrator||user.roles.includes("Shelter Manager");
 const [offers,shifts,requests]=await Promise.all([
  airtableList(TABLES.coverageOffers,["Offer","Request ID","Shift Record ID","Employee Email","Response","Manager Status"]),
  airtableList(TABLES.staffSchedule,["Shift","Staff Email","Staff Name","Start","End","Status"]),
  airtableList(TABLES.scheduleRequests,["Request","Status","Shift Record ID"])
 ]);
 async function offer(f:FormData){"use server";const u=await requirePortalRole("Staff","write");if(!u.isAdministrator&&!u.roles.includes("Shelter Manager"))throw Error("Management only");
 const requestId=get(f,"request"),email=get(f,"email").toLowerCase();const req=(await airtableList(TABLES.scheduleRequests,["Shift Record ID","Status"])).find(x=>x.id===requestId);
 if(!req||!email||!req.fields["Shift Record ID"])throw Error("Choose an existing request with a scheduled shift and employee");
 const shiftId=asText(req.fields["Shift Record ID"]);
 const matches=await airtableList(TABLES.staffSchedule,["Start","End","Staff Email","Status"]);const target=matches.find(x=>x.id===shiftId);if(!target)throw Error("Shift not found");
 const roster=await airtableList(TABLES.recurringShifts,["Staff Email","Position","Active"]);if(!roster.some(x=>asText(x.fields["Staff Email"]).toLowerCase()===email&&x.fields.Active===true&&asText(x.fields.Position).startsWith("Animal Care")))throw Error("Employee must have an active animal-care template");
 const start=Date.parse(asText(target.fields.Start)),end=Date.parse(asText(target.fields.End));if(!Number.isFinite(start)||!Number.isFinite(end))throw Error("Invalid shift");
 if(matches.some(x=>x.id!==shiftId&&asText(x.fields["Staff Email"]).toLowerCase()===email&&!["Cancelled","Declined"].includes(asText(x.fields.Status))&&Date.parse(asText(x.fields.Start))<end&&Date.parse(asText(x.fields.End))>start))throw Error("Employee has a conflicting shift");
 const existing=await airtableList(TABLES.coverageOffers,["Request ID","Employee Email"]);if(existing.some(x=>asText(x.fields["Request ID"])===requestId&&asText(x.fields["Employee Email"]).toLowerCase()===email))throw Error("Offer already exists");
 await airtableCreate(TABLES.coverageOffers,{"Offer":`Coverage · ${requestId} · ${email}`,"Request ID":requestId,"Shift Record ID":shiftId,"Employee Email":email,Response:"Pending","Manager Status":"Awaiting Response","Offered At":new Date().toISOString()},true);
 await airtableUpdate(TABLES.scheduleRequests,requestId,{"Status":"Seeking Coverage"},true);revalidatePath("/portal/staff/coverage");
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
