import Link from "next/link";
import type { ReactNode } from "react";
import { revalidatePath } from "next/cache";
import { ArrowLeft, CalendarDays, Quote, ChevronDown } from "lucide-react";
import { legacyAdoptionStories } from "@/lib/legacy-adoption-stories";
import { EventDateFields } from "./event-date-fields";
import { EventLifecycleFields } from "./event-lifecycle-fields";
import { chicagoLocalToIso, eventEndTimestamp, parseEventDateRange } from "@/lib/event-dates";
import { releaseEventCapacity } from "@/lib/event-capacity";
import { getSafeHavenAirtableConfig } from "@/lib/airtable-config";
import {
  airtableCreate, airtableList, airtableUpdate, airtableUploadAttachment,
  asText, asStrings, requirePortalRole, TABLES,
} from "@/lib/portal";


function field(f:FormData,n:string){return String(f.get(n)||"").trim()}
function optionalNumber(f:FormData,n:string){const v=field(f,n);if(!v)return undefined;const x=Number(v);return Number.isFinite(x)?x:undefined}
function fmt(v:unknown,withTime=false){const s=asText(v);if(!s)return"";const d=new Date(s);if(Number.isNaN(d.getTime()))return s;return new Intl.DateTimeFormat("en-US",{month:"short",day:"numeric",year:"numeric",...(withTime?{hour:"numeric",minute:"2-digit"}:{}),timeZone:"America/Chicago"}).format(d)}
function localInput(v:unknown){const s=asText(v);if(!s)return"";const d=new Date(s);if(Number.isNaN(d.getTime()))return"";const parts=new Intl.DateTimeFormat("en-CA",{year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hourCycle:"h23",timeZone:"America/Chicago"}).formatToParts(d);const get=(t:string)=>parts.find(p=>p.type===t)?.value||"";return get("year")+"-"+get("month")+"-"+get("day")+"T"+get("hour")+":"+get("minute")}
function Status({children}:{children:ReactNode}){return <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold">{children}</span>}

async function requireContentPublisher(){const context=await requirePortalRole("Staff","write");if(!context.isAdministrator&&!context.roles.includes("Shelter Manager")&&!context.roles.includes("Executive Director"))throw new Error("Only authorized content managers can change public website content.");return context;}

function volunteerShiftSegments(startIso:string,endIso:string){
  const start=Date.parse(startIso),end=Date.parse(endIso),hours=(end-start)/3_600_000;
  if(!Number.isFinite(hours)||hours<=0)return [];
  const count=Math.max(1,Math.ceil(hours/2));
  return Array.from({length:count},(_,index)=>{
    const from=start+hours*3_600_000*index/count;
    const to=index===count-1?end:start+hours*3_600_000*(index+1)/count;
    return {start:new Date(from).toISOString(),end:new Date(to).toISOString()};
  });
}

async function ensureEventVolunteerShifts(eventId:string,eventName:string,startIso:string,endIso:string,location:string){
  const shifts=await airtableList(TABLES.volunteerShifts,["Shift","Event","Status"]);
  if(shifts.some(shift=>asStrings(shift.fields.Event).includes(eventId)&&asText(shift.fields.Status)!=="Cancelled"))return;
  for(const [index,segment] of volunteerShiftSegments(startIso,endIso).entries()){
    await airtableCreate(TABLES.volunteerShifts,{
      Shift:`${eventName} · Volunteer Shift ${index+1}`,Event:[eventId],
      "Start Date & Time":segment.start,"End Date & Time":segment.end,
      Area:"Event",Status:"Scheduled",Location:location,Capacity:3,
      Notes:"Open event volunteer shift. Volunteers can sign up in the Volunteer Portal.",
    },true);
  }
}

async function syncEventVolunteerShifts(input:{eventId:string;eventName:string;startIso:string;endIso:string;location:string;action:string;rescheduled:boolean;oldStart:string;volunteersNeeded:boolean;cancellationReason:string;rescheduleNotice:string}){
  const shifts=await airtableList(TABLES.volunteerShifts,["Shift","Event","Start Date & Time","End Date & Time","Volunteer","Status","Location","Capacity"]);
  const linked=shifts.filter(shift=>asStrings(shift.fields.Event).includes(input.eventId));
  if(["Cancelled","Draft","Scheduled"].includes(input.action)||(input.action==="Published"&&!input.volunteersNeeded)){
    for(const shift of linked)if(asText(shift.fields.Status)!=="Cancelled")await airtableUpdate(TABLES.volunteerShifts,shift.id,{Status:"Cancelled"},true);
    const invitations=await airtableList(TABLES.eventVolunteerInvitations,["Invitation ID","Shift","Status"]);
    for(const invitation of invitations.filter(row=>asText(row.fields.Status)==="Accepted"||asText(row.fields.Status)==="Invited"||asText(row.fields.Status)==="Reconfirmation Required")){
      if(asStrings(invitation.fields.Shift).some(id=>linked.some(shift=>shift.id===id))){
        const notice=input.action==="Cancelled"?`Event cancelled. ${input.cancellationReason||"Your volunteer shift has been released."}`:input.action==="Published"?"Volunteers are no longer needed for this event. Your shift place has been released.":"This event is no longer published. Your volunteer shift has been released.";
        await airtableUpdate(TABLES.eventVolunteerInvitations,invitation.id,{Status:"Released","Responded At":new Date().toISOString(),"Volunteer Notice":notice},true);
        const invitationKey=asText(invitation.fields["Invitation ID"]);if(invitationKey)await releaseEventCapacity(invitationKey).catch((error)=>console.error("Could not release cancelled event shift hold",error));
      }
    }
    return;
  }
  if(input.action!=="Published")return;
  const activeLinked=linked.filter(shift=>asText(shift.fields.Status)!=="Cancelled");
  if(!activeLinked.length){if(input.volunteersNeeded)await ensureEventVolunteerShifts(input.eventId,input.eventName,input.startIso,input.endIso,input.location);return;}
  if(!input.rescheduled)return;
  const oldStart=Date.parse(input.oldStart),newStart=Date.parse(input.startIso),newEnd=Date.parse(input.endIso);
  for(const shift of linked){
    if(asText(shift.fields.Status)==="Cancelled")continue;
    const shiftStart=Date.parse(asText(shift.fields["Start Date & Time"])),shiftEnd=Date.parse(asText(shift.fields["End Date & Time"]));
    if(!Number.isFinite(shiftStart)||!Number.isFinite(shiftEnd)||!Number.isFinite(oldStart))continue;
    const offset=Math.max(0,shiftStart-oldStart),duration=Math.max(0,shiftEnd-shiftStart);
    const nextStart=Math.min(newEnd,newStart+offset),nextEnd=Math.min(newEnd,nextStart+duration);
    await airtableUpdate(TABLES.volunteerShifts,shift.id,{"Start Date & Time":new Date(nextStart).toISOString(),"End Date & Time":new Date(nextEnd).toISOString(),Location:input.location},true);
  }
  const invitations=await airtableList(TABLES.eventVolunteerInvitations,["Shift","Status"]);
  for(const invitation of invitations.filter(row=>["Accepted","Invited"].includes(asText(row.fields.Status)))){
    if(asStrings(invitation.fields.Shift).some(id=>linked.some(shift=>shift.id===id)))await airtableUpdate(TABLES.eventVolunteerInvitations,invitation.id,{Status:"Reconfirmation Required","Volunteer Notice":input.rescheduleNotice||"This event has been rescheduled. Please review the updated date, time, and location."},true);
  }
}

export default async function WebsiteContentManagementPage(){
  const context=await requirePortalRole("Staff");
  const canPublish=context.isAdministrator||context.roles.includes("Shelter Manager")||context.roles.includes("Executive Director");
  if(!canPublish)return <main className="container-custom py-10"><Link href="/portal/staff">Staff Portal</Link><h1 className="mt-4 text-2xl font-bold">Events & Website Content</h1><p className="mt-2">Website content is managed by authorized shelter leadership.</p></main>;
  const [events,testimonials,animals]=await Promise.all([
    airtableList(TABLES.events,[
      "Event Name","Event Status","Event Type","Start Date & Time","End Date & Time","All Day Event",
      "Location Name","Street Address","City","State","ZIP","Event Description",
      "Event Image","CTA Label","CTA URL","Publish on Website",
      "Registration / Ticket URL","Visitor Action","Scheduled Publish At","Cancellation Reason","Cancellation Contact","Cancellation Notice Through",
      "Reschedule Notice","Reschedule Notice Through","Previous Start Date & Time","Previous End Date & Time","Previous Location","Volunteers Needed",
      "Featured on Homepage","Display Order","Internal Notes"
    ],{sort:[{field:"Start Date & Time",direction:"asc"}]}),
    airtableList(TABLES.testimonials,[
      "Quote","Person / Family Name","Relationship Label","Received Date",
      "Website Permission","Approved for Website","Featured","Display Order"
    ],{sort:[{field:"Display Order",direction:"asc"}]}),
    airtableList(TABLES.animals,["Animal ID","Pet Name","Adoption Status"],{sort:[{field:"Pet Name",direction:"asc"}]})
  ]);
  const now=Date.now();
  const publishedEvents=events.filter(r=>Boolean(r.fields["Publish on Website"])&&asText(r.fields["Event Status"])==="Published"&&eventEndTimestamp(r.fields)>=now);
  const drafts=events.filter(r=>asText(r.fields["Event Status"])==="Draft");
  const scheduled=events.filter(r=>asText(r.fields["Event Status"])==="Draft"&&Date.parse(asText(r.fields["Scheduled Publish At"]))>now);
  const cancelled=events.filter(r=>asText(r.fields["Event Status"])==="Cancelled"&&Date.parse(asText(r.fields["Cancellation Notice Through"]))>=now);
  const publishedStories=testimonials.filter(r=>Boolean(r.fields["Approved for Website"])&&asText(r.fields["Website Permission"])==="Granted");

  async function createEvent(formData:FormData){
    "use server";await requireContentPublisher();
    const name=field(formData,"eventName");if(!name)return;
    const allDay=formData.get("allDay")==="on";
    const dates=parseEventDateRange(field(formData,"start"),field(formData,"end"),allDay);
    const action=field(formData,"publicationAction")||"Draft";
    const scheduledAt=action==="Scheduled"?chicagoLocalToIso(field(formData,"scheduledPublishAt")):"";
    if(action==="Scheduled"&&(!scheduledAt||Date.parse(scheduledAt)<=Date.now()))throw new Error("Choose a future publication date and time.");
    const status=action==="Scheduled"?"Draft":action;
    if(!["Draft","Published","Cancelled","Completed"].includes(status))throw new Error("Choose a valid publication action.");
    const cancellationThrough=action==="Cancelled"?(field(formData,"cancellationNoticeThrough")?chicagoLocalToIso(field(formData,"cancellationNoticeThrough")):dates.endIso):"";
    const visitorAction=field(formData,"visitorAction")||"Simply attend";
    const registrationUrl=visitorAction==="Learn more"?field(formData,"registrationUrl"):"";
    const labels:Record<string,string>={"Simply attend":"","Learn more":"Learn more","RSVP for free":"RSVP for free","Purchase tickets":"Register & pay fee","Register and pay":"Register & pay fee"};
    const record=await airtableCreate(TABLES.events,{
      "Event Name":name,"Event Status":status,
      "Event Type":field(formData,"eventType")||"Other",
      "Start Date & Time":dates.startIso,"End Date & Time":dates.endIso,
      "All Day Event":allDay,
      "Location Name":field(formData,"locationName"),"Street Address":field(formData,"street"),
      City:field(formData,"city"),State:field(formData,"state"),ZIP:field(formData,"zip"),
      "Event Description":field(formData,"shortDescription"),
      "Visitor Action":visitorAction,"Registration / Ticket URL":registrationUrl||null,
      "CTA Label":labels[visitorAction]||"","Scheduled Publish At":scheduledAt||null,
      "Cancellation Reason":action==="Cancelled"?field(formData,"cancellationReason"):"",
      "Cancellation Contact":action==="Cancelled"?field(formData,"cancellationContact"):"",
      "Cancellation Notice Through":cancellationThrough||null,
      "Reschedule Notice":field(formData,"rescheduleNotice"),
      "Reschedule Notice Through":field(formData,"rescheduleNoticeThrough")?chicagoLocalToIso(field(formData,"rescheduleNoticeThrough")):null,
      "Volunteers Needed":formData.get("volunteersNeeded")==="on",
      "Publish on Website":status==="Published"||status==="Cancelled",
      "Featured on Homepage":formData.get("featured")==="on",
    },true);
    const files=formData.getAll("images").filter((file):file is File=>file instanceof File&&file.size>0);
    if(record)for(const file of files)await airtableUploadAttachment(record.id,getSafeHavenAirtableConfig().fields.eventImage,file);
    if(record&&status==="Published"&&formData.get("volunteersNeeded")==="on"){
      const location=[field(formData,"locationName"),field(formData,"street"),field(formData,"city"),field(formData,"state")].filter(Boolean).join(", ");
      await ensureEventVolunteerShifts(record.id,name,dates.startIso,dates.endIso,location);
    }
    revalidatePath("/portal/staff/content");revalidatePath("/events");revalidatePath("/");
  }

  async function updateEvent(formData:FormData){
    "use server";await requireContentPublisher();
    const id=field(formData,"eventId");const latest=await airtableList(TABLES.events,["Event Name","Start Date & Time","End Date & Time","Location Name","Street Address","City","State","ZIP","Event Status"]);const previous=latest.find(r=>r.id===id);if(!previous)return;
    const allDay=formData.get("allDay")==="on";
    const dates=parseEventDateRange(field(formData,"start"),field(formData,"end"),allDay);
    const action=field(formData,"publicationAction")||"Draft";
    const scheduledAt=action==="Scheduled"?chicagoLocalToIso(field(formData,"scheduledPublishAt")):"";
    if(action==="Scheduled"&&(!scheduledAt||Date.parse(scheduledAt)<=Date.now()))throw new Error("Choose a future publication date and time.");
    if(!["Draft","Published","Scheduled","Cancelled","Completed"].includes(action))throw new Error("Choose a valid publication action.");
    const location=field(formData,"locationName");
    const previousLocation=["Location Name","Street Address","City","State","ZIP"].map(key=>asText(previous.fields[key])).filter(Boolean).join(", ");
    const nextLocation=[location,field(formData,"street"),field(formData,"city"),field(formData,"state"),field(formData,"zip")].filter(Boolean).join(", ");
    const rescheduled=asText(previous.fields["Start Date & Time"])!==dates.startIso||asText(previous.fields["End Date & Time"])!==dates.endIso||previousLocation!==nextLocation;
    const cancellationThrough=action==="Cancelled"?(field(formData,"cancellationNoticeThrough")?chicagoLocalToIso(field(formData,"cancellationNoticeThrough")):dates.endIso):"";
    const visitorAction=field(formData,"visitorAction")||"Simply attend";
    const registrationUrl=visitorAction==="Learn more"?field(formData,"registrationUrl"):"";
    const labels:Record<string,string>={"Simply attend":"","Learn more":"Learn more","RSVP for free":"RSVP for free","Purchase tickets":"Register & pay fee","Register and pay":"Register & pay fee"};
    await airtableUpdate(TABLES.events,id,{
      "Event Name":field(formData,"eventName"),"Event Status":action==="Scheduled"?"Draft":action,
      "Event Type":field(formData,"eventType"),
      "Start Date & Time":dates.startIso,"End Date & Time":dates.endIso,
      "All Day Event":allDay,
      "Location Name":location,"Street Address":field(formData,"street"),
      City:field(formData,"city"),State:field(formData,"state"),ZIP:field(formData,"zip"),
      "Event Description":field(formData,"shortDescription"),
      "Visitor Action":visitorAction,"Registration / Ticket URL":registrationUrl||null,
      "CTA Label":labels[visitorAction]||"","Scheduled Publish At":scheduledAt||null,
      "Cancellation Reason":action==="Cancelled"?field(formData,"cancellationReason"):null,
      "Cancellation Contact":action==="Cancelled"?field(formData,"cancellationContact"):null,
      "Cancellation Notice Through":cancellationThrough||null,
      "Reschedule Notice":rescheduled?(field(formData,"rescheduleNotice")||"This event has been rescheduled. Please review the updated date, time, or location."):field(formData,"rescheduleNotice")||null,
      "Reschedule Notice Through":field(formData,"rescheduleNoticeThrough")?chicagoLocalToIso(field(formData,"rescheduleNoticeThrough")):null,
      ...(rescheduled?{"Previous Start Date & Time":previous.fields["Start Date & Time"],"Previous End Date & Time":previous.fields["End Date & Time"],"Previous Location":previousLocation}:{}),
      "Volunteers Needed":formData.get("volunteersNeeded")==="on",
      "Publish on Website":action==="Published"||action==="Cancelled",
      "Featured on Homepage":formData.get("featured")==="on",
    },true);
    const files=formData.getAll("images").filter((file):file is File=>file instanceof File&&file.size>0);
    for(const file of files)await airtableUploadAttachment(id,getSafeHavenAirtableConfig().fields.eventImage,file);
    const shiftLocation=[location,field(formData,"street"),field(formData,"city"),field(formData,"state")].filter(Boolean).join(", ");
    await syncEventVolunteerShifts({eventId:id,eventName:field(formData,"eventName"),startIso:dates.startIso,endIso:dates.endIso,location:shiftLocation,action,rescheduled,oldStart:asText(previous.fields["Start Date & Time"]),volunteersNeeded:formData.get("volunteersNeeded")==="on",cancellationReason:field(formData,"cancellationReason"),rescheduleNotice:field(formData,"rescheduleNotice")});
    revalidatePath("/portal/staff/content");revalidatePath("/events");revalidatePath("/");
  }

  async function duplicateEvent(formData:FormData){
    "use server";await requireContentPublisher();
    const id=field(formData,"eventId");
    const rows=await airtableList(TABLES.events,["Event Name","Event Type","All Day Event","Location Name","Street Address","City","State","ZIP","Event Description","Event Image"]);
    const source=rows.find(row=>row.id===id);if(!source)throw new Error("Event not found.");
    const fields:Record<string,unknown>={};
    for(const key of ["Event Type","All Day Event","Location Name","Street Address","City","State","ZIP","Event Description"]){if(source.fields[key]!==undefined)fields[key]=source.fields[key];}
    const images=source.fields["Event Image"];
    if(Array.isArray(images))fields["Event Image"]=images.flatMap(item=>item&&typeof item.url==="string"?[{url:item.url,filename:item.filename}]:[]);
    await airtableCreate(TABLES.events,{...fields,"Event Name":asText(source.fields["Event Name"])+" (copy)","Event Status":"Draft","Publish on Website":false,"Featured on Homepage":false},true);
    revalidatePath("/portal/staff/content");
  }

  async function removeEventImage(formData:FormData){
    "use server";await requireContentPublisher();
    const id=field(formData,"eventId"), imageId=field(formData,"imageId");
    const rows=await airtableList(TABLES.events,["Event Image"]);
    const source=rows.find(row=>row.id===id);if(!source)throw new Error("Event not found.");
    const images=source.fields["Event Image"];
    if(!Array.isArray(images)||!images.some(item=>item?.id===imageId))throw new Error("Image not found.");
    await airtableUpdate(TABLES.events,id,{"Event Image":images.filter(item=>item?.id!==imageId).map(item=>({id:item.id}))});
    revalidatePath("/portal/staff/content");revalidatePath("/events");revalidatePath("/");revalidatePath("/events/"+id);
  }

  async function setPrimaryEventImage(formData:FormData){
    "use server";await requireContentPublisher();
    const id=field(formData,"eventId"),imageId=field(formData,"imageId");
    const rows=await airtableList(TABLES.events,["Event Image"]);
    const source=rows.find(row=>row.id===id);if(!source)throw new Error("Event not found.");
    const images=source.fields["Event Image"];
    if(!Array.isArray(images)||!images.some(item=>item?.id===imageId))throw new Error("Image not found.");
    const ordered=[...images].sort((a,b)=>a.id===imageId?-1:b.id===imageId?1:0);
    await airtableUpdate(TABLES.events,id,{"Event Image":ordered.map(item=>({id:item.id}))});
    revalidatePath("/portal/staff/content");revalidatePath("/events");revalidatePath("/");revalidatePath("/events/"+id);
  }

  async function createTestimonial(formData:FormData){
    "use server";await requireContentPublisher();
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
    const file=formData.get("photo");if(record&&file instanceof File&&file.size)await airtableUploadAttachment(record.id,getSafeHavenAirtableConfig().fields.testimonialPhoto,file,true);
    revalidatePath("/portal/staff/content");revalidatePath("/");
  }

  return <main className="min-h-screen bg-slate-50"><div className="container-custom py-10 md:py-12">
    <Link href="/portal/staff" className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"><ArrowLeft className="h-4 w-4"/> Staff Portal</Link>
    <header className="mb-8"><p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-primary">Public Content</p><h1 className="text-4xl font-bold tracking-tight md:text-5xl">Events & Website Content</h1></header>


    <div className="space-y-8">
      <details name="public-content" className="rounded-3xl border bg-white p-6 shadow-sm md:p-8"><summary className="flex cursor-pointer list-none items-center gap-4"><CalendarDays className="h-6 w-6 text-primary"/><div className="flex-1"><h2 className="text-2xl font-bold">Events</h2><p className="text-sm text-muted-foreground">{publishedEvents.length} live · {scheduled.length} scheduled · {drafts.length-scheduled.length} drafts · {cancelled.length} active cancellation notices</p></div><ChevronDown className="h-5 w-5"/></summary><div className={events.length ? "mt-5 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]" : "mt-5"}><div className={events.length ? "space-y-4" : "hidden"}>{events.map(r=><details key={r.id} className="rounded-2xl border p-5"><summary className="cursor-pointer list-none"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-bold">{asText(r.fields["Event Name"])}</h3><p className="mt-1 text-sm text-muted-foreground">{fmt(r.fields["Start Date & Time"],true)} · {asText(r.fields["Event Type"])}</p></div><div className="flex gap-2"><Status>{asText(r.fields["Event Status"])==="Draft"&&Date.parse(asText(r.fields["Scheduled Publish At"]))>now?"Scheduled":asText(r.fields["Event Status"])}</Status>{Boolean(r.fields["Publish on Website"])&&<span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">Website</span>}</div></div></summary><form action={updateEvent} className="mt-5 grid gap-3 border-t pt-5 sm:grid-cols-2"><input type="hidden" name="eventId" value={r.id}/><input name="eventName" defaultValue={asText(r.fields["Event Name"])} className="rounded-xl border px-3 py-2.5"/><EventLifecycleFields status={asText(r.fields["Event Status"])} scheduledAt={asText(r.fields["Scheduled Publish At"])} visitorAction={asText(r.fields["Visitor Action"])} registrationUrl={asText(r.fields["Registration / Ticket URL"])} cancellationReason={asText(r.fields["Cancellation Reason"])} cancellationContact={asText(r.fields["Cancellation Contact"])} cancellationNoticeThrough={asText(r.fields["Cancellation Notice Through"])} rescheduleNotice={asText(r.fields["Reschedule Notice"])} rescheduleNoticeThrough={asText(r.fields["Reschedule Notice Through"])}/><select name="eventType" defaultValue={asText(r.fields["Event Type"])} className="rounded-xl border bg-white px-3 py-2.5">{["Fundraiser","Adoption Event","Community Event","Volunteer Event","Other"].map(x=><option key={x}>{x}</option>)}</select><EventDateFields initialAllDay={Boolean(r.fields["All Day Event"])} initialStart={localInput(r.fields["Start Date & Time"])} initialEnd={localInput(r.fields["End Date & Time"])}/><input name="locationName" defaultValue={asText(r.fields["Location Name"])} placeholder="Location name" className="rounded-xl border px-3 py-2.5"/><input name="street" defaultValue={asText(r.fields["Street Address"])} placeholder="Street address" className="rounded-xl border px-3 py-2.5"/><input name="city" defaultValue={asText(r.fields.City)} placeholder="City" className="rounded-xl border px-3 py-2.5"/><input name="state" defaultValue={asText(r.fields.State)} placeholder="State" className="rounded-xl border px-3 py-2.5"/><input name="zip" defaultValue={asText(r.fields.ZIP)} placeholder="ZIP" className="rounded-xl border px-3 py-2.5"/><label className="block text-sm font-medium sm:col-span-2">Event description<span className="mt-1 block text-xs font-normal text-muted-foreground">Briefly describe the event for visitors. This appears with the event on the website.</span><textarea name="shortDescription" rows={3} defaultValue={asText(r.fields["Event Description"])} className="mt-2 w-full rounded-xl border px-3 py-2.5"/></label><label className="text-sm"><input name="featured" type="checkbox" defaultChecked={Boolean(r.fields["Featured on Homepage"])} className="mr-2"/>Featured on homepage</label><label className="text-sm"><input name="volunteersNeeded" type="checkbox" defaultChecked={Boolean(r.fields["Volunteers Needed"])} className="mr-2"/>Volunteers needed</label><label className="text-sm sm:col-span-2">Event photos<input name="images" type="file" multiple accept="image/*" className="mt-2 block w-full text-sm"/><span className="mt-1 block text-xs font-normal text-muted-foreground">You can add several images. Each image must be 5 MB or smaller; the first image is shown publicly.</span></label><button className="w-fit rounded-full border border-primary px-4 py-2 text-sm font-semibold text-primary sm:col-span-2">Save Event</button></form><form action={duplicateEvent} className="mt-3"><input type="hidden" name="eventId" value={r.id}/><button className="rounded-full border px-4 py-2 text-sm font-semibold">Duplicate Event</button></form>{Array.isArray(r.fields["Event Image"])&&r.fields["Event Image"].map((image:{id:string;url:string;filename?:string},index:number)=><div key={image.id} className="mt-3 flex flex-wrap items-center gap-3"><img src={image.url} alt={image.filename||"Event image"} className="h-16 w-24 rounded object-contain"/>{index===0?<span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">Primary image</span>:<form action={setPrimaryEventImage}><input type="hidden" name="eventId" value={r.id}/><input type="hidden" name="imageId" value={image.id}/><button className="rounded-full border px-3 py-1 text-sm">Make primary</button></form>}<form action={removeEventImage} className="flex items-center gap-3"><input type="hidden" name="eventId" value={r.id}/><input type="hidden" name="imageId" value={image.id}/><label className="text-sm"><input type="checkbox" required className="mr-2"/>Confirm removal</label><button className="rounded-full border px-3 py-1 text-sm">Remove image</button></form></div>)}</details>)}</div>
      <details className="min-w-0"><summary className="mb-4 cursor-pointer font-semibold text-primary">+ Create Event</summary><form action={createEvent} className={`h-fit rounded-2xl bg-slate-50 p-5 md:p-6 ${events.length ? "" : "mx-auto max-w-5xl"}`}>
        <div className="grid gap-4 sm:grid-cols-2">
          <h3 className="text-lg font-bold sm:col-span-2">Create Event</h3>

          <label className="block text-sm font-medium sm:col-span-2">Event name<input name="eventName" required className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5"/></label>

          <EventLifecycleFields/>
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

          

          <div className="flex flex-wrap gap-x-6 gap-y-3 text-sm sm:col-span-2">
            
            <label><input name="featured" type="checkbox" className="mr-2"/>Featured on homepage</label><label><input name="volunteersNeeded" type="checkbox" className="mr-2"/>Volunteers needed</label>
          </div>

          <label className="block text-sm font-medium">Event photos<input name="images" type="file" multiple accept="image/*" className="mt-2 block w-full text-sm"/><span className="mt-1 block text-xs font-normal text-muted-foreground">You can add several images. Each image must be 5 MB or smaller; the first image is shown publicly.</span></label>
          

          <button className="w-full rounded-full bg-primary px-5 py-3 font-semibold text-white sm:col-span-2 sm:mx-auto sm:max-w-sm">Create Event</button>
        </div>
      </form></details></div></details>

      <details name="public-content" className="rounded-3xl border bg-white p-6 shadow-sm md:p-8"><summary className="flex cursor-pointer list-none items-center gap-4"><Quote className="h-6 w-6 text-primary"/><div className="flex-1"><h2 className="text-2xl font-bold">Real Families, Real Second Chances</h2><p className="text-sm text-muted-foreground">{publishedStories.length + legacyAdoptionStories.length} published stories</p></div><ChevronDown className="h-5 w-5"/></summary>

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
      </details>
    </div>
  </div></main>
}
