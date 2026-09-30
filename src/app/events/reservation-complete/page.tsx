import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

export default async function ReservationComplete({searchParams}:{searchParams:Promise<{confirmation?:string}>}){
 const {confirmation}=await searchParams;
 return <main className="min-h-[70vh] bg-slate-50">
  <section className="container-custom py-16">
   <div className="mx-auto max-w-2xl rounded-3xl border bg-white p-8 text-center shadow-sm md:p-10">
    <CheckCircle2 className="mx-auto h-12 w-12 text-primary"/>
    <h1 className="mt-4 text-3xl font-bold">Reservation received</h1>
    <p className="mt-3 text-muted-foreground">Thank you. Your reservation has been recorded and will be confirmed after Safe Haven verifies the PayPal payment.</p>
    {confirmation&&<div className="mt-6 rounded-2xl bg-slate-50 p-4"><p className="text-sm text-muted-foreground">Reservation number</p><p className="mt-1 text-xl font-bold">{confirmation}</p></div>}
    <p className="mt-5 text-sm text-muted-foreground">Please keep your PayPal receipt and reservation number. Safe Haven can use either one to locate your reservation.</p>
    <Link href="/events" className="mt-7 inline-flex rounded-full bg-primary px-6 py-3 font-semibold text-white">Back to Events</Link>
   </div>
  </section>
 </main>;
}
