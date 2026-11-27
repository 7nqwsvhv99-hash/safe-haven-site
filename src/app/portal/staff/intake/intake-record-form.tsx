"use client";

import { useState } from "react";

type Option = { id: string; label: string; details?: string };
type Defaults = {
  requestId?: string;
  petName?: string;
  species?: string;
  sex?: string;
  breed?: string;
  source?: string;
  sourcePhone?: string;
  sourceEmail?: string;
  intakeNotes?: string;
  intakeDate?: string;
};

const inputClass = "mt-2 w-full rounded-xl border bg-white px-3 py-2.5";

export default function IntakeRecordForm({
  action,
  animals,
  fosters,
  locations,
  defaults = {},
}: {
  action: (formData: FormData) => void | Promise<void>;
  animals: Option[];
  fosters: Option[];
  locations: Option[];
  defaults?: Defaults;
}) {
  const [animalId, setAnimalId] = useState("");
  const [placement, setPlacement] = useState("");
  const isSurrender = Boolean(defaults.requestId);

  return (
    <form action={action} className="space-y-7">
      {defaults.requestId && <input type="hidden" name="requestId" value={defaults.requestId} />}

      <section className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold">1. Intake type</h3>
          <p className="mt-1 text-sm text-muted-foreground">{isSurrender ? "This approved request will be recorded as an owner surrender." : "Choose why the animal is entering Safe Haven care."}</p>
        </div>
        {isSurrender ? (
          <input type="hidden" name="intakeType" value="Owner Surrender" />
        ) : (
          <label className="block text-sm font-medium">Entry type
            <select name="intakeType" defaultValue="" required className={inputClass}>
              <option value="" disabled>Select entry type</option>
              {["Stray", "Transfer In", "Adoption Return", "Born in Care", "Other"].map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
        )}
      </section>

      <section className="space-y-4 border-t pt-6">
        <div>
          <h3 className="text-lg font-semibold">2. Animal record</h3>
          <p className="mt-1 text-sm text-muted-foreground">Link an animal already in the directory, or enter a new animal’s details below.</p>
        </div>
        <label className="block text-sm font-medium">Find an existing animal, if one is already listed
          <select name="existingAnimalId" value={animalId} onChange={(event) => setAnimalId(event.target.value)} className={inputClass}>
            <option value="">Create a new animal record</option>
            {animals.map((animal) => <option key={animal.id} value={animal.id}>{animal.label}</option>)}
          </select>
        </label>
        {animalId && <p className="rounded-xl bg-slate-50 p-4 text-sm text-muted-foreground"><strong className="text-foreground">Selected animal:</strong> {animals.find((animal) => animal.id === animalId)?.details || animals.find((animal) => animal.id === animalId)?.label}. The existing animal record will be linked to this intake, and its animal details will not be recreated.</p>}
        {!animalId && (
          <div className="rounded-2xl bg-slate-50 p-5">
            <h4 className="font-semibold">New animal details</h4>
            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <label className="text-sm font-medium">Pet name<input name="petName" required defaultValue={defaults.petName} className={inputClass} /></label>
              <label className="text-sm font-medium">Species<select name="species" required defaultValue={defaults.species || ""} className={inputClass}><option value="" disabled>Select species</option><option>Cat</option><option>Dog</option></select></label>
              <label className="text-sm font-medium">Sex<select name="sex" defaultValue={defaults.sex || "Unknown"} className={inputClass}><option>Female</option><option>Male</option><option>Unknown</option></select></label>
              <label className="text-sm font-medium">Date of birth, if known<input name="dateOfBirth" type="date" className={inputClass} /></label>
              <label className="text-sm font-medium">Estimated date of birth, if exact date is unknown<input name="estimatedDateOfBirth" type="date" className={inputClass} /><span className="mt-1 block text-xs text-muted-foreground">Enter one birth date. Leave blank if unknown.</span></label>
              <label className="text-sm font-medium">Breed<input name="breed" defaultValue={defaults.breed} className={inputClass} /></label>
              <label className="text-sm font-medium">Color / markings<input name="color" className={inputClass} /></label>
              <label className="text-sm font-medium">Microchip number<input name="microchipNumber" className={inputClass} /></label>
              <label className="text-sm font-medium">Microchip registration<select name="microchipStatus" defaultValue="Unknown" className={inputClass}>{["No Microchip", "Needs Registration", "Registered to Safe Haven", "Transferred to Adopter", "Unknown"].map((item) => <option key={item}>{item}</option>)}</select></label>
            </div>
          </div>
        )}
      </section>

      <section className="space-y-4 border-t pt-6">
        <div>
          <h3 className="text-lg font-semibold">3. Where will this animal go after intake?</h3>
          <p className="mt-1 text-sm text-muted-foreground">Choose one placement. The matching fields will appear below.</p>
        </div>
        <fieldset className="grid gap-3 md:grid-cols-2">
          <legend className="sr-only">Choose the animal’s initial placement</legend>
          {[
            ["shelter", "Shelter care", "The animal will stay at Safe Haven."],
            ["foster", "Directly to a foster home", "The animal will go to an approved foster without first staying at the shelter."],
          ].map(([value, label, description]) => (
            <label key={value} className={`flex cursor-pointer gap-3 rounded-xl border bg-white p-4 transition ${placement === value ? "border-primary ring-2 ring-primary/20" : "hover:border-slate-400"}`}>
              <input type="radio" name="placementPath" value={value} required checked={placement === value} onChange={() => setPlacement(value)} className="mt-1 h-5 w-5 accent-orange-500" />
              <span><span className="block font-semibold">{label}</span><span className="mt-1 block text-sm text-muted-foreground">{description}</span></span>
            </label>
          ))}
        </fieldset>
        {placement === "shelter" && (
          <label className="block max-w-xl text-sm font-medium">Shelter location
            <select name="housingLocationId" required defaultValue="" className={inputClass}>
              <option value="" disabled>Select the kennel, condo, room, or other location</option>
              {locations.map((location) => <option key={location.id} value={location.id}>{location.label}</option>)}
            </select>
          </label>
        )}
        {placement === "foster" && (
          <div className="rounded-2xl bg-primary/5 p-5">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block text-sm font-medium">Approved foster home
                <select name="fosterApplicationId" required defaultValue="" className={inputClass}><option value="" disabled>Select an approved foster</option>{fosters.map((foster) => <option key={foster.id} value={foster.id}>{foster.label}</option>)}</select>
              </label>
              <label className="block text-sm font-medium">Placement type
                <select name="placementType" defaultValue="Other" className={inputClass}>{["Bottle Babies", "Pregnant Mom", "Nursing Mom with Litter", "Orphaned Litter", "Kitten / Puppy", "Adult Animal", "Medical", "Behavior Support", "Short-Term / Emergency", "Other"].map((item) => <option key={item}>{item}</option>)}</select>
              </label>
              <label className="block text-sm font-medium">Next check-in date, if scheduled<input name="nextCheckInDate" type="date" className={inputClass} /></label>
              <label className="block text-sm font-medium md:col-span-2">Foster care instructions, if needed<textarea name="careInstructions" rows={2} className={inputClass} /></label>
            </div>
          </div>
        )}
      </section>

      <section className="space-y-4 border-t pt-6">
        <div>
          <h3 className="text-lg font-semibold">4. Intake details</h3>
          <p className="mt-1 text-sm text-muted-foreground">Record the intake date, observed condition, source, and relevant notes.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <label className="block text-sm font-medium">Intake date<input name="intakeDate" type="date" required defaultValue={defaults.intakeDate} className={inputClass} /></label>
          <label className="block text-sm font-medium">Weight at intake (lb)<input name="intakeWeight" type="number" min="0" step="0.1" className={inputClass} /><span className="mt-1 block text-xs text-muted-foreground">Used as the animal’s starting current weight.</span></label>
          <label className="block text-sm font-medium">Observed condition at intake<select name="condition" defaultValue="Unable to assess" className={inputClass}>{["Stable, no concern observed", "Minor concern, routine review", "Illness or injury, veterinary review needed", "Urgent concern, immediate veterinary review", "Unable to assess"].map((item) => <option key={item}>{item}</option>)}</select></label>
        </div>
        <p className="text-xs text-muted-foreground">Choose the closest observed level, then record specific signs in the notes. Do not enter a diagnosis.</p>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <label className="block text-sm font-medium">Source person / organization<input name="source" defaultValue={defaults.source} className={inputClass} /></label>
          <label className="block text-sm font-medium">Source phone<input name="sourcePhone" type="tel" defaultValue={defaults.sourcePhone} className={inputClass} /></label>
          <label className="block text-sm font-medium">Source email<input name="sourceEmail" type="email" defaultValue={defaults.sourceEmail} className={inputClass} /></label>
          <label className="block text-sm font-medium">Found / origin location<input name="origin" className={inputClass} /></label>
        </div>
        <label className="block text-sm font-medium">Care, safety, or placement notes<textarea name="intakeNotes" rows={4} defaultValue={defaults.intakeNotes} className={inputClass} /></label>
      </section>

      <button type="submit" className="rounded-full bg-primary px-6 py-3 font-semibold text-white shadow-sm hover:opacity-90">Record intake</button>
    </form>
  );
}
