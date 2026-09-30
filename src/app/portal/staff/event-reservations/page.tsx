import Link from "next/link";
import { revalidatePath } from "next/cache";
import { ArrowLeft, CalendarTicket, CreditCard, PackagePlus } from "lucide-react";
import { airtableCreate, airtableList, airtableUpdate, asNumber, asStrings, asText, requirePortalRole, TABLES } from "@/lib/portal";

function field(formData:FormData,name:string){return String(formData.get(name)||"").trim();}
function fmtMoney(value:unknown){return new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(typeof value==="number"?value:0);}
function fmtDate(value:unknown){const text=asText(value);if(!text)return "";const d=new Date(text);return Number.isNaN(d.getTime())?text:new Intl.DateTimeFormat("en-US",{month:"short",day:"numeric",year:"numeric"}).format(d);}

export default async function EventReservationsPage(){
 await requirePortalRole("Staff");
 const [events,options,reservations]=await Promise.all([
  airtableList(TABLES.events,["Event Name","Event Status","Start Date & Time"],{sort:[{field:"Start Date & Time",direction:"asc"}]}),
  airtableList(TABLES.eventTicketOptions,["Option Name","Event","Option Type","Description","Price","Capacity Units","People Per Unit","Active","Display Order","Sales Start","Sales End"],{sort:[{field:"Display Order",direction:"asc"}]}),
  airtableList(TABLES.eventReservations,["Reservation Name","Event","Ticket / Package Option","Quantity","Purchaser First Name","Purchaser Last Name","Purchaser Email","Purchaser Phone","Guest Names","Special Requests","Amount Due","Amount Paid","Payment Status","Payment Method","Payment Reference","Reservation Status","Confirmation Number","Submitted At","Confirmed At","Internal Notes"],{sort:[{field:"Submitted At",direction:"desc"}]})
 ]);
 const eventById=new Map(events.map(record=>[record.id,record]));
 const optionById=new Map(options.map(record=>[record.id,record]));

 async function createOption(formData:FormData){
  "use server";
  await requirePortalRole("Staff","write");
  const eventId=field(formData,"eventId"),name=field(formData,"name"),type=field(formData,"type");
  const price=Number(field(formData,"price"));
  if(!eventId||!name||!type||!Number.isFinite(price)||price<0)return;
  await airtableCreate(TABLES.eventTicketOptions,{
   "Option Name":name,Event:[eventId],"Option Type":type,Description:field(formData,"description"),Price:price,
   "Capacity Units":Number(field(formData,"capacity"))||0,"People Per Unit":Number(field(formData,"peoplePerUnit"))||1,
   Active:formData.get("active")==="on","Display Order":Number(field(formData,"displayOrder"))||0,
   "Sales Start":field(formData,"salesStart")||null,"Sales End":field(formData,"salesEnd")||null
  },true);
  revalidatePath("/portal/staff/event-reservations");revalidatePath("/events");revalidatePath("/");
 }

 async function saveOption(formData:FormData){
  "use server";
  await requirePortalRole("Staff","write");
  const id=field(formData,"id");if(!id)return;
  await airtableUpdate(TABLES.eventTicketOptions,id,{
   "Option Name":field(formData,"name"),"Option Type":field(formData,"type"),Description:field(formData,"description"),
   Price:Number(field(formData,"price"))||0,"Capacity Units":Number(field(formData,"capacity"))||0,
   "People Per Unit":Number(field(formData,"peoplePerUnit"))||1,Active:formData.get("active")==="on",
   "Display Order":Number(field(formData,"displayOrder"))||0,"Sales Start":field(formData,"salesStart")||null,"Sales End":field(formData,"salesEnd")||null
  },true);
  revalidatePath("/portal/staff/event-reservations");revalidatePath("/events");revalidatePath("/");
 }

 async function saveReservation(formData:FormData){
  "use server";
  await requirePortalRole("Staff","write");
  const id=field(formData,"id");if(!id)return;
  const paymentStatus=field(formData,"paymentStatus"),reservationStatus=field(formData,"reservationStatus");
  const amountPaid=Number(field(formData,"amountPaid"))||0;
  const fields:Record<string,unknown>={
   "Payment Status":paymentStatus,"Reservation Status":reservationStatus,"Amount Paid":amountPaid,
   "Payment Reference":field(formData,"paymentReference"),"Internal Notes":field(formData,"internalNotes")
  };
  if(reservationStatus==="Confirmed")fields["Confirmed At"]=new Date().toISOString();
  await airtableUpdate(TABLES.eventReservations,id,fields,true);
  revalidatePath("/portal/staff/event-reservations");
 }

 return <main className="min-h-screen bg-slate-50"><div className="container-custom py-10 md:py-12">
  <Link href="/portal/staff" className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"><ArrowLeft className="h-4 w-4"/> Staff Portal</Link>
  <header className="mb-8"><p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-primary">Events</p><h1 className="text-4xl font-bold tracking-tight md:text-5xl">Paid Event Reservations</h1><p className="mt-4 max-w-3xl text-muted-foreground">Configure tickets, tables, foursomes, sponsorships, and other paid packages. Review reservations and confirm payment from one workspace.</p></header>

  <section className="mb-8 rounded-3xl border bg-white p-6 shadow-sm">
   <div className="mb-5 flex items-center gap-3"><PackagePlus className="h-6 w-6 text-primary"/><h2 className="text-2xl font-bold">Add Ticket or Package</h2></div>
   <form action={createOption} className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
    <label className="text-sm font-medium">Event<select name="eventId" required defaultValue="" className="mt-1 w-full rounded-xl border bg-white px-3 py-2.5"><option value="" disabled>Select event</option>{events.map(event=><option key={event.id} value={event.id}>{asText(event.fields["Event Name"])}</option>)}</select></label>
    <label className="text-sm font-medium">Option name<input name="name" required placeholder="Foursome, Table of 8, Individual Ticket" className="mt-1 w-full rounded-xl border px-3 py-2.5"/></label>
    <label className="text-sm font-medium">Option type<select name="type" defaultValue="Individual Ticket" className="mt-1 w-full rounded-xl border bg-white px-3 py-2.5">{["Individual Ticket","Couple","Table","Golfer","Foursome","Sponsorship","Dinner Only","Other"].map(v=><option key={v}>{v}</option>)}</select></label>
    <label className="text-sm font-medium">Price<input name="price" type="number" min="0" step="0.01" required className="mt-1 w-full rounded-xl border px-3 py-2.5"/></label>
    <label className="text-sm font-medium">Capacity units<input name="capacity" type="number" min="0" step="1" defaultValue="0" className="mt-1 w-full rounded-xl border px-3 py-2.5"/><span className="mt-1 block text-xs text-muted-foreground">0 means no system limit.</span></label>
    <label className="text-sm font-medium">People per unit<input name="peoplePerUnit" type="number" min="1" step="1" defaultValue="1" className="mt-1 w-full rounded-xl border px-3 py-2.5"/></label>
    <label className="text-sm font-medium">Sales start<input name="salesStart" type="date" className="mt-1 w-full rounded-xl border px-3 py-2.5"/></label>
    <label className="text-sm font-medium">Sales end<input name="salesEnd" type="date" className="mt-1 w-full rounded-xl border px-3 py-2.5"/></label>
    <label className="text-sm font-medium md:col-span-2">Description<textarea name="description" rows={3} className="mt-1 w-full rounded-xl border px-3 py-2.5"/></label>
    <label className="text-sm font-medium">Display order<input name="displayOrder" type="number" step="1" defaultValue="0" className="mt-1 w-full rounded-xl border px-3 py-2.5"/></label>
    <label className="flex items-center gap-2 self-end rounded-xl bg-slate-50 px-4 py-3 text-sm font-medium"><input name="active" type="checkbox" defaultChecked/> Active for sale</label>
    <button className="rounded-full bg-primary px-5 py-3 font-semibold text-white md:col-span-2 xl:col-span-4">Add Ticket / Package</button>
   </form>
  </section>

  <section className="mb-8 rounded-3xl border bg-white p-6 shadow-sm">
   <div className="mb-5 flex items-center gap-3"><CalendarTicket className="h-6 w-6 text-primary"/><h2 className="text-2xl font-bold">Ticket & Package Options</h2></div>
   <div className="space-y-4">{options.length?options.map(option=>{
    const event=eventById.get(asStrings(option.fields.Event)[0]);
    return <details key={option.id} className="rounded-2xl border p-4"><summary className="cursor-pointer list-none"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-semibold">{asText(option.fields["Option Name"])}</p><p className="mt-1 text-sm text-muted-foreground">{asText(event?.fields["Event Name"])} · {fmtMoney(option.fields.Price)} · {option.fields.Active?"Active":"Inactive"}</p></div><span className="text-sm font-semibold text-primary">Edit</span></div></summary>
    <form action={saveOption} className="mt-4 grid gap-3 border-t pt-4 md:grid-cols-2 xl:grid-cols-4"><input type="hidden" name="id" value={option.id}/>
     <label className="text-sm font-medium">Option name<input name="name" required defaultValue={asText(option.fields["Option Name"])} className="mt-1 w-full rounded-xl border px-3 py-2"/></label>
     <label className="text-sm font-medium">Type<select name="type" defaultValue={asText(option.fields["Option Type"])} className="mt-1 w-full rounded-xl border bg-white px-3 py-2">{["Individual Ticket","Couple","Table","Golfer","Foursome","Sponsorship","Dinner Only","Other"].map(v=><option key={v}>{v}</option>)}</select></label>
     <label className="text-sm font-medium">Price<input name="price" type="number" min="0" step="0.01" defaultValue={asNumber(option.fields.Price)??0} className="mt-1 w-full rounded-xl border px-3 py-2"/></label>
     <label className="text-sm font-medium">Capacity units<input name="capacity" type="number" min="0" defaultValue={asNumber(option.fields["Capacity Units"])??0} className="mt-1 w-full rounded-xl border px-3 py-2"/></label>
     <label className="text-sm font-medium">People per unit<input name="peoplePerUnit" type="number" min="1" defaultValue={asNumber(option.fields["People Per Unit"])??1} className="mt-1 w-full rounded-xl border px-3 py-2"/></label>
     <label className="text-sm font-medium">Sales start<input name="salesStart" type="date" defaultValue={asText(option.fields["Sales Start"])} className="mt-1 w-full rounded-xl border px-3 py-2"/></label>
     <label className="text-sm font-medium">Sales end<input name="salesEnd" type="date" defaultValue={asText(option.fields["Sales End"])} className="mt-1 w-full rounded-xl border px-3 py-2"/></label>
     <label className="text-sm font-medium">Display order<input name="displayOrder" type="number" defaultValue={asNumber(option.fields["Display Order"])??0} className="mt-1 w-full rounded-xl border px-3 py-2"/></label>
     <label className="text-sm font-medium md:col-span-2 xl:col-span-3">Description<textarea name="description" rows={2} defaultValue={asText(option.fields.Description)} className="mt-1 w-full rounded-xl border px-3 py-2"/></label>
     <label className="flex items-center gap-2 self-end rounded-xl bg-slate-50 px-4 py-3 text-sm"><input name="active" type="checkbox" defaultChecked={Boolean(option.fields.Active)}/> Active</label>
     <button className="rounded-full border border-primary px-5 py-2.5 font-semibold text-primary md:col-span-2 xl:col-span-4">Save Option</button>
    </form></details>
   }):<p className="text-sm text-muted-foreground">No paid ticket or package options have been created yet.</p>}</div>
  </section>

  <section className="rounded-3xl border bg-white p-6 shadow-sm">
   <div className="mb-5 flex items-center gap-3"><CreditCard className="h-6 w-6 text-primary"/><h2 className="text-2xl font-bold">Reservations & Payments</h2></div>
   <div className="space-y-4">{reservations.length?reservations.map(res=>{
    const event=eventById.get(asStrings(res.fields.Event)[0]);const option=optionById.get(asStrings(res.fields["Ticket / Package Option"])[0]);
    return <details key={res.id} className="rounded-2xl border p-4"><summary className="cursor-pointer list-none"><div className="flex flex-wrap justify-between gap-3"><div><p className="font-semibold">{asText(res.fields["Confirmation Number"])} · {asText(res.fields["Purchaser First Name"])} {asText(res.fields["Purchaser Last Name"])}</p><p className="mt-1 text-sm text-muted-foreground">{asText(event?.fields["Event Name"])} · {asText(option?.fields["Option Name"])} × {String(asNumber(res.fields.Quantity)??1)} · {fmtMoney(res.fields["Amount Due"])}</p></div><div className="text-right text-sm"><p className="font-semibold">{asText(res.fields["Reservation Status"])}</p><p className="text-muted-foreground">{asText(res.fields["Payment Status"])}</p></div></div></summary>
    <div className="mt-4 grid gap-3 border-t pt-4 text-sm md:grid-cols-2"><p><strong>Email:</strong> {asText(res.fields["Purchaser Email"])}</p><p><strong>Phone:</strong> {asText(res.fields["Purchaser Phone"])||"—"}</p><p><strong>Submitted:</strong> {fmtDate(res.fields["Submitted At"])}</p><p><strong>Guests:</strong> {asText(res.fields["Guest Names"])||"Not provided"}</p>{asText(res.fields["Special Requests"])&&<p className="md:col-span-2"><strong>Special requests:</strong> {asText(res.fields["Special Requests"])}</p>}</div>
    <form action={saveReservation} className="mt-4 grid gap-3 rounded-2xl bg-slate-50 p-4 md:grid-cols-2 xl:grid-cols-4"><input type="hidden" name="id" value={res.id}/>
     <label className="text-sm font-medium">Payment status<select name="paymentStatus" defaultValue={asText(res.fields["Payment Status"])} className="mt-1 w-full rounded-xl border bg-white px-3 py-2">{["Pending Payment","Paid","Partially Paid","Refunded","Cancelled"].map(v=><option key={v}>{v}</option>)}</select></label>
     <label className="text-sm font-medium">Reservation status<select name="reservationStatus" defaultValue={asText(res.fields["Reservation Status"])} className="mt-1 w-full rounded-xl border bg-white px-3 py-2">{["Pending","Confirmed","Waitlisted","Cancelled"].map(v=><option key={v}>{v}</option>)}</select></label>
     <label className="text-sm font-medium">Amount paid<input name="amountPaid" type="number" min="0" step="0.01" defaultValue={asNumber(res.fields["Amount Paid"])??0} className="mt-1 w-full rounded-xl border px-3 py-2"/></label>
     <label className="text-sm font-medium">Payment reference<input name="paymentReference" defaultValue={asText(res.fields["Payment Reference"])} className="mt-1 w-full rounded-xl border px-3 py-2"/></label>
     <label className="text-sm font-medium md:col-span-2 xl:col-span-4">Internal notes<textarea name="internalNotes" rows={2} defaultValue={asText(res.fields["Internal Notes"])} className="mt-1 w-full rounded-xl border px-3 py-2"/></label>
     <button className="rounded-full bg-primary px-5 py-2.5 font-semibold text-white md:col-span-2 xl:col-span-4">Save Reservation</button>
    </form></details>
   }):<p className="text-sm text-muted-foreground">No paid event reservations have been submitted yet.</p>}</div>
  </section>
 </div></main>;
}
