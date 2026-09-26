import Link from "next/link";
import type { ReactNode } from "react";
import { revalidatePath } from "next/cache";
import { ArrowLeft, CalendarDays, Megaphone, Quote } from "lucide-react";
import { legacyAdoptionStories } from "@/lib/legacy-adoption-stories";
import { EventDateFields } from "./event-date-fields";
import {
  airtableCreate, airtableList, airtableUpdate, airtableUploadAttachment,
  asText, requirePortalRole, TABLES,
} from "@/lib/portal";

const EVENT_IMAGE_FIELD_ID="fldMvlpmPJcUeGbZX";
const TESTIMONIAL_PHOTO_FIELD_ID="flduoR9Lfecrr9P4E";

function field(f:FormData,n:string){return String(f.get(n)||"").trim()}
function optionalNumber(f:FormData,n:string){const v=field(f,n);if(!v)return undefined;const x=Number(v);return Number.isFinite(x)?x:undefined}
function fmt(v:unknown,withTime=false){const s=asText(v);if(!s)return"";const d=new Date(s);if(Number.isNaN(d.getTime()))return s;return new Intl.DateTimeFormat("en-US",{month:"short",day:"numeric",year:"numeric",...(withTime?{hour:"numeric",minute:"2-digit"}:{}),timeZone:"America/Chicago"}).format(d)}
function localInput(v:unknown){const s=asText(v);if(!s)return"";const d=new Date(s);if(Number.isNaN(d.getTime()))return"";const parts=new Intl.DateTimeFormat("en-CA",{year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hourCycle:"h23",timeZone:"America/Chicago"}).formatToParts(d);const get=(t:string)=>parts.find(p=>p.type===t)?.value||"";return get("year")+"-"+get("month")+"-"+get("day")+"T"+get("hour")+":"+get("minute")}
function chicagoLocalToIso(value:string){
  if(!value)return"";
  const [datePart,timePart="00:00"]=value.split("T");
  const [y,m,d]=datePart.split("-").map(Number);
  const [hh,mm]=timePart.split(":").map(Number);
  const naive=Date.UTC(y,m-1,d,hh,mm,0);
  const probe=new Date(naive);
  const parts=new Intl.DateTimeFormat("en-US",{year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hourCycle:"h23",timeZone:"America/Chicago"}).formatToParts(probe);
  const get=(t:string)=>Number(parts.find(p=>p.type===t)?.value||0);
  const represented=Date.UTC(get("year"),get("month")-1,get("day"),get("hour"),get("minute"),0);
  const offset=represented-naive;
  return new Date(naive-offset).toISOString();
}
function Status({children}:{children:ReactNode}){return <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold">{children}</span>}

export default async function WebsiteContentManagementPage(){
  await requirePortalRole("Staff");
  const [events,testimonials,animals]=await Promise.all([
    airtableList(TABLES.events,[
      "Event Name","Event Status","Event Type","Start Date & Time","End Date & Time","All Day Event",
      "Location Name","Street Address","City","State","ZIP","Event Description",
      "Event Image","CTA Label","CTA URL","Publish on Website",
      "Featured on Homepage","Display Order","Internal Notes"
    ],{sort:[{field:"Start Date & Time",direction:"asc"}]}),
    airtableList(TABLES.testimonials,[
      "Quote","Person / Family Name","Relationship Label","Received Date",
      "Website Permission","Approved for Website","Featured","Display Order"
    ],{sort:[{field:"Display Order",direction:"asc"}]}),
    airtableList(TABLES.animals,["Animal ID","Pet Name","Adoption Status"],{sort:[{field:"Pet Name",direction:"asc"}]})
  ]);
  const now=Date.now();
  const upcoming=events.filter(r=>{const d=new Date(asText(r.fields["Start Date & Time"]));return !Number.isNaN(d.getTime())&&d.getTime()>=now&&asText(r.fields["Event Status"])!=="Cancelled"});
  const publishedEvents=events.filter(r=>Boolean(r.fields["Publish on Website"]));
  const publishedStories=testimonials.filter(r=>Boolean(r.fields["Approved for Website"])&&asText(r.fields["Website Permission"])==="Granted");

  async function createEvent(formData:FormData){
    "use server";await requirePortalRole("Staff", "write");
    const name=field(formData,"eventName");if(!name)return;
    const record=await airtableCreate(TABLES.events,{
      "Event Name":name,"Event Status":field(formData,"eventStatus")||"Draft",
      "Event Type":field(formData,"eventType")||"Other",
      ...(field(formData,"start")?{"Start Date & Time":chicagoLocalToIso(field(formData,"start"))}:{ }),
      ...(field(formData,"end")?{"End Date & Time":chicagoLocalToIso(field(formData,"end"))}:{ }),
      "All Day Event":formData.get("allDay")==="on",
      "Location Name":field(formData,"locationName"),"Street Address":field(formData,"street"),
      City:field(formData,"city"),State:field(formData,"state"),ZIP:field(formData,"zip"),
      "Event Description":field(formData,"shortDescription"),
      "CTA Label":field(formData,"ctaLabel"),"CTA URL":field(formData,"ctaUrl"),
      "Publish on Website":formData.get("publish")==="on",
      "Featured on Homepage":formData.get("featured")==="on",
      ...(optionalNumber(formData,"displayOrder")!==undefined?{"Display Order":optionalNumber(formData,"displayOrder")}:{ }),
      "Internal Notes":field(formData,"internalNotes"),
    },true);
    const file=formData.get("image");if(record&&file instanceof File&&file.size)await airtableUploadAttachment(record.id,EVENT_IMAGE_FIELD_ID,file,true);
    revalidatePath("/portal/staff/content");revalidatePath("/events");revalidatePath("/");
  }

  async function updateEvent(formData:FormData){
    "use server";await requirePortalRole("Staff", "write");
    const id=field(formData,"eventId");const latest=await airtableList(TABLES.events,["Event Name"]);if(!latest.some(r=>r.id===id))return;
    await airtableUpdate(TABLES.events,id,{
      "Event Name":field(formData,"eventName"),"Event Status":field(formData,"eventStatus"),
      "Event Type":field(formData,"eventType"),
      "Start Date & Time":field(formData,"start")?chicagoLocalToIso(field(formData,"start")):null,
      "End Date & Time":field(formData,"end")?chicagoLocalToIso(field(formData,"end")):null,
      "All Day Event":formData.get("allDay")==="on",
      "Location Name":field(formData,"locationName"),"Street Address":field(formData,"street"),
      City:field(formData,"city"),State:field(formData,"state"),ZIP:field(formData,"zip"),
      "Event Description":field(formData,"shortDescription"),
      "CTA Label":field(formData,"ctaLabel"),"CTA URL":field(formData,"ctaUrl"),
      "Publish on Website":formData.get("publish")==="on",
      "Featured on Homepage":formData.get("featured")==="on",
      "Display Order":optionalNumber(formData,"displayOrder")??null,
      "Internal Notes":field(formData,"internalNotes"),
    },true);
    const file=formData.get("image");if(file instanceof File&&file.size)await airtableUploadAttachment(id,EVENT_IMAGE_FIELD_ID,file,true);
    revalidatePath("/portal/staff/content");revalidatePath("/events");revalidatePath("/");
  }

  async function createTestimonial(formData:FormData){
    "use server";await requirePortalRole("Staff", "write");
    const quote=field(formData,"quote");if(!quote)return;

    const animalSearch=field(formData,"animalSearch");
    let animalId="";
    if(animalSearch){
      const latestAnimals=await airtableList(TABLES.animals,["Animal ID","Pet Name"]);
      const target=animalSearch.toLowerCase();
      const match=latestAnimals.find(a=>{
        const name=asText(a.fields["Pet Name"]);
        const id=asText(a.fields["Animal ID"]);
        return [name,id,`${name} · ${id}`].some(value=>value.toLowerCase()===target);
      });
      if(!match)throw Error("Choose an animal from the search suggestions so the story is linked to the correct record.");
      animalId=match.id;
    }

    const record=await airtableCreate(TABLES.testimonials,{
      Quote:quote,"Person / Family Name":field(formData,"personName"),
      "Relationship Label":field(formData,"relationshipLabel"),
      ...(field(formData,"receivedDate")?{"Received Date":field(formData,"receivedDate")}:{ }),
      ...(animalId?{Animal:[animalId]}:{ }),
      "Website Permission":field(formData,"permission")||"Not Requested",
      "Approved for Website":formData.get("approved")==="on",
      Featured:formData.get("featured")==="on",
      ...(optionalNumber(formData,"displayOrder")!==undefined?{"Display Order":optionalNumber(formData,"displayOrder")}:{ }),
    },true);
    const file=formData.get("photo");if(record&&file instanceof File&&file.size)await airtableUploadAttachment(record.id,TESTIMONIAL_PHOTO_FIELD_ID,file,true);
    revalidatePath("/portal/staff/content");revalidatePath("/");
  }

  return <main className="min-h-screen bg-slate-50"><div className="container-custom py-10 md:py-12">
    <Link href="/portal/staff" className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"><ArrowLeft className="h-4 w-4"/> Staff Portal</Link>
    <header className="mb-8"><p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-primary">Public Content</p><h1 className="text-4xl font-bold tracking-tight md:text-5xl">Events & Website Content</h1><p className="mt-4 max-w-3xl text-muted-foreground">Manage the Airtable-backed content that feeds Safe Haven's public website without editing Airtable directly.</p></header>

    <section className="mb-8 grid gap-4 sm:grid-cols-3">{[
      ["Upcoming events",upcoming.length,CalendarDays],["Published events",publishedEvents.length,Megaphone],["Published stories",publishedStories.length + legacyAdoptionStories.length,Quote]
    ].map(([label,count,Icon])=>{const I=Icon as typeof CalendarDays;return <div key={String(label)} className="rounded-2xl border bg-white p-5 shadow-sm"><I className="mb-3 h-5 w-5 text-primary"/><p className="text-3xl font-bold">{String(count)}</p><p className="mt-1 text-sm text-muted-foreground">{String(label)}</p></div>})}</section>

    <div className="space-y-8">
      <section className="rounded-3xl border bg-white p-6 shadow-sm md:p-8"><h2 className="text-2xl font-bold">Events</h2><p className="mt-2 text-sm text-muted-foreground">Published events feed the homepage and /events page.</p><div className={events.length ? "mt-5 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]" : "mt-5"}><div className={events.length ? "space-y-4" : "hidden"}>{events.map(r=><details key={r.id} className="rounded-2xl border p-5"><summary className="cursor-pointer list-none"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-bold">{asText(r.fields["Event Name"])}</h3><p className="mt-1 text-sm text-muted-foreground">{fmt(r.fields["Start Date & Time"],true)} · {asText(r.fields["Event Type"])}</p></div><div className="flex gap-2"><Status>{asText(r.fields["Event Status"])}</Status>{Boolean(r.fields["Publish on Website"])&&<span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">Website</span>}</div></div></summary><form action={updateEvent} className="mt-5 grid gap-3 border-t pt-5 sm:grid-cols-2"><input type="hidden" name="eventId" value={r.id}/><input name="eventName" defaultValue={asText(r.fields["Event Name"])} className="rounded-xl border px-3 py-2.5"/><select name="eventStatus" defaultValue={asText(r.fields["Event Status"])} className="rounded-xl border bg-white px-3 py-2.5">{["Draft","Published","Cancelled","Completed"].map(x=><option key={x}>{x}</option>)}</select><select name="eventType" defaultValue={asText(r.fields["Event Type"])} className="rounded-xl border bg-white px-3 py-2.5">{["Fundraiser","Adoption Event","Community Event","Volunteer Event","Other"].map(x=><option key={x}>{x}</option>)}</select><EventDateFields initialAllDay={Boolean(r.fields["All Day Event"])} initialStart={localInput(r.fields["Start Date & Time"])} initialEnd={localInput(r.fields["End Date & Time"])}/><input name="locationName" defaultValue={asText(r.fields["Location Name"])} placeholder="Location name" className="rounded-xl border px-3 py-2.5"/><input name="street" defaultValue={asText(r.fields["Street Address"])} placeholder="Street address" className="rounded-xl border px-3 py-2.5"/><input name="city" defaultValue={asText(r.fields.City)} placeholder="City" className="rounded-xl border px-3 py-2.5"/><input name="state" defaultValue={asText(r.fields.State)} placeholder="State" className="rounded-xl border px-3 py-2.5"/><input name="zip" defaultValue={asText(r.fields.ZIP)} placeholder="ZIP" className="rounded-xl border px-3 py-2.5"/><label className="block text-sm font-medium sm:col-span-2">Event description<span className="mt-1 block text-xs font-normal text-muted-foreground">Briefly describe the event for visitors. This appears with the event on the website.</span><textarea name="shortDescription" rows={3} defaultValue={asText(r.fields["Event Description"])} className="mt-2 w-full rounded-xl border px-3 py-2.5"/></label><label className="block text-sm font-medium">Button label<span className="mt-1 block text-xs font-normal text-muted-foreground">Optional. Examples: Buy Tickets, RSVP, Register, or Learn More.</span><input name="ctaLabel" defaultValue={asText(r.fields["CTA Label"])} className="mt-2 w-full rounded-xl border px-3 py-2.5"/></label><label className="block text-sm font-medium">Button URL<span className="mt-1 block text-xs font-normal text-muted-foreground">Optional. Paste the webpage visitors should open when they click the event button.</span><input name="ctaUrl" defaultValue={asText(r.fields["CTA URL"])} className="mt-2 w-full rounded-xl border px-3 py-2.5"/></label><input name="displayOrder" type="number" defaultValue={typeof r.fields["Display Order"]==="number"?String(r.fields["Display Order"]):""} placeholder="Display order" className="rounded-xl border px-3 py-2.5"/><textarea name="internalNotes" rows={2} defaultValue={asText(r.fields["Internal Notes"])} placeholder="Internal notes" className="rounded-xl border px-3 py-2.5 sm:col-span-2"/><label className="text-sm"><input name="publish" type="checkbox" defaultChecked={Boolean(r.fields["Publish on Website"])} className="mr-2"/>Publish on website</label><label className="text-sm"><input name="featured" type="checkbox" defaultChecked={Boolean(r.fields["Featured on Homepage"])} className="mr-2"/>Featured on homepage</label><label className="text-sm sm:col-span-2">Event image<input name="image" type="file" accept="image/*" className="mt-2 block w-full"/></label><button className="w-fit rounded-full border border-primary px-4 py-2 text-sm font-semibold text-primary sm:col-span-2">Save Event</button></form></details>)}</div>
      <form action={createEvent} className={`h-fit rounded-2xl bg-slate-50 p-5 md:p-6 ${events.length ? "" : "mx-auto max-w-5xl"}`}>
        <div className="grid gap-4 sm:grid-cols-2">
          <h3 className="text-lg font-bold sm:col-span-2">Create Event</h3>

          <label className="block text-sm font-medium sm:col-span-2">Event name<input name="eventName" required className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5"/></label>

          <label className="block text-sm font-medium">Status<select name="eventStatus" defaultValue="Draft" className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5">{["Draft","Published","Cancelled","Completed"].map(x=><option key={x}>{x}</option>)}</select></label>
          <label className="block text-sm font-medium">Event type<select name="eventType" defaultValue="Other" className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5">{["Fundraiser","Adoption Event","Community Event","Volunteer Event","Other"].map(x=><option key={x}>{x}</option>)}</select></label>

          <EventDateFields />

          <label className="block text-sm font-medium">Location name<input name="locationName" className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5"/></label>
          <label className="block text-sm font-medium">Street address<input name="street" className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5"/></label>

          <div className="grid gap-4 sm:col-span-2 sm:grid-cols-3">
            <label className="block text-sm font-medium">City<input name="city" className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5"/></label>
            <label className="block text-sm font-medium">State<input name="state" className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5"/></label>
            <label className="block text-sm font-medium">ZIP<input name="zip" className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5"/></label>
          </div>

          <label className="block text-sm font-medium sm:col-span-2">Event description<span className="mt-1 block text-xs font-normal text-muted-foreground">Briefly describe the event for visitors. This appears with the event on the website.</span><textarea name="shortDescription" rows={3} className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5"/></label>

          <label className="block text-sm font-medium">Button label<span className="mt-1 block text-xs font-normal text-muted-foreground">Optional. Examples: Buy Tickets, RSVP, Register, or Learn More.</span><input name="ctaLabel" className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5"/></label>
          <label className="block text-sm font-medium">Button URL<span className="mt-1 block text-xs font-normal text-muted-foreground">Optional. Paste the webpage visitors should open when they click the event button.</span><input name="ctaUrl" className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5"/></label>
          <label className="block text-sm font-medium">Display order<input name="displayOrder" type="number" className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5"/></label>

          <div className="flex flex-wrap gap-x-6 gap-y-3 text-sm sm:col-span-2">
            <label><input name="publish" type="checkbox" className="mr-2"/>Publish on website</label>
            <label><input name="featured" type="checkbox" className="mr-2"/>Featured on homepage</label>
          </div>

          <label className="block text-sm font-medium">Event image<input name="image" type="file" accept="image/*" className="mt-2 block w-full text-sm"/></label>
          <label className="block text-sm font-medium">Internal notes<textarea name="internalNotes" rows={2} className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5"/></label>

          <button className="w-full rounded-full bg-primary px-5 py-3 font-semibold text-white sm:col-span-2 sm:mx-auto sm:max-w-sm">Create Event</button>
        </div>
      </form></div></section>

      <section className="rounded-3xl border bg-white p-6 shadow-sm md:p-8">
        <div className="mx-auto max-w-5xl"><h2 className="text-2xl font-bold">Real Families. Real Second Chances.</h2><p className="mt-2 text-sm text-muted-foreground">Add an approved adoption story for the website.</p></div>

        <form action={createTestimonial} className="mx-auto mt-5 max-w-5xl space-y-4 rounded-2xl bg-slate-50 p-5 md:p-6">
          <h3 className="font-bold">Add Story</h3>

          <label className="block text-sm font-medium">
            Animal
            <input
              name="animalSearch"
              list="testimonial-animals"
              placeholder="Search by animal name or ID"
              autoComplete="off"
              className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5"
            />
            <datalist id="testimonial-animals">
              {animals.map(a=>{
                const name=asText(a.fields["Pet Name"]);
                const id=asText(a.fields["Animal ID"]);
                return <option key={a.id} value={`${name} · ${id}`}/>;
              })}
            </datalist>
            <span className="mt-1 block text-xs font-normal text-muted-foreground">Start typing a name or animal ID, then choose the matching animal.</span>
          </label>

          <label className="block text-sm font-medium">
            Story / testimonial
            <textarea name="quote" rows={5} required placeholder="Approved testimonial text" className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5"/>
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium">Person / family name<input name="personName" className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5"/></label>
            <label className="block text-sm font-medium">Relationship label<input name="relationshipLabel" className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5"/></label>
            <label className="block text-sm font-medium">Date received<input name="receivedDate" type="date" className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5"/></label>
            <label className="block text-sm font-medium">Website permission<select name="permission" defaultValue="Not Requested" className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5">{["Granted","Not Granted","Not Requested"].map(x=><option key={x}>{x}</option>)}</select></label>
            <label className="block text-sm font-medium">Display order<input name="displayOrder" type="number" className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5"/></label>
            <label className="block text-sm font-medium">Animal photo<input name="photo" type="file" accept="image/*" className="mt-2 block w-full text-sm"/></label>
          </div>

          <div className="flex flex-wrap gap-5 text-sm">
            <label><input name="approved" type="checkbox" className="mr-2"/>Approved for website</label>
            <label><input name="featured" type="checkbox" className="mr-2"/>Featured</label>
          </div>

          <button className="rounded-full bg-primary px-6 py-3 font-semibold text-white">Add Story</button>
        </form>
      </section>
    </div>
  </div></main>
}