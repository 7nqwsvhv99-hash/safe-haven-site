"use client";
type Item={role:string;name:string;start:string;end:string;sample:boolean};
const parse=(s:string)=>{const m=/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(s);if(!m)return 0;let h=Number(m[1])%12;if(m[3].toUpperCase()==="PM")h+=12;return h*60+Number(m[2]);};
export default function CoverageBars({items,clinicDate,canOffer=false,offerAction}:{items:Item[];clinicDate?:string;canOffer?:boolean;offerAction?:(data:FormData)=>Promise<void>}){
 const start=7*60,end=19*60;
 return <div className="mt-5 overflow-x-auto"><div className="min-w-[590px]"><div className="relative ml-44 grid grid-cols-7 text-xs text-slate-500">{["7 AM","9 AM","11 AM","1 PM","3 PM","5 PM","7 PM"].map(t=><span key={t}>{t}</span>)}</div><div className="mt-3 space-y-3">{items.map((x,i)=>{const a=Math.max(start,parse(x.start)),b=Math.min(end,parse(x.end));return <div key={x.role} className="flex items-center gap-3"><div className="w-40 shrink-0 text-sm font-medium">{x.role}</div><div className="relative h-11 flex-1 rounded-md bg-slate-100"><div className="absolute inset-0 grid grid-cols-6">{Array.from({length:6},(_,k)=><div key={k} className="border-l border-slate-200"/>)}</div>{b>a&&<div style={{left:`${(a-start)/(end-start)*100}%`,width:`${(b-a)/(end-start)*100}%`,backgroundColor:["#0d9488","#0d9488","#2563eb","#7c3aed","#ea580c"][i%5]}} className="absolute top-1 h-9 rounded-md px-2 text-white flex items-center justify-center overflow-hidden">{canOffer&&offerAction&&clinicDate&&x.name==="Unassigned"&&x.role.startsWith("Animal Care")?
 <form action={offerAction} className="flex h-full w-full items-center justify-center">
  <input type="hidden" name="date" value={clinicDate}/>
  <input type="hidden" name="role" value={x.role}/>
  <button type="submit" title={"Offer "+x.role+" shift to eligible employees"} className="w-full truncate px-2 py-2 text-center text-xs font-semibold text-white underline underline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white">Unassigned · Offer shift</button>
 </form>:
 <span className="truncate text-xs font-semibold">{x.name} <span className="font-normal opacity-90">· {x.start}–{x.end}</span></span>}</div>}{b<=a&&<div className="flex h-full items-center px-3 text-sm text-slate-500">Not scheduled</div>}</div></div>})}</div></div></div>;
}
