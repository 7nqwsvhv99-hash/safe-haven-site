"use client";
import {useRouter} from "next/navigation";
import {useState,useTransition} from "react";
export default function ScheduleDateControls({date,view}:{date:string;view:"day"|"week"}){
 const router=useRouter();const [chosen,setChosen]=useState(date);const [pending,startTransition]=useTransition();
 function go(d:string,v:"day"|"week"){if(!/^\d{4}-\d{2}-\d{2}$/.test(d))return;startTransition(()=>router.push("/portal/staff/scheduling?date="+encodeURIComponent(d)+"&view="+v));}
 return <div className="mt-5 flex flex-wrap items-center gap-3">
  <label htmlFor="staff-schedule-date" className="text-sm">Date</label>
  <input id="staff-schedule-date" type="date" value={chosen} onChange={e=>{setChosen(e.target.value);go(e.target.value,view)}} className="rounded-xl border p-2" aria-label="Schedule date"/>
  <div className="inline-flex rounded-full border bg-white p-1" role="group" aria-label="Schedule display">
   <button type="button" onClick={()=>go(chosen,"week")} aria-pressed={view==="week"} className={"rounded-full px-4 py-2 text-sm "+(view==="week"?"bg-primary text-white":"")}>Weekly</button>
   <button type="button" onClick={()=>go(chosen,"day")} aria-pressed={view==="day"} className={"rounded-full px-4 py-2 text-sm "+(view==="day"?"bg-primary text-white":"")}>Daily</button>
  </div>
  {pending&&<span role="status" className="text-xs text-slate-500">Updating schedule…</span>}
 </div>;
}
