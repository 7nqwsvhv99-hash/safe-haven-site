"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";

export default function AddAnimalPlacementGate({ children }: { children: ReactNode }) {
  const [placementPath, setPlacementPath] = useState("");

  return (
    <div className="space-y-6">
      <fieldset className="rounded-2xl border bg-slate-50 p-5">
        <legend className="px-1 text-lg font-semibold">Where will this animal go after intake?</legend>
        <p className="mb-4 text-sm text-muted-foreground">Choose one placement path to continue.</p>
        <div className="grid gap-3 md:grid-cols-2">
          <label className={`flex cursor-pointer gap-3 rounded-xl border bg-white p-4 transition ${placementPath === "shelter" ? "border-primary ring-2 ring-primary/20" : "hover:border-slate-400"}`}>
            <input
              type="radio"
              name="placementPath"
              value="shelter"
              required
              checked={placementPath === "shelter"}
              onChange={() => setPlacementPath("shelter")}
              className="mt-1 h-5 w-5 accent-orange-500"
            />
            <span>
              <span className="block font-semibold">Shelter care</span>
              <span className="mt-1 block text-sm text-muted-foreground">The animal will enter the shelter and be housed here.</span>
            </span>
          </label>
          <label className={`flex cursor-pointer gap-3 rounded-xl border bg-white p-4 transition ${placementPath === "foster" ? "border-primary ring-2 ring-primary/20" : "hover:border-slate-400"}`}>
            <input
              type="radio"
              name="placementPath"
              value="direct-to-foster"
              required
              checked={placementPath === "foster"}
              onChange={() => setPlacementPath("foster")}
              className="mt-1 h-5 w-5 accent-orange-500"
            />
            <span>
              <span className="block font-semibold">Directly to a foster home</span>
              <span className="mt-1 block text-sm text-muted-foreground">The animal will go to an approved foster without first staying at the shelter.</span>
            </span>
          </label>
        </div>
      </fieldset>

      {placementPath === "shelter" ? (
        <div className="space-y-8">{children}</div>
      ) : placementPath === "foster" ? (
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5" role="status">
          <h3 className="font-semibold">Continue in Intake &amp; Owner Surrender</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            That workflow records the animal’s intake, lets you choose the approved foster, and creates the linked foster placement.
            No animal record has been created yet.
          </p>
          <Link href="/portal/staff/intake" className="mt-4 inline-flex items-center justify-center rounded-full bg-primary px-5 py-2.5 font-semibold text-white hover:opacity-90">
            Go to Intake &amp; Owner Surrender
          </Link>
        </div>
      ) : (
        <p className="rounded-xl bg-slate-50 p-4 text-sm text-muted-foreground">Select a placement path above to open the matching intake form.</p>
      )}
    </div>
  );
}
