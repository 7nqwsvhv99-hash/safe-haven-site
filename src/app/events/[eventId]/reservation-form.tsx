"use client";

import { FormEvent, useMemo, useRef, useState } from "react";

type Option={id:string;name:string;type:string;description:string;price:number;capacityUnits:number;peoplePerUnit:number};

export function EventReservationForm({eventId,options}:{eventId:string;options:Option[]}){
 const requestKey=useRef(crypto.randomUUID());
 const [quantities,setQuantities]=useState<Record<string,number>>({});
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");
 const selected=options.filter(option=>(quantities[option.id]||0)>0);
 const total=useMemo(()=>options.reduce((sum,option)=>sum+option.price*(quantities[option.id]||0),0),[options,quantities]);
 const free=selected.length>0&&selected.every(option=>option.price===0);

 async function submit(event:FormEvent<HTMLFormElement>){
   event.preventDefault(); if(busy)return;
   if(!selected.length){setError("Choose at least one ticket or package.");return;}
   setBusy(true);setError("");
   const data=new FormData(event.currentTarget);
   const response=await fetch("/api/event-reservations",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({
     eventId,requestKey:requestKey.current,
     lines:selected.map(option=>({optionId:option.id,quantity:quantities[option.id]})),
     firstName:data.get("firstName"),lastName:data.get("lastName"),email:data.get("email"),phone:data.get("phone"),
     guestNames:data.get("guestNames"),specialRequests:data.get("specialRequests"),
   })});
   const result=await response.json().catch(()=>({}));
   if(!response.ok){setError(result.error||"Could not create your reservation. Please try again.");setBusy(false);return;}
   if(result.free){window.location.assign(`/events/reservation-complete?confirmation=${encodeURIComponent(result.confirmationNumber)}&free=1`);return;}
   if(typeof result.approvalUrl==="string"){window.location.assign(result.approvalUrl);return;}
   if(typeof result.returnUrl==="string"){window.location.assign(result.returnUrl);return;}
   setError("The reservation was saved, but we could not open checkout. Please contact Safe Haven before submitting again.");
   setBusy(false);
 }

 return <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
   <section className="rounded-3xl border bg-white p-6 shadow-sm md:p-8">
     <h2 className="text-2xl font-bold">Tickets & Packages</h2>
     <p className="mt-2 text-sm text-muted-foreground">Choose one or more options. Table, foursome, and sponsorship quantities count as package units.</p>
     <div className="mt-5 space-y-3">
       {options.map(option=><div key={option.id} className={`rounded-2xl border p-4 ${(quantities[option.id]||0)>0?"border-primary bg-primary/5":"bg-white"}`}>
         <div className="flex items-start gap-3">
           <input aria-label={`Choose ${option.name}`} type="checkbox" checked={(quantities[option.id]||0)>0} onChange={e=>setQuantities(current=>({...current,[option.id]:e.target.checked?1:0}))} className="mt-1 h-4 w-4"/>
           <div className="min-w-0 flex-1"><div className="flex flex-wrap justify-between gap-3"><div><p className="font-semibold">{option.name}</p><p className="mt-0.5 text-xs text-muted-foreground">{option.type}</p></div><p className="font-bold text-primary">{option.price===0?"Free":`$${option.price.toFixed(2)}`}</p></div>
           {option.description&&<p className="mt-2 text-sm text-muted-foreground">{option.description}</p>}
           {option.peoplePerUnit>1&&<p className="mt-1 text-xs text-muted-foreground">Includes up to {option.peoplePerUnit} people per unit.</p>}</div>
         </div>
         {(quantities[option.id]||0)>0&&<label className="mt-3 flex items-center gap-2 pl-7 text-sm">Quantity<input aria-label={`${option.name} quantity`} min="1" max="20" step="1" type="number" value={quantities[option.id]} onChange={e=>setQuantities(current=>({...current,[option.id]:Math.max(1,Math.min(20,Number(e.target.value)||1))}))} className="w-20 rounded-lg border px-2 py-1.5"/>{option.capacityUnits>0&&<span className="text-xs text-muted-foreground">limited availability</span>}</label>}
       </div>)}
     </div>
   </section>
   <section className="rounded-3xl border bg-white p-6 shadow-sm md:p-8">
     <h2 className="text-2xl font-bold">{free?"Submit Free RSVP":"Register & Pay"}</h2>
     <p className="mt-2 text-sm text-muted-foreground">{free?"Enter your contact details to reserve your place.":"Enter your contact details. Payment is completed and verified through PayPal."}</p>
     <form onSubmit={submit} className="mt-5 space-y-4">
       <div className="grid gap-3 sm:grid-cols-2">
         <label className="text-sm font-medium">First name<input required name="firstName" maxLength={100} autoComplete="given-name" className="mt-1 w-full rounded-xl border px-3 py-2.5"/></label>
         <label className="text-sm font-medium">Last name<input required name="lastName" maxLength={100} autoComplete="family-name" className="mt-1 w-full rounded-xl border px-3 py-2.5"/></label>
       </div>
       <label className="block text-sm font-medium">Email<input required type="email" name="email" maxLength={254} autoComplete="email" className="mt-1 w-full rounded-xl border px-3 py-2.5"/></label>
       <label className="block text-sm font-medium">Phone <span className="font-normal text-muted-foreground">(optional)</span><input name="phone" maxLength={40} autoComplete="tel" className="mt-1 w-full rounded-xl border px-3 py-2.5"/></label>
       <label className="block text-sm font-medium">Guest names <span className="font-normal text-muted-foreground">(optional)</span><textarea name="guestNames" maxLength={4000} rows={4} placeholder="List guest names when known." className="mt-1 w-full rounded-xl border px-3 py-2.5"/></label>
       <label className="block text-sm font-medium">Special requests <span className="font-normal text-muted-foreground">(optional)</span><textarea name="specialRequests" maxLength={2000} rows={3} className="mt-1 w-full rounded-xl border px-3 py-2.5"/></label>
       <div className="rounded-2xl bg-slate-50 p-4"><div className="flex justify-between"><span>{free?"Total due":"Registration total"}</span><strong>${total.toFixed(2)}</strong></div></div>
       {error&&<p role="alert" className="text-sm font-semibold text-red-700">{error}</p>}
       <button disabled={busy||!selected.length} className="w-full rounded-full bg-primary px-5 py-3 font-semibold text-white disabled:opacity-60">{busy?(free?"Saving RSVP…":"Opening secure checkout…"):(free?"Submit Free RSVP":"Continue to PayPal")}</button>
     </form>
   </section>
 </div>;
}
