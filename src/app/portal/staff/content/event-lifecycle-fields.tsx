"use client";

import { useState } from "react";

type Props={status?:string;scheduledAt?:string;visitorAction?:string;registrationUrl?:string;cancellationReason?:string;cancellationContact?:string;cancellationNoticeThrough?:string;rescheduleNotice?:string;rescheduleNoticeThrough?:string};

function localValue(value:string){
 if(!value)return"";
 const date=new Date(value);if(Number.isNaN(date.getTime()))return"";
 const parts=new Intl.DateTimeFormat("en-CA",{timeZone:"America/Chicago",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).formatToParts(date);
 const get=(type:string)=>parts.find(part=>part.type===type)?.value||"";
 return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

export function EventLifecycleFields({status="Published",scheduledAt="",visitorAction="Simply attend",registrationUrl="",cancellationReason="",cancellationContact="",cancellationNoticeThrough="",rescheduleNotice="",rescheduleNoticeThrough=""}:Props){
 const scheduled=status==="Draft"&&Boolean(scheduledAt)&&Date.parse(scheduledAt)>Date.now();
 const [publication,setPublication]=useState(scheduled?"Scheduled":status);
 const [action,setAction]=useState(visitorAction==="Purchase tickets"?"Register and pay":visitorAction||"Simply attend");
 return <>
  <label className="block text-sm font-medium">Publication action<select name="publicationAction" value={publication} onChange={event=>setPublication(event.target.value)} className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5"><option value="Draft">Save as Draft</option><option value="Published">Publish Event</option><option value="Scheduled">Schedule Event</option><option value="Cancelled">Cancel Event</option><option value="Completed">Record that event was held</option></select><span className="mt-1 block text-xs font-normal text-muted-foreground">Past events leave the public Events page automatically after their end time. Record that the event was held only to report the outcome in staff event history.</span></label>
  {publication==="Scheduled"&&<label className="block text-sm font-medium">Schedule for Central Time<input name="scheduledPublishAt" type="datetime-local" required defaultValue={localValue(scheduledAt)} className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5"/><span className="mt-1 block text-xs font-normal text-muted-foreground">The event will publish automatically within five minutes of this time.</span></label>}
  <label className="block text-sm font-medium">What should visitors do?<select name="visitorAction" value={action} onChange={event=>setAction(event.target.value)} className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5"><option value="Simply attend">Simply attend</option><option value="Learn more">Learn more</option><option value="RSVP for free">RSVP for free</option><option value="Register and pay">Buy tickets</option></select>{action==="Register and pay"&&<span className="mt-1 block text-xs font-normal text-muted-foreground">Paid ticket checkout is not yet enabled. Keep this event as a draft until PayPal test credentials and end-to-end payment checks are complete.</span>}</label>
  {action==="Learn more"&&<label className="block text-sm font-medium sm:col-span-2">Event information or registration link<input name="registrationUrl" type="url" defaultValue={registrationUrl} placeholder="https://" className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5"/><span className="mt-1 block text-xs font-normal text-muted-foreground">Use this for an external event page when needed. Tickets and free RSVPs are configured below.</span></label>}
  <input type="hidden" name="actionUrl" value={action==="Learn more"?"external":""}/>
  {publication==="Cancelled"&&<div className="grid gap-3 rounded-xl bg-orange-50 p-4 sm:col-span-2 sm:grid-cols-2">
    <label className="block text-sm font-medium sm:col-span-2">Reason for cancellation<textarea name="cancellationReason" rows={2} defaultValue={cancellationReason} placeholder="Optional explanation for visitors" className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5"/></label>
    <label className="block text-sm font-medium">Contact for questions<input name="cancellationContact" defaultValue={cancellationContact} placeholder="Phone or email" className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5"/></label>
    <label className="block text-sm font-medium">Keep notice public through<input name="cancellationNoticeThrough" type="datetime-local" defaultValue={localValue(cancellationNoticeThrough)} className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5"/><span className="mt-1 block text-xs font-normal text-muted-foreground">Defaults to the original event end.</span></label>
  </div>}
  <label className="block text-sm font-medium sm:col-span-2">Rescheduling notice<textarea name="rescheduleNotice" rows={2} defaultValue={rescheduleNotice} placeholder="Add a note if the date, time, or location changed." className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5"/><span className="mt-1 block text-xs font-normal text-muted-foreground">Example: “Due to severe weather, the Safe Haven Golf Outing fundraiser has been rescheduled to [new date and time] at [location]. Please check this page for the latest details or contact [name/email] with questions.”</span></label>
  <label className="block text-sm font-medium">Keep reschedule notice through<input name="rescheduleNoticeThrough" type="datetime-local" defaultValue={localValue(rescheduleNoticeThrough)} className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5"/><span className="mt-1 block text-xs font-normal text-muted-foreground">Optional. If blank, the notice ends with the event.</span></label>
 </>;
}
