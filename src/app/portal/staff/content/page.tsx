import Link from "next/link";
import type { ReactNode } from "react";
import { revalidatePath } from "next/cache";
import { ArrowLeft, CalendarDays, Quote, ChevronDown, Megaphone } from "lucide-react";
import { AdoptionStoryForm, OptimizedStoryForm, StoryAnimalPicker, type StoryAnimalOption } from "./adoption-story-form";
import { EventDateFields } from "./event-date-fields";
import { EventLifecycleFields } from "./event-lifecycle-fields";
import { AnnouncementForm } from "./announcement-form";
import { chicagoLocalToIso, eventEndTimestamp, parseEventDateRange } from "@/lib/event-dates";
import { releaseEventCapacity } from "@/lib/event-capacity";
import { getSafeHavenAirtableConfig } from "@/lib/airtable-config";
import { canManagePublicContent, getAnnouncementState, isValidAnnouncementWindow } from "@/lib/announcement-policy";
import {
  airtableCreate, airtableList, airtableUpdate, airtableUploadAttachment,
  asText, asStrings, requirePortalRole, TABLES,
} from "@/lib/portal";


function field(f:FormData,n:string){return String(f.get(n)||"").trim()}
function optionalNumber(f:FormData,n:string){const v=field(f,n);if(!v)return undefined;const x=Number(v);return Number.isFinite(x)?x:undefined}
function relationshipDefault(value:string){return /family/i.test(value)?"Adoptive family":"Adopter"}
function fmt(v:unknown,withTime=false){const s=asText(v);if(!s)return"";const d=new Date(s);if(Number.isNaN(d.getTime()))return s;return new Intl.DateTimeFormat("en-US",{month:"short",day:"numeric",year:"numeric",...(withTime?{hour:"numeric",minute:"2-digit"}:{}),timeZone:"America/Chicago"}).format(d)}
function localInput(v:unknown){const s=asText(v);if(!s)return"";const d=new Date(s);if(Number.isNaN(d.getTime()))return"";const parts=new Intl.DateTimeFormat("en-CA",{year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hourCycle:"h23",timeZone:"America/Chicago"}).formatToParts(d);const get=(t:string)=>parts.find(p=>p.type===t)?.value||"";return get("year")+"-"+get("month")+"-"+get("day")+"T"+get("hour")+":"+get("minute")}
function Status({children}:{children:ReactNode}){return <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold">{children}</span>}

async function requireContentPublisher(){const context=await requirePortalRole("Staff","write");if(!canManagePublicContent(context))throw new Error("Only authorized content managers can change public website content.");return context;}

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
  const canPublish=canManagePublicContent(context);
  if(!canPublish)return <main className="container-custom py-10"><Link href="/portal/staff">Staff Portal</Link><h1 className="mt-4 text-2xl font-bold">Events & Website Content</h1><p className="mt-2">Website content is managed by authorized shelter leadership.</p></main>;
  const [events,testimonials,animals,announcements]=await Promise.all([
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
      "Website Permission","Approved for Website","Featured","Display Order","Animal","Legacy Animal Name","Animal Photo",
      "Consent Confirmed By","Consent Confirmed At","Original Published By","Original Published At","Last Edited By","Last Edited At","Unpublished By","Unpublished At"
    ],{sort:[{field:"Display Order",direction:"asc"}]}),
    airtableList(TABLES.animals,["Animal ID","Pet Name","Species","Sex","Breed","Color / Markings","Adoption Status"],{sort:[{field:"Pet Name",direction:"asc"}]}),
    airtableList(TABLES.publicAnnouncements,["Title","Notice Type","Public Message","Status","Display Start","Expires At","Priority","Created By","Created At","Last Edited By","Last Edited At","Unpublished By","Unpublished At"],{sort:[{field:"Display Start",direction:"desc"}]})
  ]);
  const now=Date.now();
  const publishedEvents=events.filter(r=>Boolean(r.fields["Publish on Website"])&&asText(r.fields["Event Status"])==="Published"&&eventEndTimestamp(r.fields)>=now);
  const drafts=events.filter(r=>asText(r.fields["Event Status"])==="Draft");
  const scheduled=events.filter(r=>asText(r.fields["Event Status"])==="Draft"&&Date.parse(asText(r.fields["Scheduled Publish At"]))>now);
  const cancelled=events.filter(r=>asText(r.fields["Event Status"])==="Cancelled"&&Date.parse(asText(r.fields["Cancellation Notice Through"]))>=now);
  const publishedStories=testimonials.filter(r=>Boolean(r.fields["Approved for Website"])&&asText(r.fields["Website Permission"])==="Granted");
  const announcementState=(row:{fields:Record<string,unknown>})=>getAnnouncementState(row.fields,now);
  const liveAnnouncements=announcements.filter(r=>announcementState(r)==="Published");
  const scheduledAnnouncements=announcements.filter(r=>announcementState(r)==="Scheduled");
  const expiredAnnouncements=announcements.filter(r=>announcementState(r)==="Expired");
  const draftAnnouncements=announcements.filter(r=>announcementState(r)==="Draft");
  const archivedAnnouncements=announcements.filter(r=>["Cancelled","Unpublished","Needs schedule","Needs attention"].includes(announcementState(r)));
  const storyAnimals:StoryAnimalOption[]=animals.map(a=>({
    id:a.id,name:asText(a.fields["Pet Name"]),animalId:asText(a.fields["Animal ID"]),species:asText(a.fields.Species),
    sex:asText(a.fields.Sex),breed:asText(a.fields.Breed),color:asText(a.fields["Color / Markings"])
  })).filter(a=>a.name);

  async function saveAnnouncement(formData:FormData){
    "use server";
    const context=await requireContentPublisher();
    const id=field(formData,"announcementId"),title=field(formData,"noticeTitle"),message=field(formData,"message");
    const type=field(formData,"noticeType"),priority=field(formData,"priority"),status=field(formData,"status");
    if(!title)throw new Error("Add a short announcement title.");
    if(title.length>120)throw new Error("Keep the announcement title under 120 characters.");
    if(!message)throw new Error("Add the public message.");
    if(message.length>4000)throw new Error("Keep the public message under 4,000 characters.");
    if(!["Holiday Closure","Weather Closure","Urgent Notice","Service Interruption","General"].includes(type))throw new Error("Choose a valid notice type.");
    if(!["Urgent","High","Normal"].includes(priority))throw new Error("Choose a valid priority.");
    if(!["Draft","Published"].includes(status))throw new Error("Choose Draft or Published.");
    const displayStart=chicagoLocalToIso(field(formData,"displayStart"));
    const expiresAt=field(formData,"expiresAt")?chicagoLocalToIso(field(formData,"expiresAt")):"";
    if(!isValidAnnouncementWindow(displayStart,expiresAt))throw new Error(expiresAt?"Expiration must be a valid time after the display start.":"Choose a valid display start time.");
    const nowIso=new Date().toISOString(),identity=`${context.displayName} (${context.email})`;
    const fields:Record<string,unknown>={Title:title,"Notice Type":type,"Public Message":message,Status:status,"Display Start":displayStart,"Expires At":expiresAt||null,Priority:priority,"Last Edited By":identity,"Last Edited At":nowIso};
    if(id){
      const existing=await airtableList(TABLES.publicAnnouncements,["Title"]);
      if(!existing.some(row=>row.id===id))throw new Error("This announcement could not be found. Refresh the page and try again.");
      await airtableUpdate(TABLES.publicAnnouncements,id,fields,true);
    }else{
      await airtableCreate(TABLES.publicAnnouncements,{...fields,"Created By":identity,"Created At":nowIso},true);
    }
    revalidatePath("/portal/staff/content");revalidatePath("/api/announcements");revalidatePath("/");
  }

  async function changeAnnouncementStatus(formData:FormData){
    "use server";
    const context=await requireContentPublisher();
    const id=field(formData,"announcementId"),status=field(formData,"nextStatus");
    if(!id||!["Unpublished","Cancelled"].includes(status))throw new Error("Choose a valid announcement action.");
    const rows=await airtableList(TABLES.publicAnnouncements,["Title"]);
    if(!rows.some(row=>row.id===id))throw new Error("This announcement could not be found. Refresh the page and try again.");
    const nowIso=new Date().toISOString(),identity=`${context.displayName} (${context.email})`;
    await airtableUpdate(TABLES.publicAnnouncements,id,{Status:status,"Unpublished By":identity,"Unpublished At":nowIso,"Last Edited By":identity,"Last Edited At":nowIso},true);
    revalidatePath("/portal/staff/content");revalidatePath("/api/announcements");revalidatePath("/");
  }

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
    "use server";
    const context=await requireContentPublisher();
    const quote=field(formData,"quote"),animalId=field(formData,"animalId"),legacyName=field(formData,"legacyAnimalName");
    if(!quote)throw new Error("Add the approved story text before publishing.");
    if(formData.get("consentConfirmed")!=="on")throw new Error("Confirm the adopter’s permission before publishing this story.");
    if(!["Adopter","Adoptive family"].includes(field(formData,"relationshipLabel")))throw new Error("Choose Adopter or Adoptive family.");
    const file=formData.get("photo");
    if(!(file instanceof File)||!file.size)throw new Error("Add an animal photo before publishing this story.");
    const latestAnimals=await airtableList(TABLES.animals,["Pet Name"]);
    if(animalId&&!latestAnimals.some(a=>a.id===animalId))throw new Error("The selected animal could not be verified. Search again and choose the matching animal.");
    if(!animalId&&(!legacyName||formData.get("legacyStory")!=="on"))throw new Error("Choose an animal, or mark this as a legacy story without an animal record.");
    const now=new Date().toISOString(),identity=`${context.displayName} (${context.email})`;
    const record=await airtableCreate(TABLES.testimonials,{
      Quote:quote,"Person / Family Name":field(formData,"personName"),
      "Relationship Label":field(formData,"relationshipLabel"),"Received Date":field(formData,"receivedDate"),
      Animal:animalId?[animalId]:[],"Legacy Animal Name":animalId?"":legacyName,
      "Website Permission":"Not Requested","Approved for Website":false,
      "Consent Confirmed By":identity,"Consent Confirmed At":now,
      "Created By":identity,"Original Published By":"","Original Published At":""
    },true);
    if(!record)throw new Error("The story could not be saved.");
    await airtableUploadAttachment(record.id,getSafeHavenAirtableConfig().fields.testimonialPhoto,file);
    // Publish only after the record and optional image upload both succeed.
    await airtableUpdate(TABLES.testimonials,record.id,{
      "Website Permission":"Granted","Approved for Website":true,
      "Original Published By":identity,"Original Published At":now,
      "Last Edited By":identity,"Last Edited At":now
    },true);
    revalidatePath("/portal/staff/content");revalidatePath("/api/testimonials");revalidatePath("/");
  }

  async function updateTestimonial(formData:FormData){
    "use server";
    const context=await requireContentPublisher(),id=field(formData,"storyId");
    const quote=field(formData,"quote"),animalId=field(formData,"animalId"),legacyName=field(formData,"legacyAnimalName");
    if(!id||!quote)throw new Error("Story details are incomplete.");
    if(!["Adopter","Adoptive family"].includes(field(formData,"relationshipLabel")))throw new Error("Choose Adopter or Adoptive family.");
    const [records,latestAnimals]=await Promise.all([
      airtableList(TABLES.testimonials,["Website Permission","Approved for Website","Original Published By","Original Published At","Animal Photo"]),
      airtableList(TABLES.animals,["Pet Name"])
    ]);
    const current=records.find(r=>r.id===id);if(!current)throw new Error("This story could not be found. Refresh the page and try again.");
    if(animalId&&!latestAnimals.some(a=>a.id===animalId))throw new Error("The selected animal could not be verified. Search again and choose the matching animal.");
    if(!animalId&&(!legacyName||formData.get("legacyStory")!=="on"))throw new Error("Choose an animal, or mark this as a legacy story without an animal record.");
    const identity=`${context.displayName} (${context.email})`,now=new Date().toISOString();
    const file=formData.get("photo");
    const hasExistingPhoto=Array.isArray(current.fields["Animal Photo"])&&(current.fields["Animal Photo"] as unknown[]).length>0;
    if(formData.get("consentConfirmed")==="on"&&!(file instanceof File&&file.size>0)&&!hasExistingPhoto)throw new Error("Add an animal photo before publishing this story.");
    await airtableUpdate(TABLES.testimonials,id,{
      Quote:quote,"Person / Family Name":field(formData,"personName"),"Relationship Label":field(formData,"relationshipLabel"),
      "Received Date":field(formData,"receivedDate")||null,Animal:animalId?[animalId]:[],"Legacy Animal Name":animalId?"":legacyName,
      "Last Edited By":identity,"Last Edited At":now
    },true);
    if(file instanceof File&&file.size>0){
      try{
        await airtableUploadAttachment(id,getSafeHavenAirtableConfig().fields.testimonialPhoto,file);
        const withPhotos=await airtableList(TABLES.testimonials,["Animal Photo"]);
        const updated=withPhotos.find(r=>r.id===id),photos=updated?.fields["Animal Photo"];
        if(Array.isArray(photos)&&photos.length>1){
          const newPhoto=photos[photos.length-1] as {id?:string};
          await airtableUpdate(TABLES.testimonials,id,{"Animal Photo":[newPhoto,...photos.slice(0,-1)]},true);
        }
      }catch{
        throw new Error("Story text was saved, but the photo could not be replaced. The current public photo remains available. Please try the photo upload again.");
      }
    }
    if(formData.get("consentConfirmed")==="on"){
      const identity=`${context.displayName} (${context.email})`,now=new Date().toISOString();
      await airtableUpdate(TABLES.testimonials,id,{
        "Website Permission":"Granted","Approved for Website":true,
        "Consent Confirmed By":identity,"Consent Confirmed At":now,
        ...(!asText(current.fields["Original Published By"])?{"Original Published By":identity}:{}),
        ...(!asText(current.fields["Original Published At"])?{"Original Published At":now}:{}),
        "Last Edited By":identity,"Last Edited At":now
      },true);
    }
    revalidatePath("/portal/staff/content");revalidatePath("/api/testimonials");revalidatePath("/");
  }

  async function unpublishTestimonial(formData:FormData){
    "use server";
    const context=await requireContentPublisher(),id=field(formData,"storyId"),withdraw=formData.get("withdrawConsent")==="on";
    if(!id)throw new Error("Choose a story to unpublish.");
    const now=new Date().toISOString(),identity=`${context.displayName} (${context.email})`;
    await airtableUpdate(TABLES.testimonials,id,{
      "Approved for Website":false,"Unpublished By":identity,"Unpublished At":now,
      "Last Edited By":identity,"Last Edited At":now,
      ...(withdraw?{"Website Permission":"Not Granted"}:{})
    },true);
    revalidatePath("/portal/staff/content");revalidatePath("/api/testimonials");revalidatePath("/");
  }

  const announcementFormFields=(row?:{id:string;fields:Record<string,unknown>})=>{
    const values=row?.fields||{};
    return <div className="grid gap-4 sm:grid-cols-2">
      {row&&<input type="hidden" name="announcementId" value={row.id}/>}
      <label className="block text-sm font-medium sm:col-span-2">Title<input name="noticeTitle" required maxLength={120} defaultValue={asText(values.Title)} className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5"/></label>
      <label className="block text-sm font-medium">Notice type<select name="noticeType" defaultValue={asText(values["Notice Type"])||"General"} className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5">{["General","Holiday Closure","Weather Closure","Urgent Notice","Service Interruption"].map(type=><option key={type}>{type}</option>)}</select></label>
      <label className="block text-sm font-medium">Priority<select name="priority" defaultValue={asText(values.Priority)||"Normal"} className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5"><option>Urgent</option><option>High</option><option>Normal</option></select></label>
      <label className="block text-sm font-medium">Display start (Central Time)<input name="displayStart" type="datetime-local" required defaultValue={row?localInput(values["Display Start"]):localInput(new Date().toISOString())} className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5"/><span className="mt-1 block text-xs font-normal text-muted-foreground">The notice appears at this time. Choose now to publish immediately.</span></label>
      <label className="block text-sm font-medium">Expiration (optional, Central Time)<input name="expiresAt" type="datetime-local" defaultValue={localInput(values["Expires At"])} className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5"/><span className="mt-1 block text-xs font-normal text-muted-foreground">Expired notices leave the public site automatically and remain here for history.</span></label>
      <label className="block text-sm font-medium sm:col-span-2">Public message<textarea name="message" required maxLength={4000} rows={4} defaultValue={asText(values["Public Message"])} className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5"/></label>
      <label className="block text-sm font-medium sm:col-span-2">Publication status<select name="status" defaultValue={asText(values.Status)==="Published"?"Published":"Draft"} className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5"><option value="Draft">Draft</option><option value="Published">Published or scheduled</option></select><span className="mt-1 block text-xs font-normal text-muted-foreground">A future display start schedules the notice. No administrator approval is required.</span></label>
    </div>
  };

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

      <details name="public-content" className="rounded-3xl border bg-white p-6 shadow-sm md:p-8">
        <summary className="flex cursor-pointer list-none items-center gap-4"><Megaphone className="h-6 w-6 text-primary"/><div className="flex-1"><h2 className="text-2xl font-bold">Announcements</h2><p className="text-sm text-muted-foreground">{liveAnnouncements.length} live · {scheduledAnnouncements.length} scheduled · {draftAnnouncements.length} drafts · {expiredAnnouncements.length} expired · {archivedAnnouncements.length} archived</p></div><ChevronDown className="h-5 w-5"/></summary>
        <div className="mt-5 space-y-4">
          <details className="rounded-2xl border bg-slate-50 p-5">
            <summary className="cursor-pointer font-semibold text-primary">+ Create announcement</summary>
            <div className="mt-4"><AnnouncementForm action={saveAnnouncement} submitLabel="Save announcement">{announcementFormFields()}</AnnouncementForm></div>
          </details>
          {announcements.map(row=>{
            const status=announcementState(row),scheduledNotice=status==="Scheduled";
            return <details key={row.id} className="rounded-2xl border p-5">
              <summary className="cursor-pointer list-none"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-bold">{asText(row.fields.Title)}</h3><p className="mt-1 text-sm text-muted-foreground">{asText(row.fields["Notice Type"])} · Starts {fmt(row.fields["Display Start"],true)} · {asText(row.fields.Priority)||"Normal"} priority</p></div><Status>{status}</Status></div></summary>
              <div className="mt-5 space-y-4 border-t pt-5">
                <AnnouncementForm action={saveAnnouncement} submitLabel="Save changes">{announcementFormFields(row)}</AnnouncementForm>
                {asText(row.fields.Status)==="Published"&&<form action={changeAnnouncementStatus}><input type="hidden" name="announcementId" value={row.id}/><input type="hidden" name="nextStatus" value={scheduledNotice?"Cancelled":"Unpublished"}/><button className="rounded-full border border-red-300 px-4 py-2 text-sm font-semibold text-red-700">{scheduledNotice?"Cancel scheduled notice":"Unpublish notice"}</button></form>}
                <p className="text-xs text-muted-foreground">Created by {asText(row.fields["Created By"])||"not recorded"} · {fmt(row.fields["Created At"],true)||"date not recorded"}{asText(row.fields["Last Edited At"])&&<> · Last edited {fmt(row.fields["Last Edited At"],true)}</>}{asText(row.fields["Unpublished At"])&&<> · Unpublished {fmt(row.fields["Unpublished At"],true)}</>}</p>
              </div>
            </details>
          })}
          {announcements.length===0&&<p className="rounded-xl bg-slate-50 p-4 text-sm text-muted-foreground">No announcements yet. Create a notice to share it on the public website.</p>}
        </div>
      </details>

      <details name="public-content" className="rounded-3xl border bg-white p-6 shadow-sm md:p-8"><summary className="flex cursor-pointer list-none items-center gap-4"><Quote className="h-6 w-6 text-primary"/><div className="flex-1"><h2 className="text-2xl font-bold">Real Families, Real Second Chances</h2><p className="text-sm text-muted-foreground">{publishedStories.length} published · {testimonials.length-publishedStories.length} unpublished · {publishedStories.length>=20?"20 shown publicly":"up to 20 shown publicly"}</p></div><ChevronDown className="h-5 w-5"/></summary>
        <AdoptionStoryForm animals={storyAnimals} action={createTestimonial} initialDate={new Intl.DateTimeFormat("en-CA",{timeZone:"America/Chicago"}).format(new Date())} existingStoryAnimalIds={testimonials.flatMap(row=>asStrings(row.fields.Animal))}/>
        <div className="mt-6 space-y-4">
          {testimonials.map(r=>{
            const animalIds=asStrings(r.fields.Animal),photo=Array.isArray(r.fields["Animal Photo"])?(r.fields["Animal Photo"] as {url?:string;filename?:string}[])[0]:undefined;
            const isPublished=Boolean(r.fields["Approved for Website"])&&asText(r.fields["Website Permission"])==="Granted";
            const storyAnimalName=animalIds.map(id=>storyAnimals.find(a=>a.id===id)?.name).filter(Boolean).join(", ")||asText(r.fields["Legacy Animal Name"]);
            return <details key={r.id} className="rounded-2xl border bg-white p-4 md:p-5">
              <summary className="flex cursor-pointer list-none flex-wrap items-center gap-3">
                {photo?.url&&<img src={photo.url} alt={photo.filename||storyAnimalName||"Adoption story photo"} className="h-14 w-14 rounded-lg bg-slate-100 object-contain"/>}
                <span className="min-w-0 flex-1"><span className="block font-semibold">{storyAnimalName||"Story without an animal record"}</span><span className="block truncate text-sm text-muted-foreground">{asText(r.fields.Quote)}</span></span>
                <Status>{isPublished?"Published":"Unpublished / archived"}</Status>
              </summary>
              <OptimizedStoryForm action={updateTestimonial} submitLabel="Save Story" className="mt-4 grid gap-4 border-t pt-4 sm:grid-cols-2">
                <input type="hidden" name="storyId" value={r.id}/>
                <div className="sm:col-span-2"><StoryAnimalPicker animals={storyAnimals} initialAnimalId={animalIds[0]} initialLegacyName={asText(r.fields["Legacy Animal Name"])}/></div>
                <label className="block text-sm font-medium sm:col-span-2">Story / testimonial<textarea name="quote" rows={4} required defaultValue={asText(r.fields.Quote)} className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5"/></label>
                <label className="block text-sm font-medium">Person / family name<input name="personName" defaultValue={asText(r.fields["Person / Family Name"])} placeholder="Sarah, The Miller Family, or leave blank for anonymity" className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5 placeholder:text-slate-400"/></label>
                <label className="block text-sm font-medium">Relationship<select name="relationshipLabel" defaultValue={relationshipDefault(asText(r.fields["Relationship Label"]))} className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5"><option>Adopter</option><option>Adoptive family</option></select></label>
                <label className="block text-sm font-medium">Date received<input name="receivedDate" type="date" defaultValue={asText(r.fields["Received Date"]).slice(0,10)} className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5"/></label>
                <label className="block text-sm font-medium">Replace public photo <span className="font-normal text-slate-500">(optional)</span><input name="photo" type="file" accept="image/*" className="mt-2 block w-full text-sm"/><span className="mt-1 block text-xs font-normal text-muted-foreground">New photo becomes the public image; the prior file remains in Airtable history.</span></label>
                <label className="flex items-start gap-2 rounded-xl border border-orange-200 bg-white p-4 text-sm leading-6 sm:col-span-2"><input name="consentConfirmed" type="checkbox" className="mt-1"/><span>To publish or republish this story, confirm: “By adding this story, you confirm that the adopter has given Safe Haven permission to share the story and photograph publicly.”</span></label>
              </OptimizedStoryForm>
              {isPublished&&<div className="mt-4 flex flex-wrap gap-3 border-t pt-4">
                <form action={unpublishTestimonial}><input type="hidden" name="storyId" value={r.id}/><button className="rounded-full border px-4 py-2 text-sm">Unpublish / archive</button></form>
                <form action={unpublishTestimonial} className="flex flex-wrap items-center gap-3"><input type="hidden" name="storyId" value={r.id}/><label className="text-sm"><input name="withdrawConsent" type="checkbox" required className="mr-2"/>Consent has been withdrawn</label><button className="rounded-full border border-red-300 px-4 py-2 text-sm text-red-700">Unpublish immediately</button></form>
              </div>}
              <p className="mt-3 text-xs text-muted-foreground">Permission: {asText(r.fields["Website Permission"])||"Not recorded"} · Consent confirmation: {asText(r.fields["Consent Confirmed At"])||"not recorded for this historical story"} · Original publication: {asText(r.fields["Original Published At"])||"not recorded"}</p>
            </details>;
          })}
        </div>
      </details>
    </div>
  </div></main>
}
