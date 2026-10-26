"use client";
import { useState } from "react";
import Link from "next/link";
type Section = {species:"Cat"|"Dog";currentStays:{id:string;name:string;days:number|null}[];completed:number[];long:{id:string}[];known:number;mean:number|null;med:number|null;p90:number|null};
function fmt(n:number|null){return n===null?"Not available":n.toLocaleString("en-US",{maximumFractionDigits:1})+" days";}
export default function SpeciesReport({sections}:{sections:Section[]}) {
 const [species,setSpecies]=useState<"Cat"|"Dog">("Cat");
 const s=sections.find(x=>x.species===species);
 if(!s)return null;
 return <section className="mt-7 rounded-2xl border bg-white p-4 shadow-sm sm:p-7">
 <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-2xl font-semibold">Adoption performance</h2><div className="inline-flex rounded-full border bg-slate-50 p-1" role="group" aria-label="Species">{(["Cat","Dog"] as const).map(k=><button key={k} type="button" aria-pressed={species===k} onClick={()=>setSpecies(k)} className={`rounded-full px-5 py-2 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${species===k?"bg-primary text-white":"text-slate-700 hover:bg-slate-200"}`}>{k==="Cat"?"Cats":"Dogs"}</button>)}</div></div>
 <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-5">{[["Median completed stay",fmt(s.med)],["Mean completed stay",fmt(s.mean)],["90th-percentile stay",fmt(s.p90)],["Current animals",String(s.currentStays.length)],["Current long-stay animals",String(s.long.length)]].map(([label,value])=><div key={label} className="rounded-xl bg-slate-50 p-3"><div className="text-xs text-slate-600">{label}</div><div className="mt-2 text-xl font-semibold">{value}</div></div>)}</div>
 <p className="mt-3 text-xs text-slate-600">Completed stays with verified intake/outcome dates: {s.completed.length}. Current stays with a known start date: {s.known} of {s.currentStays.length}. Long-stay share with known start date: {s.known?Math.round(100*s.long.length/s.known)+"%":"Not available"}.</p>
 <h3 className="mt-6 font-semibold">Longest-waiting {species==="Cat"?"cats":"dogs"}</h3><div className="mt-2 overflow-x-auto"><table className="w-full min-w-[320px] text-left text-sm"><thead><tr className="border-b text-slate-600"><th className="py-2">Animal</th><th className="py-2">Days in care</th><th className="py-2">Action</th></tr></thead><tbody>{s.currentStays.filter(a=>a.days!==null).sort((a,b)=>(b.days??0)-(a.days??0)).slice(0,12).map(a=><tr key={a.id} className="border-b"><td className="py-3">{a.name}</td><td>{a.days}</td><td><Link className="text-primary underline" href={`/portal/staff/animals/${a.id}`}>Review record</Link></td></tr>)}</tbody></table></div>
 {!s.known&&<p className="mt-3 text-sm text-slate-500">No current animals have usable intake dates.</p>}</section>;
}
