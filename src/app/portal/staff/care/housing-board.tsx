"use client";

import { useState } from "react";
import Link from "next/link";
import { BedDouble, MapPin } from "lucide-react";

type Occupant = {
  id: string;
  petName: string;
  animalId: string;
  species: string;
};

type HousingLocation = {
  id: string;
  name: string;
  type: string;
  capacity: number | null;
  notes: string;
  occupants: Occupant[];
};

const SHARED_TYPES = new Set(["Isolation", "Medical", "Recovery", "Other"]);

export default function HousingBoard({ locations }: { locations: HousingLocation[] }) {
  const [species, setSpecies] = useState<"Cat" | "Dog">("Cat");

  const visibleLocations = locations.filter((location) => {
    if (SHARED_TYPES.has(location.type)) return true;
    if (species === "Cat") return ["Cat Condo", "Cat Room"].includes(location.type);
    return location.type === "Dog Kennel";
  });

  const locationsWithOccupants = visibleLocations.map((location) => ({
    ...location,
    occupants: location.occupants.filter((animal) => {
      const animalSpecies = animal.species.trim().toLowerCase();
      return species === "Cat"
        ? ["cat", "cats"].includes(animalSpecies)
        : ["dog", "dogs"].includes(animalSpecies);
    }),
  }));

  return (
    <>
      <div className="mb-5 inline-flex rounded-full border bg-slate-50 p-1" role="group" aria-label="Filter housing by animal type">
        {(["Cat", "Dog"] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setSpecies(option)}
            aria-pressed={species === option}
            className={`rounded-full px-5 py-2 text-sm font-semibold transition-colors ${species === option ? "bg-primary text-white shadow-sm" : "text-slate-700 hover:bg-white"}`}
          >
            {option === "Cat" ? "Cats" : "Dogs"}
          </button>
        ))}
      </div>

      {visibleLocations.length === 0 ? (
        <p className="rounded-2xl bg-slate-50 p-5 text-sm text-muted-foreground">
          No {species.toLowerCase()} housing locations are set up yet.
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {locationsWithOccupants.map((location) => {
            const full = location.capacity !== null && location.occupants.length >= location.capacity;
            return (
              <article key={location.id} className="rounded-2xl border p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-bold">{location.name}</h3>
                    <p className="mt-1 text-xs text-muted-foreground">{location.type}</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${full ? "bg-amber-100 text-amber-900" : "bg-slate-100"}`}>
                    {location.occupants.length}{location.capacity !== null ? ` / ${location.capacity}` : ""}
                  </span>
                </div>
                <div className="mt-4 space-y-2">
                  {location.occupants.map((animal) => (
                    <Link
                      key={animal.id}
                      href={`/portal/staff/animals/${animal.id}`}
                      className="block rounded-xl bg-slate-50 px-3 py-2 text-sm hover:bg-slate-100"
                    >
                      <strong>{animal.petName || "Animal"}</strong>
                      {animal.animalId && <span className="ml-2 text-muted-foreground">{animal.animalId}</span>}
                    </Link>
                  ))}
                  {!location.occupants.length && <p className="text-sm text-muted-foreground">No {species.toLowerCase()} assigned.</p>}
                </div>
                {location.notes && <p className="mt-4 text-sm text-muted-foreground">{location.notes}</p>}
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}
