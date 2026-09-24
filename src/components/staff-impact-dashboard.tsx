"use client";

import { useEffect, useState } from "react";

type CommunityImpact = {
  year:number; foodPounds:string; surgeries:number; adoptions:number; cats:number; dogs:number; veterinarySavingsDisplay:string|null;
};
type ClinicImpact = {
  year:number; clinicDays:number; animalsServed:number; surgeries:number; servicesProvided:number;
  rabiesVaccines:number; safeHavenCostsAvoided:number; communitySavings:number; towns:number; counties:number; states:number;
};

function money(value:number){return new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:0}).format(value)}

export function StaffImpactDashboard(){
  const [community,setCommunity]=useState<CommunityImpact|null>(null);
  const [clinic,setClinic]=useState<ClinicImpact|null>(null);

  useEffect(()=>{
    Promise.all([
      fetch("/api/community-impact",{cache:"no-store"}).then(r=>r.ok?r.json():null),
      fetch("/api/clinic-impact",{cache:"no-store"}).then(r=>r.ok?r.json():null),
    ]).then(([communityData,clinicData])=>{
      setCommunity(communityData);
      setClinic(clinicData);
    }).catch(()=>{});
  },[]);

  return <section className="rounded-3xl border bg-white p-6 shadow-sm md:p-8">
    <h2 className="text-2xl font-bold">Community & Clinic Impact</h2>
    <p className="mt-2 text-sm text-muted-foreground">Uses the same reconciled reporting logic that powers Safe Haven's public impact displays.</p>
    <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {community&&<>
        <div className="rounded-2xl bg-slate-50 p-5"><p className="text-3xl font-bold">{community.adoptions}</p><p className="mt-1 text-sm text-muted-foreground">{community.year} adoptions</p></div>
        <div className="rounded-2xl bg-slate-50 p-5"><p className="text-3xl font-bold">{community.foodPounds}</p><p className="mt-1 text-sm text-muted-foreground">Food pounds distributed</p></div>
      </>}
      {clinic&&<>
        <div className="rounded-2xl bg-slate-50 p-5"><p className="text-3xl font-bold">{clinic.animalsServed}</p><p className="mt-1 text-sm text-muted-foreground">{clinic.year} clinic animals served</p></div>
        <div className="rounded-2xl bg-slate-50 p-5"><p className="text-3xl font-bold">{clinic.surgeries}</p><p className="mt-1 text-sm text-muted-foreground">Completed surgeries</p></div>
        <div className="rounded-2xl bg-slate-50 p-5"><p className="text-3xl font-bold">{clinic.servicesProvided}</p><p className="mt-1 text-sm text-muted-foreground">Services provided</p></div>
        <div className="rounded-2xl bg-slate-50 p-5"><p className="text-3xl font-bold">{money(clinic.communitySavings)}</p><p className="mt-1 text-sm text-muted-foreground">Community veterinary savings</p></div>
        <div className="rounded-2xl bg-slate-50 p-5"><p className="text-3xl font-bold">{clinic.towns}</p><p className="mt-1 text-sm text-muted-foreground">Towns reached</p></div>
        <div className="rounded-2xl bg-slate-50 p-5"><p className="text-3xl font-bold">{clinic.counties}</p><p className="mt-1 text-sm text-muted-foreground">Counties reached</p></div>
      </>}
      {!community&&!clinic&&<p className="text-sm text-muted-foreground">Impact metrics are loading or temporarily unavailable.</p>}
    </div>
  </section>
}