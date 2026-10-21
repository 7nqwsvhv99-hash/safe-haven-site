"use client";

import { useEffect, useState } from "react";

type Group = "stockton" | "alley" | "safe" | "purr" | "public";
type Counts = { spay: number; neuter: number };
type Plan = { counts: Record<Group, Counts>; veterinarian: string; start: string; end: string; approvedExtra: number; bufferMinutes: number; notes: string };
const GROUPS: { key: Group; label: string }[] = [
  { key: "stockton", label: "Stockton TNR" },
  { key: "alley", label: "Alley Cat Project" },
  { key: "safe", label: "Safe Haven" },
  { key: "purr", label: "Purrfection" },
  { key: "public", label: "Privately owned" },
];
const empty = (): Counts => ({ spay: 0, neuter: 0 });
const makePlan = (isSaturday: boolean): Plan => ({
  counts: { stockton: { spay: 0, neuter: 0 }, alley: empty(), safe: empty(), purr: empty(), public: empty() },
  veterinarian: "Dulce Coulson", start: isSaturday ? "08:00" : "10:00", end: isSaturday ? "15:30" : "15:00", approvedExtra: 0, bufferMinutes: isSaturday ? 30 : 15, notes: "",
});
const minutes = (time: string) => { const [h, m] = time.split(":").map(Number); return h * 60 + m; };
const formatClock = (value: string) => {
  if (!/^\d{2}:\d{2}$/.test(value)) return "Not submitted";
  const [h, m] = value.split(":").map(Number);
  if (h > 23 || m > 59) return "Not submitted";
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
};
const dateIsSaturday = (date: string) => new Date(date + "T12:00:00").getDay() === 6;
const dateIsWednesday = (date: string) => new Date(date + "T12:00:00").getDay() === 3;
const safeInteger = (n: number) => Number.isFinite(n) ? Math.max(0, Math.min(100, Math.floor(n))) : 0;

export function SurgicalCapacityPlanner({ vetTimes, clinicDates }: { vetTimes: {date:string; veterinarian:string; start:string; end:string; status:string}[]; clinicDates: {date:string; type:string}[] }) {
  const [date, setDate] = useState("");
  const [vetFilter, setVetFilter] = useState("");
  const [selectionMode, setSelectionMode] = useState<"date" | "vet">("date");
  const [plan, setPlan] = useState<Plan>(() => makePlan(true));
  const [saved, setSaved] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const activeAssignments = vetTimes.filter(t => clinicDates.some(d => d.date === t.date) && t.status !== "Withdrawn");
  const uniqueVets = Array.from(new Set(activeAssignments.map(t => t.veterinarian))).sort();
  const datesForVet = (vet: string) => clinicDates.filter(d => activeAssignments.some(t => t.date === d.date && t.veterinarian === vet));
  const vetsForDate = (d: string) => Array.from(new Set(activeAssignments.filter(t => t.date === d).map(t => t.veterinarian))).sort();
  const visibleDates = selectionMode === "vet" && vetFilter ? datesForVet(vetFilter) : clinicDates.filter(d => vetsForDate(d.date).length > 0);
  const availableVets = date ? vetsForDate(date) : uniqueVets;
  const currentVet = date ? (availableVets.includes(vetFilter) ? vetFilter : (availableVets.length === 1 ? availableVets[0] : "")) : vetFilter;
  const isSat = date ? dateIsSaturday(date) : true;
  const validDate = date && (dateIsWednesday(date) || dateIsSaturday(date));
  const key = "safe-haven-surgical-planner:" + date;
  const selectedClinicType = clinicDates.find(clinic => clinic.date === date)?.type;
  const defaultBuffer = selectedClinicType === "Full Day" ? 30 : 15;

  useEffect(() => {
    if (!date || !validDate) { setLoaded(false); return; }
    // Advisory-only local drafts. No cases, appointments or Airtable records are modified.
    try {
      const previous = window.localStorage.getItem(key);
      if (previous) {
        const parsed = JSON.parse(previous) as Plan;
        if (parsed?.counts && GROUPS.every(g => parsed.counts[g.key])) { setPlan({ ...parsed, veterinarian: currentVet, bufferMinutes: typeof parsed.bufferMinutes === "number" && Number.isFinite(parsed.bufferMinutes) ? Math.max(0, Math.min(120, Math.floor(parsed.bufferMinutes))) : defaultBuffer, counts: Object.fromEntries(GROUPS.map(g => [g.key, { spay: safeInteger(Number(parsed.counts[g.key].spay || 0) + Number((parsed.counts[g.key] as Counts & {unknown?: number}).unknown || 0)), neuter: safeInteger(Number(parsed.counts[g.key].neuter || 0)) }])) as Record<Group, Counts> }); setSaved(true); }
        else { setPlan({ ...makePlan(isSat), veterinarian: currentVet, bufferMinutes: defaultBuffer }); setSaved(false); }
      } else { setPlan({ ...makePlan(isSat), veterinarian: currentVet, bufferMinutes: defaultBuffer }); setSaved(false); }
    } catch { setPlan(makePlan(isSat)); setSaved(false); }
    setLoaded(true);
  }, [date, validDate, isSat, key, defaultBuffer, currentVet]);

  const update = (fn: (p: Plan) => Plan) => { setPlan(fn); setSaved(false); };
  const totalCats = GROUPS.reduce((n, g) => n + Object.values(plan.counts[g.key]).reduce((a,b)=>a+b,0), 0);
  const used = GROUPS.reduce((n, g) => { const c = plan.counts[g.key]; return n + 30 * c.spay + 15 * c.neuter; }, 0);
  const matchingTimes = vetTimes.filter(t => t.date === date && t.veterinarian === currentVet);
  const confirmedTimes = matchingTimes.length === 1 ? matchingTimes[0] : null;
  const hardStopVet = currentVet !== "Dulce Coulson";
  // Always calculate from the veterinarian's submitted hours. Full-day clinic
  // sessions include 60 minutes for drop-offs and 30 minutes for lunch.
  const selectedClinic = clinicDates.find(clinic => clinic.date === date);
  const fullDay = selectedClinic?.type === "Full Day";
  const bufferMinutes = plan.bufferMinutes;
  const baseTarget = !confirmedTimes ? 0 : Math.max(0, minutes(confirmedTimes.end) - minutes(confirmedTimes.start) - 60 - (fullDay ? 30 : 0) - bufferMinutes);
  const target = confirmedTimes ? baseTarget + plan.approvedExtra : 0;
  const remaining = target - used;
  const isValidWindow = Boolean(confirmedTimes && minutes(confirmedTimes.end) > minutes(confirmedTimes.start) + 60);

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
        <p className="mt-1">Safe Haven animals requiring surgery must be included at the next clinic. Stockton TNR is promised six cat spaces at two designated Saturday clinics per month. Count all unknown-sex or known female cats as Spay / Unknown (30 minutes). Count confirmed males as Neuter (15 minutes). If required commitments exceed the target, coordinate with the veterinarian.</p>
      </div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-semibold">Upcoming clinic<select value={date} onChange={e=>{ const next=e.target.value; setSelectionMode("date"); setDate(next); setVetFilter(next && vetsForDate(next).length === 1 ? vetsForDate(next)[0] : ""); }} className="mt-2 block w-full rounded-xl border px-3 py-3"><option value="">Select an upcoming clinic</option>{visibleDates.map(clinic => <option key={clinic.date} value={clinic.date}>{new Intl.DateTimeFormat("en-US", {weekday:"short",month:"short",day:"numeric",year:"numeric",timeZone:"UTC"}).format(new Date(clinic.date+"T12:00:00Z"))} · {clinic.type}</option>)}</select></label>
        <label className="text-sm font-semibold">Veterinarian<select value={currentVet} onChange={e=>{const vet=e.target.value;setSelectionMode("vet");setVetFilter(vet);setDate("");setLoaded(false);setSaved(false);}} className="mt-2 block w-full rounded-xl border px-3 py-3"><option value="">Select a veterinarian</option>{availableVets.map(vet=><option key={vet} value={vet}>Dr. {vet}</option>)}</select></label>
      </div>
      {date && !validDate && <p role="alert" className="mt-3 font-semibold text-red-700">Select a Wednesday or Saturday clinic date.</p>}
      {validDate && loaded && <>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="text-sm font-semibold">Clinic start<div className="mt-2 rounded-xl border bg-slate-50 px-3 py-3">{formatClock(confirmedTimes?.start || "")}</div></div>
          <div className="text-sm font-semibold">{hardStopVet ? "Veterinarian hard stop" : "Clinic end"}<div className="mt-2 rounded-xl border bg-slate-50 px-3 py-3">{formatClock(confirmedTimes?.end || "")}</div></div>
        </div>
        <p className="mt-3 text-sm text-slate-600"><span className="font-semibold">Veterinarian email: </span><a className="text-blue-700 underline" href={"mailto:" + ({"Dan Breuer":"driftlessvetservices@gmail.com","Dulce Coulson":"dulcecoulson@yahoo.com","Katie Schneider":"majerkat14@gmail.com"} as Record<string,string>)[currentVet]}>{({"Dan Breuer":"driftlessvetservices@gmail.com","Dulce Coulson":"dulcecoulson@yahoo.com","Katie Schneider":"majerkat14@gmail.com"} as Record<string,string>)[currentVet]}</a></p>
        <p className="mt-3 text-sm text-slate-600">{fullDay ? "Surgical target = veterinarian-submitted clinic hours minus 60 minutes for drop-offs, 30 minutes for lunch, and the surgical contingency buffer." : "Surgical target = veterinarian-submitted clinic hours minus 60 minutes for drop-offs and the surgical contingency buffer. No lunch deduction for half-day clinics."}</p>
        {!confirmedTimes && <p role="alert" className="mt-2 text-sm font-semibold text-amber-800">No unique veterinarian-submitted time window is linked to this clinic date. Please verify the date and veterinarian in Clinic Staffing. The planner will not assume a start or stop time.</p>}
        {confirmedTimes && !isValidWindow && <p role="alert" className="mt-2 text-sm font-semibold text-red-700">Submitted end time must be more than one hour after clinic start.</p>}
        <div className="mt-5 overflow-hidden rounded-2xl border">
          <div className="grid grid-cols-[minmax(0,1.2fr)_repeat(2,minmax(0,1fr))] gap-2 border-b bg-slate-50 px-3 py-3 text-xs font-semibold text-slate-600 sm:px-5">
            <span>Organization</span><span className="text-center">Spay / Unknown · 30 min</span><span className="text-center">Neuter · 15 min</span>
          </div>
          {GROUPS.map(g => <div key={g.key} className="grid grid-cols-[minmax(0,1.2fr)_repeat(2,minmax(0,1fr))] items-center gap-2 border-b px-3 py-3 last:border-b-0 sm:px-5">
            <span className="text-sm font-semibold">{g.label}</span>
            {(["spay","neuter"] as const).map(category => <div key={category} className="flex items-center justify-center gap-1">
              <button type="button" aria-label={"Remove "+g.label+" "+category} disabled={plan.counts[g.key][category]===0} onClick={()=>update(p=>({...p,counts:{...p.counts,[g.key]:{...p.counts[g.key],[category]:Math.max(0,p.counts[g.key][category]-1)}}}))} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-lg disabled:opacity-30" >−</button>
              <output aria-label={g.label+" "+category+" count"} className="min-w-5 text-center text-sm font-semibold tabular-nums">{plan.counts[g.key][category]}</output>
              <button type="button" aria-label={"Add "+g.label+" "+category} onClick={()=>update(p=>({...p,counts:{...p.counts,[g.key]:{...p.counts[g.key],[category]:Math.min(100,p.counts[g.key][category]+1)}}}))} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-lg">+</button>
            </div>)}
          </div>)}
        </div>
        <div className="mt-4 rounded-2xl bg-slate-100 p-5" aria-live="polite">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-2xl font-bold tabular-nums">{used} / {target} min</p>
            <p className={remaining < 0 ? "font-semibold text-red-700" : "font-semibold text-emerald-800"}>{remaining < 0 ? Math.abs(remaining)+" min over target" : remaining+" min available"}</p>
          </div>
          <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-300"><div className={remaining < 0 ? "h-full bg-red-600 transition-all duration-200" : "h-full bg-emerald-600 transition-all duration-200"} style={{width: (target ? Math.min(100,used/target*100) : 100)+"%"}}/></div>
          <p className="mt-2 text-sm text-slate-700">{totalCats} cats planned · {(used/60).toFixed(2)} surgical hours</p>
          {remaining < 0 && <p className="mt-2 text-sm font-medium text-red-700">Advisory: review additional workload with the veterinarian. Hard stops remain in effect.</p>}
        </div>
        <label className="mt-5 block text-sm font-semibold">Surgical contingency buffer (minutes)<input type="number" inputMode="numeric" min="0" max="120" value={bufferMinutes} onChange={e=>update(p=>({...p,bufferMinutes:Math.max(0,Math.min(120,Math.floor(Number(e.target.value)||0)))}))} className="mt-2 block w-28 max-w-full rounded-xl border px-3 py-2.5 text-base" aria-label="Surgical contingency buffer in minutes"/></label>
        <p className="mt-2 text-xs text-slate-600">Default: 30 minutes for full-day clinics, 15 minutes for half-day clinics. Reserved for unexpected surgical complexity or delays, not additional scheduled procedures.</p>
        <label className="mt-5 block text-sm font-semibold">Veterinarian-approved additional minutes (optional)<input type="number" inputMode="numeric" min="0" max="600" placeholder="0" value={plan.approvedExtra === 0 ? "" : plan.approvedExtra} onChange={e=>update(p=>({...p,approvedExtra:e.target.value === "" ? 0 : Math.min(600,safeInteger(Number(e.target.value)))}))} className="mt-2 block w-28 max-w-full rounded-xl border px-3 py-2.5 text-base" aria-label="Veterinarian-approved additional minutes"/></label>
        <label className="mt-4 block text-sm font-semibold">Scheduling / approval notes<textarea value={plan.notes} onChange={e=>update(p=>({...p,notes:e.target.value.slice(0,2000)}))} rows={3} placeholder="Special cases, veterinary approval, partner requests…" className="mt-2 block w-full rounded-xl border px-3 py-3"/></label>
        <div className="mt-5 flex flex-wrap gap-3">
          <button onClick={save} className="rounded-full bg-primary px-5 py-3 font-semibold text-white hover:bg-primary/90">{saved ? "Draft saved in this browser" : "Save browser draft"}</button>
          <button onClick={()=>window.print()} className="rounded-full border px-5 py-3 font-semibold">Print / Save PDF</button>
          <button onClick={()=>{if(window.confirm("Reset this date's draft?")){update(()=>({ ...makePlan(isSat), veterinarian: currentVet, bufferMinutes: defaultBuffer }));}}} className="rounded-full border px-5 py-3 font-semibold">Reset planner</button>
        </div>
        <p className="mt-4 text-xs text-slate-600">Drafts are stored only in this browser on this device, by clinic date. They are not shared between Jen and Rachel or stored in Airtable. Use Print / Save PDF to share a plan. Confirmed appointments remain managed in the existing scheduling system.</p>
      </>}
      {!date && <p className="mt-5 text-sm text-slate-600">Select a clinic date to begin. Wednesday and Saturday use the same adjustable planning tool.</p>}
    </section>
  </div>;
}
