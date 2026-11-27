"use client";

import { useState } from "react";

const LOCATION_TYPES = ["Cat Room", "Cat Condo", "Dog Kennel", "Isolation", "Medical", "Recovery", "Other"];

type HousingLocation = {
  id: string;
  name: string;
  type: string;
  capacity: string;
  notes: string;
  active: boolean;
  occupied: boolean;
};

type Props = {
  locations: HousingLocation[];
  createAction: (formData: FormData) => void | Promise<void>;
  updateAction: (formData: FormData) => void | Promise<void>;
};

export default function HousingLocationManager({ locations, createAction, updateAction }: Props) {
  const [selectedId, setSelectedId] = useState("");
  const selected = locations.find((location) => location.id === selectedId);

  return (
    <div className="space-y-4 rounded-2xl bg-slate-50 p-5">
      <label className="block text-sm font-medium">
        Add or update housing location
        <select
          value={selectedId}
          onChange={(event) => setSelectedId(event.target.value)}
          className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5"
        >
          <option value="">Add a new location</option>
          {locations.map((location) => (
            <option key={location.id} value={location.id}>
              {location.name} · {location.active ? "Active" : "Inactive"}
            </option>
          ))}
        </select>
      </label>

      {selected ? (
        <form key={selected.id} action={updateAction} className="space-y-4">
          <input type="hidden" name="locationId" value={selected.id} />
          <label className="block text-sm font-medium">Location name<input name="name" defaultValue={selected.name} required className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5" /></label>
          <label className="block text-sm font-medium">Location type<select name="type" defaultValue={selected.type} required className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5">{LOCATION_TYPES.map((value) => <option key={value}>{value}</option>)}</select></label>
          <label className="block text-sm font-medium">Capacity<input name="capacity" type="number" min="0" step="1" defaultValue={selected.capacity} className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5" /></label>
          <label className="block text-sm font-medium">Notes<textarea name="notes" rows={2} defaultValue={selected.notes} className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5" /></label>
          {selected.occupied && <input type="hidden" name="active" value="on" />}
          <label className="flex items-center gap-2 text-sm"><input name="active" type="checkbox" defaultChecked={selected.active} disabled={selected.occupied} className="h-4 w-4 accent-orange-500" />Active location</label>
          {selected.occupied && <p className="text-xs text-muted-foreground">Move all animals out before deactivating this location.</p>}
          <button className="rounded-full border border-primary px-5 py-2.5 font-semibold text-primary">Save Location</button>
        </form>
      ) : (
        <form action={createAction} className="space-y-4">
          <label className="block text-sm font-medium">Location name<input name="name" required className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5" /></label>
          <label className="block text-sm font-medium">Location type<select name="type" required defaultValue="" className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5"><option value="" disabled>Select type</option>{LOCATION_TYPES.map((value) => <option key={value}>{value}</option>)}</select></label>
          <label className="block text-sm font-medium">Capacity<input name="capacity" type="number" min="0" step="1" className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5" /></label>
          <label className="block text-sm font-medium">Notes<textarea name="notes" rows={2} className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5" /></label>
          <button className="rounded-full border border-primary px-5 py-2.5 font-semibold text-primary">Add Housing Location</button>
        </form>
      )}
    </div>
  );
}
