"use client";

import { Search, X } from "lucide-react";
import { useEffect, useState } from "react";

export function ShelterInventorySearch() {
  const [query,setQuery]=useState("");
  const [visibleCount,setVisibleCount]=useState<number|null>(null);

  useEffect(()=>{
    const normalized=query.trim().toLowerCase();
    const items=Array.from(document.querySelectorAll<HTMLElement>("[data-shelter-inventory-item]"));
    const groups=Array.from(document.querySelectorAll<HTMLDetailsElement>("[data-shelter-inventory-category]"));
    let visible=0;

    items.forEach(item=>{
      const searchable=(item.dataset.inventorySearch||"").toLowerCase();
      const matches=!normalized||searchable.includes(normalized);
      item.hidden=!matches;
      if(matches) visible+=1;
    });

    groups.forEach(group=>{
      const groupItems=Array.from(group.querySelectorAll<HTMLElement>("[data-shelter-inventory-item]"));
      const hasMatch=groupItems.some(item=>!item.hidden);
      group.hidden=normalized?!hasMatch:false;
      if(normalized&&hasMatch) group.open=true;
      if(!normalized) group.open=false;
    });

    setVisibleCount(visible);
  },[query]);

  return <div className="mt-5">
    <label htmlFor="shelter-inventory-search" className="sr-only">Search shelter inventory</label>
    <div className="relative">
      <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/>
      <input id="shelter-inventory-search" type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search inventory" autoComplete="off" className="w-full rounded-2xl border bg-white py-3 pl-10 pr-11 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"/>
      {query&&<button type="button" onClick={()=>setQuery("")} aria-label="Clear inventory search" className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:bg-slate-100 hover:text-foreground"><X className="h-4 w-4"/></button>}
    </div>
    {query&&visibleCount===0&&<p className="mt-3 text-sm text-muted-foreground">No inventory items match “{query}”.</p>}
  </div>;
}
