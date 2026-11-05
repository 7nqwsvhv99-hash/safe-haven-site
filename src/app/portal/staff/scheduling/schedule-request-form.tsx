"use client";
import {useState} from "react";
type ShiftOption={id:string;label:string};
export default function ScheduleRequestForm({action,shifts}:{action:(f:FormData)=>Promise<void>;shifts:ShiftOption[]}){
 const [kind,setKind]=useState("Time Off");
 const unavailable=kind==="Unable to Work Scheduled Shift";
 return <form action={action} className="mt-3 grid items-end gap-2 md:grid-cols-3">
  <label className="min-w-0 text-xs font-medium">Request type<select name="kind" value={kind} onChange={e=>setKind(e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"><option value="Time Off">Request Time Off</option><option value="Unable to Work Scheduled Shift">Unable to Work Scheduled Shift</option></select></label>
  {unavailable?<label className="min-w-0 text-xs font-medium md:col-span-2">My scheduled shift<select name="shift" required className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"><option value="">Select upcoming shift</option>{shifts.map(s=><option key={s.id} value={s.id}>{s.label}</option>)}</select>{!shifts.length&&<span className="mt-1 block text-amber-800">No upcoming assigned shifts. Contact your manager.</span>}</label>:<>
   <label className="min-w-0 text-xs font-medium">Start date<input type="date" name="date" required className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"/></label>
   <label className="min-w-0 text-xs font-medium">End date (optional)<input type="date" name="end" className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"/></label>
  </>}
  <label className="min-w-0 text-xs font-medium md:col-span-3">Additional information (optional)<input name="reason" className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" placeholder="Add details when needed"/></label>
  <button type="submit" disabled={unavailable&&!shifts.length} className="w-fit whitespace-nowrap rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">Submit request</button>
 </form>
}
