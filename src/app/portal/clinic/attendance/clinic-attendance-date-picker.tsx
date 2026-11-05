"use client";
import {useRouter} from "next/navigation";
import {useTransition} from "react";

export default function ClinicAttendanceDatePicker({dates,selected}:{dates:{id:string;label:string}[];selected:string}){
 const router=useRouter();const [pending,start]=useTransition();
 return <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
  Clinic date
  <select aria-label="Clinic date" value={selected} disabled={pending} onChange={e=>start(()=>router.push("/portal/clinic/attendance?date="+encodeURIComponent(e.target.value)))} className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-300">
   {dates.map(d=><option key={d.id} value={d.id}>{d.label}</option>)}
  </select>
  {pending&&<span className="text-xs font-normal text-slate-500">Loading…</span>}
 </label>;
}
