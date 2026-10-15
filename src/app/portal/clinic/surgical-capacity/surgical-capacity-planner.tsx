"use client";

import { useEffect, useMemo, useState } from "react";

type Group = "stockton" | "alley" | "safe" | "purr" | "public";
type Counts = { unknown: number; spay: number; neuter: number };
type Plan = { counts: Record<Group, Counts>; veterinarian: string; start: string; end: string; approvedExtra: number; notes: string };
const GROUPS: { key: Group; label: string }[] = [
  { key: "stockton", label: "Stockton TNR" },
  { key: "alley", label: "Alley Cat Project" },
  { key: "safe", label: "Safe Haven" },
  { key: "purr", label: "Purrfection" },
  { key: "public", label: "Privately owned" },
];
const empty = (): Counts => ({ unknown: 0, spay: 0, neuter: 0 });
const makePlan = (isSaturday: boolean): Plan => ({
  counts: { stockton: { unknown: isSaturday ? 6 : 0, spay: 0, neuter: 0 }, alley: empty(), safe: empty(), purr: empty(), public: empty() },
  veterinarian: "Dulce Coulson", start: isSaturday ? "08:00" : "10:00", end: isSaturday ? "15:30" : "15:00", approvedExtra: 0, notes: "",
});
const minutes = (time: string) => { const [h, m] = time.split(":").map(Number); return h * 60 + m; };
const dateIsSaturday = (date: string) => new Date(date + "T12:00:00").getDay() === 6;
const dateIsWednesday = (date: string) => new Date(date + "T12:00:00").getDay() === 3;
const safeInteger = (n: number) => Number.isFinite(n) ? Math.max(0, Math.min(100, Math.floor(n))) : 0;

export function SurgicalCapacityPlanner() {
  const [date, setDate] = useState("");
  const [plan, setPlan] = useState<Plan>(() => makePlan(true));
  const [saved, setSaved] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const isSat = date ? dateIsSaturday(date) : true;
  const validDate = date && (dateIsWednesday(date) || dateIsSaturday(date));
  const key = "safe-haven-surgical-planner:" + date;

  useEffect(() => {
    if (!date || !validDate) { setLoaded(false); return; }
    // Advisory-only local drafts. No cases, appointments or Airtable records are modified.
    try {
      const previous = window.localStorage.getItem(key);
      if (previous) {
        const parsed = JSON.parse(previous) as Plan;
        if (parsed?.counts && GROUPS.every(g => parsed.counts[g.key])) { setPlan(parsed); setSaved(true); }
        else { setPlan(makePlan(isSat)); setSaved(false); }
      } else { setPlan(makePlan(isSat)); setSaved(false); }
    } catch { setPlan(makePlan(isSat)); setSaved(false); }
    setLoaded(true);
  }, [date, validDate, isSat, key]);

  const update = (fn: (p: Plan) => Plan) => { setPlan(fn); setSaved(false); };
  const totalCats = GROUPS.reduce((n, g) => n + Object.values(plan.counts[g.key]).reduce((a,b)=>a+b,0), 0);
  const used = GROUPS.reduce((n, g) => { const c = plan.counts[g.key]; return n + 30 * (c.unknown + c.spay) + 15 * c.neuter; }, 0);
  const hardStopVet = plan.veterinarian !== "Dulce Coulson";
  const baseTarget = isSat && !hardStopVet ? 390 : Math.max(0, minutes(plan.end) - minutes(plan.start) - 60);
  const target = baseTarget + plan.approvedExtra;
  const remaining = target - used;
  const stocktonCount = Object.values(plan.counts.stockton).reduce((a,b)=>a+b,0);
  const isValidWindow = minutes(plan.end) > minutes(plan.start) + 60;

  function save() {
    if (!validDate) return;
    try { window.localStorage.setItem(key, JSON.stringify(plan)); setSaved(true); }
    catch { setSaved(false); window.alert("This browser could not save the draft. Please print or copy your plan."); }
  }

  return <div className="space-y-6">
    <section className="rounded-3xl border bg-white p-5 shadow-sm md:p-7">
      <h1 className="text-3xl font-bold">Surgical Capacity Planner</h1>
      <p className="mt-2 text-sm text-slate-600">Advisory scheduling guide for Jen and Rachel. Does not book appointments, change clinic records, or enforce limits.</p>
      <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
        <p className="font-semibold">Scheduling commitments</p>
        <p className="mt-1">Safe Haven animals requiring surgery must be included at the next clinic. Stockton TNR is promised six cat spaces for applicable clinics. Initially count unknown-sex cats at 30 minutes, then adjust when reliable sex information becomes available. If required commitments exceed the target, coordinate with the veterinarian rather than postponing Safe Haven animals automatically.</p>
      </div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-semibold">Clinic date<input type="date" value={date} onChange={e=>setDate(e.target.value)} className="mt-2 block w-full rounded-xl border px-3 py-3"/></label>
        <label className="text-sm font-semibold">Veterinarian<select value={plan.veterinarian} onChange={e=>update(p=>({...p,veterinarian:e.target.value,approvedExtra:0}))} className="mt-2 block w-full rounded-xl border px-3 py-3"><option value="Dulce Coulson">Dr. Dulce Coulson</option><option value="Dan Breuer">Dr. Dan Breuer</option><option value="Katie Schneider">Dr. Katie Schneider</option></select></label>
      </div>
      {date && !validDate && <p role="alert" className="mt-3 font-semibold text-red-700">Select a Wednesday or Saturday clinic date.</p>}
      {validDate && loaded && <>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-semibold">Clinic start<input type="time" value={plan.start} onChange={e=>update(p=>({...p,start:e.target.value}))} className="mt-2 block w-full rounded-xl border px-3 py-3"/></label>
          <label className="text-sm font-semibold">{hardStopVet ? "Veterinarian hard stop" : "Estimated clinic end"}<input type="time" value={plan.end} onChange={e=>update(p=>({...p,end:e.target.value}))} className="mt-2 block w-full rounded-xl border px-3 py-3"/></label>
        </div>
        <p className="mt-3 text-sm text-slate-600">{isSat && !hardStopVet ? "Saturday baseline target: 390 surgical minutes. Start and end times are informational for Dulce's standard Saturday target." : "Planning formula: clinic end / veterinarian hard stop minus clinic start minus 60 minutes for drop-offs."}</p>
        {!isValidWindow && <p role="alert" className="mt-2 text-sm font-semibold text-red-700">End time must be more than one hour after clinic start.</p>}
        <div className="mt-5 space-y-4">
          {GROUPS.map(g => <div key={g.key} className="rounded-2xl border p-4">
            <div className="flex items-center justify-between gap-3"><h2 className="font-bold">{g.label}</h2><span className="text-xs text-slate-500">{30 * (plan.counts[g.key].unknown + plan.counts[g.key].spay) + 15 * plan.counts[g.key].neuter} min</span></div>
            <div className="mt-3 grid grid-cols-3 gap-3">
              {(["unknown","spay","neuter"] as const).map(category=><label key={category} className="text-xs font-semibold capitalize">{category === "unknown" ? "Unknown (30m)" : category === "spay" ? "Spay (30m)" : "Neuter (15m)"}<input aria-label={g.label+" "+category} type="number" inputMode="numeric" min="0" max="100" value={plan.counts[g.key][category]} onChange={e=>update(p=>({...p,counts:{...p.counts,[g.key]:{...p.counts[g.key],[category]:safeInteger(Number(e.target.value))}}}))} className="mt-2 block w-full rounded-xl border px-3 py-2 text-base"/></label>)}
            </div>
          </div>)}
        </div>
        {isSat && stocktonCount < 6 && <p role="alert" className="mt-4 rounded-xl bg-amber-50 p-3 text-sm font-semibold text-amber-900">Stockton TNR: {stocktonCount} of 6 promised spaces represented. Check the commitment before confirming the schedule.</p>}
        <label className="mt-5 block text-sm font-semibold">Veterinarian-approved additional minutes (optional)<input type="number" min="0" max="600" value={plan.approvedExtra} onChange={e=>update(p=>({...p,approvedExtra:safeInteger(Number(e.target.value))*1}))} className="mt-2 block w-full rounded-xl border px-3 py-3"/></label>
        <label className="mt-4 block text-sm font-semibold">Scheduling / approval notes<textarea value={plan.notes} onChange={e=>update(p=>({...p,notes:e.target.value.slice(0,2000)}))} rows={3} placeholder="Special cases, veterinary approval, partner requests…" className="mt-2 block w-full rounded-xl border px-3 py-3"/></label>
        <div className="mt-6 rounded-2xl bg-slate-100 p-5">
          <p className="text-sm font-semibold">Planning summary</p>
          <p className="mt-2 text-3xl font-bold">{used} / {target} minutes</p>
          <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-300"><div className={remaining < 0 ? "h-full bg-red-600" : "h-full bg-emerald-600"} style={{width: (target ? Math.min(100,used/target*100) : 100)+"%"}}/></div>
          <p className="mt-3 font-semibold">{remaining < 0 ? Math.abs(remaining)+" minutes over target, veterinarian review recommended" : remaining+" surgical minutes remaining"}</p>
          <p className="mt-1 text-sm text-slate-700">{totalCats} cats planned · {(used/60).toFixed(2)} estimated surgical hours · {Math.floor(Math.max(0,remaining)/30)} additional unknown/spay cats OR {Math.floor(Math.max(0,remaining)/15)} additional neuters</p>
          <p className="mt-2 text-xs text-slate-600">These are alternative possibilities, not additive capacity. Exceeding target is advisory; hard stops still require veterinarian coordination.</p>
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <button onClick={save} className="rounded-full bg-primary px-5 py-3 font-semibold text-white hover:bg-primary/90">{saved ? "Draft saved in this browser" : "Save browser draft"}</button>
          <button onClick={()=>window.print()} className="rounded-full border px-5 py-3 font-semibold">Print / Save PDF</button>
          <button onClick={()=>{if(window.confirm("Reset this date's draft?")){update(()=>makePlan(isSat));}}} className="rounded-full border px-5 py-3 font-semibold">Reset planner</button>
        </div>
        <p className="mt-4 text-xs text-slate-600">Drafts are stored only in this browser on this device, by clinic date. They are not shared between Jen and Rachel or stored in Airtable. Use Print / Save PDF to share a plan. Confirmed appointments remain managed in the existing scheduling system.</p>
      </>}
      {!date && <p className="mt-5 text-sm text-slate-600">Select a clinic date to begin. Wednesday and Saturday use the same adjustable planning tool.</p>}
    </section>
  </div>;
}
