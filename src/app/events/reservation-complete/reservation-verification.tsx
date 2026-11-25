"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CheckCircle2, Clock3 } from "lucide-react";

type State={kind:"checking"|"confirmed"|"received"|"failed";message?:string;total?:number};

export function ReservationVerification({confirmation,orderId,free}:{confirmation:string;orderId:string;free:boolean}){
 const [state,setState]=useState<State>({kind:free?"received":orderId?"checking":"received"});
 useEffect(()=>{
   if(!orderId||!confirmation)return;
   let active=true;
   fetch("/api/event-reservations/capture",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({orderId,confirmationNumber:confirmation})})
     .then(async response=>({response,body:await response.json().catch(()=>({}))}))
     .then(({response,body})=>{if(!active)return;if(response.ok)setState({kind:"confirmed",total:typeof body.total==="number"?body.total:undefined});else setState({kind:"failed",message:body.error||"PayPal has not confirmed the payment yet."});})
     .catch(()=>{if(active)setState({kind:"failed",message:"We could not verify the payment right now. Safe Haven staff can check it using your reservation number."});});
   return ()=>{active=false;};
 },[orderId,confirmation]);

 const confirmed=state.kind==="confirmed"||state.kind==="received";
 return <main className="min-h-[70vh] bg-slate-50"><section className="container-custom py-16">
  <div className="mx-auto max-w-2xl rounded-3xl border bg-white p-8 text-center shadow-sm md:p-10">
   {confirmed?<CheckCircle2 className="mx-auto h-12 w-12 text-primary"/>:<Clock3 className="mx-auto h-12 w-12 text-amber-600"/>}
   <h1 className="mt-4 text-3xl font-bold">{state.kind==="checking"?"Verifying your payment":state.kind==="confirmed"?"Payment confirmed":state.kind==="failed"?"Payment needs review":"Free RSVP received"}</h1>
   <p className="mt-3 text-muted-foreground">{state.kind==="checking"?"We are checking the transaction directly with PayPal. This page will update when verification finishes.":state.kind==="confirmed"?"PayPal confirmed the payment and Safe Haven recorded your reservation.":state.kind==="failed"?`${state.message} Please do not submit another payment while this is being reviewed.`:"Your free RSVP was recorded. Safe Haven has your registration details."}</p>
   {confirmation&&<div className="mt-6 rounded-2xl bg-slate-50 p-4"><p className="text-sm text-muted-foreground">Reservation number</p><p className="mt-1 text-xl font-bold">{confirmation}</p></div>}
   {state.kind==="confirmed"&&typeof state.total==="number"&&<p className="mt-4 font-semibold">Verified payment: ${state.total.toFixed(2)}</p>}
   <p className="mt-5 text-sm text-muted-foreground">Keep this reservation number with your PayPal receipt or RSVP details.</p>
   <Link href="/events" className="mt-7 inline-flex rounded-full bg-primary px-6 py-3 font-semibold text-white">Back to Events</Link>
  </div>
 </section></main>;
}
