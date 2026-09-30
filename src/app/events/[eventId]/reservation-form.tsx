"use client";
import { FormEvent, useMemo, useState } from "react";

type Option={id:string;name:string;type:string;description:string;price:number;capacityUnits:number;peoplePerUnit:number};

export function EventReservationForm({eventId,eventName,options}:{eventId:string;eventName:string;options:Option[]}){
 const [selectedId,setSelectedId]=useState(options[0]?.id||"");
 const [quantity,setQuantity]=useState(1);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");
 const selected=options.find(o=>o.id===selectedId);
 const total=useMemo(()=>selected?selected.price*quantity:0,[selected,quantity]);

 async function submit(event:FormEvent<HTMLFormElement>){
   event.preventDefault(); if(busy)return; setBusy(true);setError("");
   const data=new FormData(event.currentTarget);
   const response=await fetch("/api/event-reservations",{method:"POST",body:data});
   const result=await response.json().catch(()=>({}));
   if(!response.ok){setError(result.error||"Could not create your reservation. Please try again.");setBusy(false);return;}
   const form=document.createElement("form");
   form.method="post";form.action="https://www.paypal.com/cgi-bin/webscr";form.target="_self";
   const values:{[key:string]:string}={
     cmd:"_xclick",business:result.paypalBusinessEmail,item_name:result.itemName,
     amount:Number(result.amount).toFixed(2),currency_code:"USD",custom:result.confirmationNumber,
     return:result.returnUrl,cancel_return:result.cancelUrl
   };
   Object.entries(values).forEach(([name,value])=>{const input=document.createElement("input");input.type="hidden";input.name=name;input.value=value;form.appendChild(input);});
   document.body.appendChild(form);form.submit();
 }

 return <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
   <section className="rounded-3xl border bg-white p-6 shadow-sm md:p-8">
     <h2 className="text-2xl font-bold">Tickets & Packages</h2>
     <div className="mt-5 space-y-3">
       {options.map(option=><label key={option.id} className={`block cursor-pointer rounded-2xl border p-4 ${selectedId===option.id?"border-primary bg-primary/5":"bg-white"}`}>
         <div className="flex items-start gap-3">
           <input type="radio" name="ticketOption" value={option.id} checked={selectedId===option.id} onChange={()=>setSelectedId(option.id)} className="mt-1"/>
           <div className="flex-1"><div className="flex justify-between gap-3"><p className="font-semibold">{option.name}</p><p className="font-bold text-primary">${option.price.toFixed(2)}</p></div>
           {option.description&&<p className="mt-1 text-sm text-muted-foreground">{option.description}</p>}
           {option.peoplePerUnit>1&&<p className="mt-1 text-xs text-muted-foreground">Includes up to {option.peoplePerUnit} people per unit.</p>}</div>
         </div>
       </label>)}
     </div>
   </section>
   <section className="rounded-3xl border bg-white p-6 shadow-sm md:p-8">
     <h2 className="text-2xl font-bold">Reserve & Pay</h2>
     <p className="mt-2 text-sm text-muted-foreground">Enter your reservation information. You will complete payment securely through PayPal.</p>
     <form onSubmit={submit} className="mt-5 space-y-4">
       <input type="hidden" name="eventId" value={eventId}/><input type="hidden" name="eventName" value={eventName}/><input type="hidden" name="optionId" value={selectedId}/>
       <div className="grid gap-3 sm:grid-cols-2">
         <label className="text-sm font-medium">First name<input required name="firstName" className="mt-1 w-full rounded-xl border px-3 py-2.5"/></label>
         <label className="text-sm font-medium">Last name<input required name="lastName" className="mt-1 w-full rounded-xl border px-3 py-2.5"/></label>
       </div>
       <label className="block text-sm font-medium">Email<input required type="email" name="email" className="mt-1 w-full rounded-xl border px-3 py-2.5"/></label>
       <label className="block text-sm font-medium">Phone<input name="phone" className="mt-1 w-full rounded-xl border px-3 py-2.5"/></label>
       <label className="block text-sm font-medium">Quantity<input required min="1" max="20" type="number" name="quantity" value={quantity} onChange={e=>setQuantity(Math.max(1,Number(e.target.value)||1))} className="mt-1 w-full rounded-xl border px-3 py-2.5"/></label>
       <label className="block text-sm font-medium">Guest names <span className="font-normal text-muted-foreground">(optional)</span><textarea name="guestNames" rows={4} placeholder="List guest names when known." className="mt-1 w-full rounded-xl border px-3 py-2.5"/></label>
       <label className="block text-sm font-medium">Special requests <span className="font-normal text-muted-foreground">(optional)</span><textarea name="specialRequests" rows={3} className="mt-1 w-full rounded-xl border px-3 py-2.5"/></label>
       <div className="rounded-2xl bg-slate-50 p-4"><div className="flex justify-between"><span>Reservation total</span><strong>${total.toFixed(2)}</strong></div></div>
       {error&&<p role="alert" className="text-sm font-semibold text-red-700">{error}</p>}
       <button disabled={busy||!selected} className="w-full rounded-full bg-primary px-5 py-3 font-semibold text-white disabled:opacity-60">{busy?"Preparing PayPal…":"Continue to PayPal"}</button>
     </form>
   </section>
 </div>;
}
