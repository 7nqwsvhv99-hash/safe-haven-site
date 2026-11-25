import { notFound } from "next/navigation";
import { CalendarDays, MapPin } from "lucide-react";
import { EventReservationForm } from "./reservation-form";
import { eventEndTimestamp } from "@/lib/event-dates";
import { getSafeHavenAirtableConfig } from "@/lib/airtable-config";

type RecordRow={id:string;fields:Record<string,unknown>};
function text(v:unknown){return typeof v==="string"?v:"";}
function num(v:unknown){return typeof v==="number"?v:0;}

async function fetchRecord(table:string,id:string){
 const token=process.env.AIRTABLE_ACCESS_TOKEN;
 if(!token) throw new Error("AIRTABLE_ACCESS_TOKEN is missing");
 const config=getSafeHavenAirtableConfig();
 const response=await fetch(`https://api.airtable.com/v0/${config.baseId}/${table}/${id}`,{headers:{Authorization:`Bearer ${token}`},cache:"no-store"});
 if(response.status===404)return null;
 const result=await response.json();
 if(!response.ok)throw new Error("Could not load event");
 return result as RecordRow;
}
async function fetchOptions(eventId:string,visitorAction:string){
 const token=process.env.AIRTABLE_ACCESS_TOKEN;
 if(!token) throw new Error("AIRTABLE_ACCESS_TOKEN is missing");
 const config=getSafeHavenAirtableConfig();
 const params=new URLSearchParams();
 params.set("pageSize","100");
 ["Option Name","Event","Option Type","Description","Price","Capacity Units","People Per Unit","Active","Display Order","Sales Start","Sales End"].forEach(f=>params.append("fields[]",f));
 params.append("sort[0][field]","Display Order");
 params.append("sort[0][direction]","asc");
 const rows:RecordRow[]=[];let offset="";
 do{
  if(offset)params.set("offset",offset);
  const response=await fetch(`https://api.airtable.com/v0/${config.baseId}/${config.tables.eventTicketOptions}?${params}`,{headers:{Authorization:`Bearer ${token}`},cache:"no-store"});
  const result=await response.json();
  if(!response.ok)throw new Error("Could not load ticket options");
  rows.push(...((result.records||[]) as RecordRow[]));offset=typeof result.offset==="string"?result.offset:"";
 }while(offset);
 const today=new Intl.DateTimeFormat("en-CA",{timeZone:"America/Chicago",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
 return rows.filter(r=>{
   const links=Array.isArray(r.fields.Event)?r.fields.Event as string[]:[];
   if(!links.includes(eventId)||!r.fields.Active)return false;
   const start=text(r.fields["Sales Start"]),end=text(r.fields["Sales End"]);
   return (!start||start<=today)&&(!end||end>=today);
 }).filter(r=>visitorAction==="RSVP for free"?num(r.fields.Price)===0:["Purchase tickets","Register and pay"].includes(visitorAction)?num(r.fields.Price)>0:true).map(r=>({
   id:r.id,name:text(r.fields["Option Name"]),type:text(r.fields["Option Type"]),
   description:text(r.fields.Description),price:num(r.fields.Price),
   capacityUnits:num(r.fields["Capacity Units"]),peoplePerUnit:num(r.fields["People Per Unit"])||1
 }));
}

export default async function EventDetailPage({params}:{params:Promise<{eventId:string}>}){
 const {eventId}=await params;
 const config=getSafeHavenAirtableConfig();
 const event=await fetchRecord(config.tables.events,eventId);
 if(!event||event.fields["Publish on Website"]!==true)notFound();
 const cancelled=text(event.fields["Event Status"])==="Cancelled";
 const end=eventEndTimestamp(event.fields);
 const cancellationEnd=Date.parse(text(event.fields["Cancellation Notice Through"]));
 if(cancelled?(!Number.isFinite(cancellationEnd)||cancellationEnd<Date.now()):(text(event.fields["Event Status"])!=="Published"||!Number.isFinite(end)||end<Date.now()))notFound();
 const visitorAction=text(event.fields["Visitor Action"]);
 const registrationAllowed=!visitorAction||["RSVP for free","Purchase tickets","Register and pay"].includes(visitorAction);
 const options=cancelled||!registrationAllowed?[]:await fetchOptions(eventId,visitorAction);
 const start=text(event.fields["Start Date & Time"]);
 const allDay=Boolean(event.fields["All Day Event"]);
 const date=start?new Intl.DateTimeFormat("en-US",{timeZone:"America/Chicago",weekday:"long",month:"long",day:"numeric",year:"numeric",...(allDay?{}:{hour:"numeric",minute:"2-digit"})}).format(new Date(start)):"";
 const location=[text(event.fields["Location Name"]),text(event.fields.City),text(event.fields.State)].filter(Boolean).join(" · ");
 const image=Array.isArray(event.fields["Event Image"])?(event.fields["Event Image"] as {url?:string;thumbnails?:{large?:{url?:string}}}[])[0]:undefined;
 const externalUrl=visitorAction==="Learn more"?text(event.fields["Registration / Ticket URL"]):!visitorAction?(text(event.fields["Registration / Ticket URL"])||text(event.fields["CTA URL"])):"";
 const rescheduleUntil=Date.parse(text(event.fields["Reschedule Notice Through"])||"");
 const rescheduleNotice=text(event.fields["Reschedule Notice"]);
 const showRescheduleNotice=Boolean(rescheduleNotice)&&(!Number.isFinite(rescheduleUntil)?end>=Date.now():rescheduleUntil>=Date.now());
 const previousStart=text(event.fields["Previous Start Date & Time"]);
 const previousDate=previousStart?new Intl.DateTimeFormat("en-US",{timeZone:"America/Chicago",month:"long",day:"numeric",year:"numeric",...(allDay?{}:{hour:"numeric",minute:"2-digit"})}).format(new Date(previousStart)):"";
 const photo=image?.thumbnails?.large?.url||image?.url||"";
 return <main className="min-h-screen bg-slate-50">
   <section className="hero-gradient">
     <div className="container-custom py-10 md:py-14">
       <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Safe Haven Event</p>
       <h1 className="mt-3 text-4xl font-bold tracking-tight md:text-5xl">{text(event.fields["Event Name"])}</h1>
       <div className="mt-5 flex flex-col gap-2 text-muted-foreground">
         {date&&<p className="flex items-center gap-2"><CalendarDays className="h-4 w-4"/>{date}</p>}
         {location&&<p className="flex items-center gap-2"><MapPin className="h-4 w-4"/>{location}</p>}
       {photo&&<img src={photo} alt="" className="mt-6 max-h-[30rem] w-full rounded-2xl bg-white object-contain"/>}
       </div>
       {text(event.fields["Event Description"])&&<p className="mt-6 max-w-3xl leading-relaxed text-muted-foreground">{text(event.fields["Event Description"])}</p>}
     </div>
   </section>
   <section className="container-custom py-10 md:py-12">
     <div className="mx-auto max-w-5xl">
       {cancelled&&<div role="status" className="event-notice-glow mb-6 rounded-2xl border border-orange-300 bg-orange-50 p-5"><p className="font-bold uppercase tracking-wide text-orange-900">Cancelled</p>{text(event.fields["Cancellation Reason"])&&<p className="mt-2 text-orange-950">{text(event.fields["Cancellation Reason"])}</p>}{text(event.fields["Cancellation Contact"])&&<p className="mt-2 text-sm text-orange-950">Questions? {text(event.fields["Cancellation Contact"])}</p>}</div>}
       {showRescheduleNotice&&!cancelled&&<div role="status" className="event-notice-glow mb-6 rounded-2xl border border-orange-300 bg-orange-50 p-5"><p className="font-bold uppercase tracking-wide text-orange-900">Rescheduled</p>{rescheduleNotice&&<p className="mt-2 text-orange-950">{rescheduleNotice}</p>}{previousDate&&<p className="mt-2 text-sm text-orange-950">Previously scheduled for {previousDate}{text(event.fields["Previous Location"])?` at ${text(event.fields["Previous Location"])}`:""}.</p>}</div>}
       {cancelled?<div className="rounded-3xl border bg-white p-8 text-center shadow-sm"><h2 className="text-2xl font-bold">This event has been cancelled.</h2><p className="mt-2 text-muted-foreground">Reservations are closed. Please contact Safe Haven if you have questions.</p></div>:options.length
         ? <EventReservationForm eventId={eventId} options={options}/>
         : externalUrl
           ? <div className="rounded-3xl border bg-white p-8 text-center shadow-sm"><h2 className="text-2xl font-bold">More event information</h2><p className="mt-2 text-muted-foreground">Continue to the event registration or information page.</p><a href={externalUrl} target="_blank" rel="noopener noreferrer" className="mt-5 inline-flex rounded-full bg-primary px-6 py-3 font-semibold text-white">{text(event.fields["CTA Label"])||"Learn more"}</a></div>
         : <div className="rounded-3xl border bg-white p-8 text-center shadow-sm"><h2 className="text-2xl font-bold">Reservations are not open yet.</h2><p className="mt-2 text-muted-foreground">Please check back for ticket and package availability.</p></div>}
     </div>
   </section>
 </main>;
}
