"use client";

import { useState } from "react";

type AnimalOption = { id: string; label: string; species: string };
type LocationOption = { id: string; name: string; type: string; capacity: number | null; occupancy: number };

const SHARED_TYPES = new Set(["Isolation", "Medical", "Recovery", "Other"]);

export default function MoveAnimalForm({
  action,
  animals,
  locations,
}: {
  action: (formData: FormData) => void | Promise<void>;
  animals: AnimalOption[];
  locations: LocationOption[];
}) {
  const [animalId, setAnimalId] = useState("");
  const animal = animals.find((option) => option.id === animalId);
  const species = animal?.species.toLowerCase();
  const isDog = species === "dog" || species === "dogs";
  const compatibleLocations = locations.filter((location) => {
    const dogIsolationKennel = location.type === "Isolation" && /kennel/i.test(location.name);
    if (dogIsolationKennel) return isDog;
    if (SHARED_TYPES.has(location.type)) return true;
    if (species === "cat" || species === "cats") return ["Cat Condo", "Cat Room"].includes(location.type);
    if (isDog) return location.type === "Dog Kennel";
    return false;
  });

  return (
    <form action={action} className="grid gap-4 md:grid-cols-[1fr_1fr_auto]">
      <select name="animalId" required value={animalId} onChange={(event) => setAnimalId(event.target.value)} className="rounded-xl border bg-white px-3 py-2.5">
        <option value="" disabled>Select animal</option>
        {animals.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
      </select>
      <select name="locationId" required defaultValue="" className="rounded-xl border bg-white px-3 py-2.5">
        <option value="" disabled>Select a room, condo, kennel, or care location</option>
        {compatibleLocations.map((location) => <option key={location.id} value={location.id}>{location.name}{location.capacity !== null ? ` · ${location.occupancy}/${location.capacity}` : ""}</option>)}
      </select>
      {animal && (isDog ? (
        <label className="flex items-center gap-2 text-sm text-muted-foreground md:col-span-2">
          <input type="checkbox" name="allowBondedSharing" value="yes" className="h-4 w-4 accent-orange-500" />
          Share only with this dog&apos;s linked bonded companion, when beneficial
        </label>
      ) : <p className="text-sm text-muted-foreground md:col-span-2">Cats keep both their condo and room assignments. Selecting a new room preserves the condo, and selecting a new condo preserves the room.</p>)}
      <button className="rounded-xl bg-primary px-5 py-2.5 font-semibold text-white">Move</button>
    </form>
  );
}
