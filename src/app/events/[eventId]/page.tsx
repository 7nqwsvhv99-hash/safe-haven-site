import { notFound } from "next/navigation";
import { CalendarDays, MapPin } from "lucide-react";
import { EventReservationForm } from "./reservation-form";

const AIRTABLE_BASE_ID = "app2vpch2JJVrP9pu";
const EVENTS_TABLE_ID = "tbl1wjnnJXBI5a3fy";
const OPTIONS_TABLE_ID = "tblVvPwgFWUhjQolD";

type RecordRow={id:string;fields:Record<string,unknown>};
function text(v:unknown){return typeof v==="string"?v:"";}
function num(v:unknown){return typeof v==="number"?v:0;}

async function fetchRecord(table:string,id:string){
 const token=process.env.AIRTABLE_ACCESS_TOKEN;
 if(!token) throw new Error("AIRTABLE_ACCESS_TOKEN is missing");
 const response=await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${table}/${id}`,{headers:{Authorization:`Bearer ${token}`},cache:"no-store"});
 if(response.status===404)return null;
 const result=await response.json();
 if(!response.ok)throw new Error("Could not load event");
 return result as RecordRow;
}
async function fetchOptions(eventId:string){
 const token=process.env.AIRTABLE_ACCESS_TOKEN;
 if(!token) throw new Error("AIRTABLE_ACCESS_TOKEN is missing");
 const params=new URLSearchParams();
 params.set("pageSize","100");
 ["Option Name","Event","Option Type","Description","Price","Capacity Units","People Per Unit","Active","Display Order","Sales Start","Sales End"].forEach(f=>params.append("fields[]",f));
 params.append("sort[0][field]","Display Order");
 params.append("sort[0][direction]","asc");
 const response=await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${OPTIONS_TABLE_ID}?${params}`,{headers:{Authorization:`Bearer ${token}`},cache:"no-store"});
 const result=await response.json();
 if(!response.ok)throw new Error("Could not load ticket options");
 const today=new Date().toISOString().slice(0,10);
 return ((result.records||[]) as RecordRow[]).filter(r=>{
   const links=Array.isArray(r.fields.Event)?r.fields.Event as string[]:[];
   if(!links.includes(eventId)||!r.fields.Active)return false;
   const start=text(r.fields["Sales Start"]),end=text(r.fields["Sales End"]);
   return (!start||start<=today)&&(!end||end>=today);
 }).map(r=>({
   id:r.id,name:text(r.fields["Option Name"]),type:text(r.fields["Option Type"]),
   description:text(r.fields.Description),price:num(r.fields.Price),
   capacityUnits:num(r.fields["Capacity Units"]),peoplePerUnit:num(r.fields["People Per Unit"])||1
 }));
}

export default async function EventDetailPage({params}:{params:Promise<{eventId:string}>}){
 const {eventId}=await params;
 const event=await fetchRecord(EVENTS_TABLE_ID,eventId);
 if(!event||event.fields["Publish on Website"]!==true||text(event.fields["Event Status"])!=="Published")notFound();
 const options=await fetchOptions(eventId);
 const start=text(event.fields["Start Date & Time"]);
 const date=start?new Intl.DateTimeFormat("en-US",{timeZone:"America/Chicago",weekday:"long",month:"long",day:"numeric",year:"numeric",hour:"numeric",minute:"2-digit"}).format(new Date(start)):"";
 const location=[text(event.fields["Location Name"]),text(event.fields.City),text(event.fields.State)].filter(Boolean).join(" · ");
 return <main className="min-h-screen bg-slate-50">
   <section className="hero-gradient">
     <div className="container-custom py-10 md:py-14">
       <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Safe Haven Event</p>
       <h1 className="mt-3 text-4xl font-bold tracking-tight md:text-5xl">{text(event.fields["Event Name"])}</h1>
       <div className="mt-5 flex flex-col gap-2 text-muted-foreground">
         {date&&<p className="flex items-center gap-2"><CalendarDays className="h-4 w-4"/>{date}</p>}
         {location&&<p className="flex items-center gap-2"><MapPin className="h-4 w-4"/>{location}</p>}
       </div>
       {text(event.fields["Event Description"])&&<p className="mt-6 max-w-3xl leading-relaxed text-muted-foreground">{text(event.fields["Event Description"])}</p>}
     </div>
   </section>
   <section className="container-custom py-10 md:py-12">
     <div className="mx-auto max-w-5xl">
       {options.length
         ? <EventReservationForm eventId={eventId} eventName={text(event.fields["Event Name"])} options={options}/>
         : <div className="rounded-3xl border bg-white p-8 text-center shadow-sm"><h2 className="text-2xl font-bold">Reservations are not open yet.</h2><p className="mt-2 text-muted-foreground">Please check back for ticket and package availability.</p></div>}
     </div>
   </section>
 </main>;
}
