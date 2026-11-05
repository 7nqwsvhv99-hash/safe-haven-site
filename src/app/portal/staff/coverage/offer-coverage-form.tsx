"use client";
import {useState} from "react";
export type CoverageRequestOption={id:string;label:string;pending:number};
export type EmployeeOption={email:string;name:string};
export default function OfferCoverageForm({action,requests,employees}:{action:(f:FormData)=>Promise<void>;requests:CoverageRequestOption[];employees:EmployeeOption[]}){
 const [audience,setAudience]=useState("all");
 return <form action={action} className="mt-4 space-y-3">
  <label className="block text-sm font-medium">Coverage request
   <select name="request" required defaultValue="" className="mt-1 w-full rounded-lg border px-3 py-2.5 text-sm">
    <option value="">Choose an open shift</option>
    {requests.map(r=><option key={r.id} value={r.id}>{r.label}{r.pending?" · "+r.pending+" offer"+(r.pending===1?"":"s")+" pending":""}</option>)}
   </select>
  </label>
  <fieldset className="space-y-2"><legend className="text-sm font-medium">Offer this shift to</legend>
   <label className="flex items-center gap-2 text-sm"><input type="radio" name="audience" value="all" checked={audience==="all"} onChange={()=>setAudience("all")}/> All eligible Animal Care employees</label>
   <label className="flex items-center gap-2 text-sm"><input type="radio" name="audience" value="specific" checked={audience==="specific"} onChange={()=>setAudience("specific")}/> Specific employee</label>
  </fieldset>
  {audience==="specific"&&<label className="block text-sm font-medium">Employee
   <select name="employee" required defaultValue="" className="mt-1 w-full rounded-lg border px-3 py-2.5 text-sm"><option value="">Choose an employee</option>{employees.map(e=><option key={e.email} value={e.email}>{e.name}</option>)}</select>
  </label>}
  <button disabled={!requests.length} className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">Publish coverage opportunity</button>
  {!requests.length&&<p className="text-sm text-slate-600">No open coverage requests. Select an Uncovered or Unassigned Animal Care shift in Staff Scheduling to create one.</p>}
 </form>
}
