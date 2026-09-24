import Link from "next/link";
import { revalidatePath } from "next/cache";
import {
  AlertTriangle,
  ArrowLeft,
  BedDouble,
  ClipboardCheck,
  HeartPulse,
  MapPin,
  Plus,
} from "lucide-react";
import {
  airtableCreate,
  airtableList,
  airtableUpdate,
  airtableUploadAttachment,
  asStrings,
  asText,
  requirePortalRole,
  TABLES,
} from "@/lib/portal";

const CARE_PHOTO_FIELD_ID = "fldr0uzypmyE1XdAK";

function asNumber(value: unknown) {
  return typeof value === "number" ? value : null;
}

function field(form: FormData, name: string) {
  return String(form.get(name) || "").trim();
}

function optionalNumber(form: FormData, name: string) {
  const value = field(form, name);
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function formatDateTime(value: unknown) {
  const text = asText(value);
  if (!text) return "Date not recorded";
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return text;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Chicago",
  }).format(date);
}

export default async function CareAndHousingPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const context = await requirePortalRole("Staff");
  const notice = await searchParams;

  const [animals, locations, care] = await Promise.all([
    airtableList(
      TABLES.animals,
      [
        "Animal ID",
        "Pet Name",
        "Species",
        "Adoption Status",
        "Housing Type",
        "Current Housing Location",
        "Primary Photo",
      ],
      { sort: [{ field: "Pet Name", direction: "asc" }] }
    ),
    airtableList(
      TABLES.housingLocations,
      ["Location Name", "Location Type", "Capacity", "Active", "Notes", "Animals"],
      { sort: [{ field: "Location Name", direction: "asc" }] }
    ),
    airtableList(
      TABLES.dailyCare,
      [
        "Animal",
        "Date / Time",
        "Care Type",
        "Housing Location",
        "Completed By",
        "Alert Level",
        "Follow-Up Needed",
        "Follow-Up Date",
        "Weight (lb)",
        "Notes / Observation",
        "Photo / Attachment",
        "Follow-Up Status",
      ],
      { sort: [{ field: "Date / Time", direction: "desc" }] }
    ),
  ]);

  const animalById = new Map(animals.map((record) => [record.id, record]));
  const locationById = new Map(locations.map((record) => [record.id, record]));
  const activeAnimals = animals.filter((record) => asText(record.fields["Adoption Status"]) !== "Adopted");
  const inShelter = activeAnimals.filter((record) => asText(record.fields["Housing Type"]) === "In Shelter");
  const unassigned = inShelter.filter((record) => asStrings(record.fields["Current Housing Location"]).length === 0);

  const occupancyByLocation = new Map<string, number>();
  for (const animal of inShelter) {
    for (const locationId of asStrings(animal.fields["Current Housing Location"])) {
      occupancyByLocation.set(locationId, (occupancyByLocation.get(locationId) || 0) + 1);
    }
  }

  const openAlerts = care.filter((record) => {
    const level = asText(record.fields["Alert Level"]);
    const status = asText(record.fields["Follow-Up Status"]);
    return (
      ["Needs Attention", "Urgent"].includes(level) ||
      (Boolean(record.fields["Follow-Up Needed"]) && !["Completed"].includes(status))
    );
  });

  async function createLocation(formData: FormData) {
    "use server";
    await requirePortalRole("Staff");
    const name = field(formData, "name");
    const type = field(formData, "type");
    if (!name || !type) return;

    await airtableCreate(
      TABLES.housingLocations,
      {
        "Location Name": name,
        "Location Type": type,
        ...(optionalNumber(formData, "capacity") !== undefined
          ? { Capacity: optionalNumber(formData, "capacity") }
          : {}),
        Active: true,
        ...(field(formData, "notes") ? { Notes: field(formData, "notes") } : {}),
      },
      true
    );

    revalidatePath("/portal/staff/care");
    revalidatePath("/portal/staff/animals");
  }

  async function updateLocation(formData: FormData) {
    "use server";
    await requirePortalRole("Staff");
    const id = field(formData, "locationId");
    const latest = await airtableList(TABLES.housingLocations, ["Location Name"]);
    if (!latest.some((record) => record.id === id)) return;

    await airtableUpdate(
      TABLES.housingLocations,
      id,
      {
        "Location Name": field(formData, "name"),
        "Location Type": field(formData, "type"),
        Capacity: optionalNumber(formData, "capacity") ?? null,
        Active: formData.get("active") === "on",
        Notes: field(formData, "notes"),
      },
      true
    );

    revalidatePath("/portal/staff/care");
    revalidatePath("/portal/staff/animals");
  }

  async function moveAnimal(formData: FormData) {
    "use server";
    await requirePortalRole("Staff");
    const animalId = field(formData, "animalId");
    const locationId = field(formData, "locationId");

    const [latestAnimals, latestLocations] = await Promise.all([
      airtableList(TABLES.animals, ["Pet Name", "Housing Type", "Current Housing Location", "Adoption Status"]),
      airtableList(TABLES.housingLocations, ["Location Name", "Capacity", "Active"]),
    ]);

    const animal = latestAnimals.find((record) => record.id === animalId);
    if (!animal) return;

    if (!locationId) {
      await airtableUpdate(TABLES.animals, animalId, {
        "Housing Type": "In Shelter",
        "Current Housing Location": [],
      }, true);
    } else {
      const location = latestLocations.find((record) => record.id === locationId && Boolean(record.fields.Active));
      if (!location) return;

      const occupants = latestAnimals.filter((record) =>
        asStrings(record.fields["Current Housing Location"]).includes(locationId) &&
        record.id !== animalId &&
        asText(record.fields["Adoption Status"]) !== "Adopted"
      ).length;
      const capacity = asNumber(location.fields.Capacity);
      if (capacity !== null && occupants >= capacity) return;

      await airtableUpdate(TABLES.animals, animalId, {
        "Housing Type": "In Shelter",
        "Current Housing Location": [locationId],
      }, true);
    }

    revalidatePath("/portal/staff/care");
    revalidatePath("/portal/staff/animals");
    revalidatePath(`/portal/staff/animals/${animalId}`);
  }

  async function recordCare(formData: FormData) {
    "use server";
    const current = await requirePortalRole("Staff");
    const animalId = field(formData, "animalId");
    const careType = field(formData, "careType");
    if (!animalId || !careType) return;

    const latestAnimals = await airtableList(
      TABLES.animals,
      ["Pet Name", "Current Housing Location", "Adoption Status", "Weight (lb)"]
    );
    const animal = latestAnimals.find((record) => record.id === animalId);
    if (!animal) return;

    const selectedLocation = field(formData, "housingLocation");
    const currentLocation = asStrings(animal.fields["Current Housing Location"])[0] || "";
    const alertLevel = field(formData, "alertLevel") || "Normal";
    const followUpNeeded = formData.get("followUpNeeded") === "on";
    const weight = optionalNumber(formData, "weight");

    const careRecord = await airtableCreate(
      TABLES.dailyCare,
      {
        Animal: [animalId],
        "Date / Time": new Date().toISOString(),
        "Care Type": careType,
        ...(selectedLocation || currentLocation ? { "Housing Location": [selectedLocation || currentLocation] } : {}),
        "Completed By": current.displayName,
        "Alert Level": alertLevel,
        "Follow-Up Needed": followUpNeeded,
        ...(field(formData, "followUpDate") ? { "Follow-Up Date": field(formData, "followUpDate") } : {}),
        ...(weight !== undefined ? { "Weight (lb)": weight } : {}),
        ...(field(formData, "notes") ? { "Notes / Observation": field(formData, "notes") } : {}),
        ...(followUpNeeded
          ? { "Follow-Up Status": alertLevel === "Needs Attention" || alertLevel === "Urgent" ? "Needs Attention" : "Not Due" }
          : {}),
      },
      true
    );

    if (weight !== undefined) {
      await airtableUpdate(TABLES.animals, animalId, { "Weight (lb)": weight }, true);
    }

    const file = formData.get("photo");
    if (careRecord && file instanceof File && file.size) {
      await airtableUploadAttachment(careRecord.id, CARE_PHOTO_FIELD_ID, file);
    }

    revalidatePath("/portal/staff/care");
    revalidatePath(`/portal/staff/animals/${animalId}`);
    revalidatePath("/portal/staff/animals");
  }

  async function completeFollowUp(formData: FormData) {
    "use server";
    await requirePortalRole("Staff");
    const careId = field(formData, "careId");
    const latest = await airtableList(TABLES.dailyCare, ["Follow-Up Status"]);
    if (!latest.some((record) => record.id === careId)) return;
    await airtableUpdate(TABLES.dailyCare, careId, {
      "Follow-Up Status": "Completed",
      "Follow-Up Needed": false,
    }, true);
    revalidatePath("/portal/staff/care");
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="container-custom py-10 md:py-12">
        <Link href="/portal/staff" className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline">
          <ArrowLeft className="h-4 w-4" /> Staff Portal
        </Link>

        <header className="mb-8">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-primary">Shelter Operations</p>
          <h1 className="text-4xl font-bold tracking-tight md:text-5xl">Kennel, Daily Care & Housing</h1>
          <p className="mt-4 max-w-3xl text-muted-foreground">
            See where every shelter animal is housed, manage room and kennel capacity, record daily care, and surface health or behavior observations that need follow-up.
          </p>
        </header>

        {(notice.saved || notice.error) && (
          <p className={`mb-6 rounded-xl p-4 text-sm ${notice.error ? "bg-red-50 text-red-800" : "border border-primary/20 bg-primary/5"}`}>
            {notice.error || "Changes saved."}
          </p>
        )}

        <section className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ["Animals in shelter", inShelter.length, BedDouble],
            ["Housing locations", locations.filter((record) => Boolean(record.fields.Active)).length, MapPin],
            ["Unassigned housing", unassigned.length, AlertTriangle],
            ["Care follow-ups", openAlerts.length, HeartPulse],
          ].map(([label, value, Icon]) => {
            const MetricIcon = Icon as typeof BedDouble;
            return (
              <div key={String(label)} className="rounded-2xl border bg-white p-5 shadow-sm">
                <MetricIcon className="mb-3 h-5 w-5 text-primary" />
                <p className="text-3xl font-bold">{String(value)}</p>
                <p className="mt-1 text-sm text-muted-foreground">{String(label)}</p>
              </div>
            );
          })}
        </section>

        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <section className="rounded-3xl border bg-white p-6 shadow-sm md:p-8">
              <div className="mb-5 flex items-center gap-3">
                <MapPin className="h-6 w-6 text-primary" />
                <div>
                  <h2 className="text-2xl font-bold">Housing Board</h2>
                  <p className="text-sm text-muted-foreground">Current in-shelter placement and capacity.</p>
                </div>
              </div>

              {!locations.length && (
                <p className="mb-5 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">
                  No housing locations have been created yet. Add your cat rooms, cages, dog kennels, isolation, medical, and recovery spaces below.
                </p>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                {locations.filter((record) => Boolean(record.fields.Active)).map((location) => {
                  const occupants = inShelter.filter((animal) =>
                    asStrings(animal.fields["Current Housing Location"]).includes(location.id)
                  );
                  const capacity = asNumber(location.fields.Capacity);
                  const full = capacity !== null && occupants.length >= capacity;
                  return (
                    <article key={location.id} className="rounded-2xl border p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="font-bold">{asText(location.fields["Location Name"])}</h3>
                          <p className="mt-1 text-xs text-muted-foreground">{asText(location.fields["Location Type"])}</p>
                        </div>
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${full ? "bg-amber-100 text-amber-900" : "bg-slate-100"}`}>
                          {occupants.length}{capacity !== null ? ` / ${capacity}` : ""}
                        </span>
                      </div>
                      <div className="mt-4 space-y-2">
                        {occupants.map((animal) => (
                          <Link key={animal.id} href={`/portal/staff/animals/${animal.id}`} className="block rounded-xl bg-slate-50 px-3 py-2 text-sm hover:bg-slate-100">
                            <strong>{asText(animal.fields["Pet Name"])}</strong>
                            <span className="ml-2 text-muted-foreground">{asText(animal.fields["Animal ID"])}</span>
                          </Link>
                        ))}
                        {!occupants.length && <p className="text-sm text-muted-foreground">No animals assigned.</p>}
                      </div>
                      {asText(location.fields.Notes) && <p className="mt-4 text-sm text-muted-foreground">{asText(location.fields.Notes)}</p>}
                    </article>
                  );
                })}
              </div>

              {unassigned.length > 0 && (
                <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5">
                  <h3 className="font-bold text-amber-900">In-shelter animals without a housing location</h3>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {unassigned.map((animal) => <Link key={animal.id} href={`/portal/staff/animals/${animal.id}`} className="rounded-full bg-white px-3 py-1.5 text-sm font-medium">{asText(animal.fields["Pet Name"])}</Link>)}
                  </div>
                </div>
              )}
            </section>

            <section className="rounded-3xl border bg-white p-6 shadow-sm md:p-8">
              <div className="mb-5 flex items-center gap-3">
                <BedDouble className="h-6 w-6 text-primary" />
                <div>
                  <h2 className="text-2xl font-bold">Move an Animal</h2>
                  <p className="text-sm text-muted-foreground">Assign or change the animal&apos;s current in-shelter location.</p>
                </div>
              </div>
              <form action={moveAnimal} className="grid gap-4 md:grid-cols-[1fr_1fr_auto]">
                <select name="animalId" required defaultValue="" className="rounded-xl border bg-white px-3 py-2.5">
                  <option value="" disabled>Select animal</option>
                  {activeAnimals.map((animal) => <option key={animal.id} value={animal.id}>{asText(animal.fields["Pet Name"])} · {asText(animal.fields["Animal ID"])}</option>)}
                </select>
                <select name="locationId" defaultValue="" className="rounded-xl border bg-white px-3 py-2.5">
                  <option value="">In shelter, location not assigned</option>
                  {locations.filter((record) => Boolean(record.fields.Active)).map((location) => {
                    const capacity = asNumber(location.fields.Capacity);
                    const occupied = occupancyByLocation.get(location.id) || 0;
                    return <option key={location.id} value={location.id} disabled={capacity !== null && occupied >= capacity}>{asText(location.fields["Location Name"])}{capacity !== null ? ` · ${occupied}/${capacity}` : ""}</option>;
                  })}
                </select>
                <button className="rounded-xl bg-primary px-5 py-2.5 font-semibold text-white">Move</button>
              </form>
            </section>

            <section className="rounded-3xl border bg-white p-6 shadow-sm md:p-8">
              <div className="mb-5 flex items-center gap-3">
                <ClipboardCheck className="h-6 w-6 text-primary" />
                <div>
                  <h2 className="text-2xl font-bold">Recent Daily Care</h2>
                  <p className="text-sm text-muted-foreground">Latest care, cleaning, exercise, enrichment, weight, behavior, and health entries.</p>
                </div>
              </div>
              <div className="space-y-3">
                {care.slice(0, 40).map((record) => {
                  const animalId = asStrings(record.fields.Animal)[0];
                  const animal = animalById.get(animalId);
                  const locationId = asStrings(record.fields["Housing Location"])[0];
                  const location = locationById.get(locationId);
                  const alert = asText(record.fields["Alert Level"]);
                  return (
                    <article key={record.id} className="rounded-2xl bg-slate-50 p-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold">{asText(animal?.fields["Pet Name"]) || "Animal"} · {asText(record.fields["Care Type"])}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{formatDateTime(record.fields["Date / Time"])} · {asText(record.fields["Completed By"]) || "Staff"}{location ? ` · ${asText(location.fields["Location Name"])}` : ""}</p>
                        </div>
                        {alert && alert !== "Normal" && <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900">{alert}</span>}
                      </div>
                      {asText(record.fields["Notes / Observation"]) && <p className="mt-3 text-sm">{asText(record.fields["Notes / Observation"])}</p>}
                      {asNumber(record.fields["Weight (lb)"]) !== null && <p className="mt-2 text-sm text-muted-foreground">Weight: {asNumber(record.fields["Weight (lb)"])} lb</p>}
                    </article>
                  );
                })}
                {!care.length && <p className="text-sm text-muted-foreground">No daily care entries have been recorded yet.</p>}
              </div>
            </section>
          </div>

          <div className="space-y-6">
            <section className="rounded-3xl border bg-white p-6 shadow-sm md:p-8">
              <div className="mb-5 flex items-center gap-3">
                <Plus className="h-6 w-6 text-primary" />
                <div>
                  <h2 className="text-2xl font-bold">Record Daily Care</h2>
                  <p className="text-sm text-muted-foreground">Capture routine care and observations at the point of work.</p>
                </div>
              </div>
              <form action={recordCare} className="space-y-4">
                <label className="block text-sm font-medium">Animal<select name="animalId" required defaultValue="" className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5"><option value="" disabled>Select animal</option>{activeAnimals.map((animal)=><option key={animal.id} value={animal.id}>{asText(animal.fields["Pet Name"])} · {asText(animal.fields["Animal ID"])}</option>)}</select></label>
                <label className="block text-sm font-medium">Care type<select name="careType" required defaultValue="" className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5"><option value="" disabled>Select care type</option>{["Feeding","Water","Litter / Kennel Cleaning","Medication Support","Exercise / Walk","Enrichment / Socialization","Weight","Behavior Observation","Health Observation","Grooming","Other"].map((value)=><option key={value}>{value}</option>)}</select></label>
                <label className="block text-sm font-medium">Housing location<select name="housingLocation" defaultValue="" className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5"><option value="">Use animal&apos;s current location</option>{locations.filter((record)=>Boolean(record.fields.Active)).map((location)=><option key={location.id} value={location.id}>{asText(location.fields["Location Name"])}</option>)}</select></label>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block text-sm font-medium">Alert level<select name="alertLevel" defaultValue="Normal" className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5">{["Normal","Monitor","Needs Attention","Urgent"].map((value)=><option key={value}>{value}</option>)}</select></label>
                  <label className="block text-sm font-medium">Weight (lb)<input name="weight" type="number" min="0" step="0.1" className="mt-2 w-full rounded-xl border px-3 py-2.5" /></label>
                </div>
                <label className="block text-sm font-medium">Notes / observation<textarea name="notes" rows={4} className="mt-2 w-full rounded-xl border px-3 py-2.5" /></label>
                <label className="flex items-start gap-3 rounded-xl bg-slate-50 p-4 text-sm"><input name="followUpNeeded" type="checkbox" className="mt-1" /><span><strong>Follow-up needed</strong><span className="mt-1 block text-muted-foreground">Use for concerns that should stay visible until staff completes the follow-up.</span></span></label>
                <label className="block text-sm font-medium">Follow-up date<input name="followUpDate" type="date" className="mt-2 w-full rounded-xl border px-3 py-2.5" /></label>
                <label className="block text-sm font-medium">Photo / attachment<input name="photo" type="file" accept="image/*" className="mt-2 block w-full text-sm" /></label>
                <button className="w-full rounded-full bg-primary px-5 py-3 font-semibold text-white">Save Care Entry</button>
              </form>
            </section>

            <section className="rounded-3xl border bg-white p-6 shadow-sm md:p-8">
              <div className="mb-5 flex items-center gap-3"><AlertTriangle className="h-6 w-6 text-primary" /><div><h2 className="text-2xl font-bold">Care Follow-Up</h2><p className="text-sm text-muted-foreground">Unresolved observations requiring staff attention.</p></div></div>
              <div className="space-y-3">
                {openAlerts.map((record) => {
                  const animalId = asStrings(record.fields.Animal)[0];
                  const animal = animalById.get(animalId);
                  return (
                    <form key={record.id} action={completeFollowUp} className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
                      <input type="hidden" name="careId" value={record.id} />
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div><p className="font-semibold">{asText(animal?.fields["Pet Name"]) || "Animal"} · {asText(record.fields["Care Type"])}</p><p className="mt-1 text-xs text-muted-foreground">{formatDateTime(record.fields["Date / Time"])}</p></div>
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold">{asText(record.fields["Alert Level"]) || "Follow-up"}</span>
                      </div>
                      {asText(record.fields["Notes / Observation"]) && <p className="mt-3 text-sm">{asText(record.fields["Notes / Observation"])}</p>}
                      {asText(record.fields["Follow-Up Date"]) && <p className="mt-2 text-xs text-muted-foreground">Follow-up date: {asText(record.fields["Follow-Up Date"])}</p>}
                      <button className="mt-4 rounded-full bg-white px-4 py-2 text-sm font-semibold text-primary shadow-sm">Mark Follow-Up Complete</button>
                    </form>
                  );
                })}
                {!openAlerts.length && <p className="text-sm text-muted-foreground">No care follow-ups need attention right now.</p>}
              </div>
            </section>

            <section className="rounded-3xl border bg-white p-6 shadow-sm md:p-8">
              <div className="mb-5"><h2 className="text-2xl font-bold">Housing Locations</h2><p className="mt-2 text-sm text-muted-foreground">Create and maintain the shelter&apos;s rooms, cages, kennels, isolation, medical, and recovery spaces.</p></div>
              <form action={createLocation} className="space-y-4 rounded-2xl bg-slate-50 p-5">
                <h3 className="font-bold">Add location</h3>
                <label className="block text-sm font-medium">Location name<input name="name" required className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5" /></label>
                <label className="block text-sm font-medium">Location type<select name="type" required defaultValue="" className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5"><option value="" disabled>Select type</option>{["Cat Room","Cat Cage","Dog Kennel","Isolation","Medical","Recovery","Other"].map((value)=><option key={value}>{value}</option>)}</select></label>
                <label className="block text-sm font-medium">Capacity<input name="capacity" type="number" min="0" step="1" className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5" /></label>
                <label className="block text-sm font-medium">Notes<textarea name="notes" rows={2} className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5" /></label>
                <button className="rounded-full border border-primary px-5 py-2.5 font-semibold text-primary">Add Housing Location</button>
              </form>

              <div className="mt-5 space-y-3">
                {locations.map((location) => (
                  <details key={location.id} className="rounded-2xl border p-4">
                    <summary className="cursor-pointer font-semibold">{asText(location.fields["Location Name"])} <span className="ml-2 text-xs font-normal text-muted-foreground">{Boolean(location.fields.Active) ? "Active" : "Inactive"}</span></summary>
                    <form action={updateLocation} className="mt-4 space-y-3">
                      <input type="hidden" name="locationId" value={location.id} />
                      <input name="name" defaultValue={asText(location.fields["Location Name"])} required className="w-full rounded-xl border px-3 py-2.5" />
                      <select name="type" defaultValue={asText(location.fields["Location Type"])} className="w-full rounded-xl border bg-white px-3 py-2.5">{["Cat Room","Cat Cage","Dog Kennel","Isolation","Medical","Recovery","Other"].map((value)=><option key={value}>{value}</option>)}</select>
                      <input name="capacity" type="number" min="0" step="1" defaultValue={asNumber(location.fields.Capacity) ?? ""} placeholder="Capacity" className="w-full rounded-xl border px-3 py-2.5" />
                      <textarea name="notes" rows={2} defaultValue={asText(location.fields.Notes)} className="w-full rounded-xl border px-3 py-2.5" />
                      <label className="flex items-center gap-2 text-sm"><input name="active" type="checkbox" defaultChecked={Boolean(location.fields.Active)} /> Active location</label>
                      <button className="rounded-full border px-4 py-2 text-sm font-semibold">Save Location</button>
                    </form>
                  </details>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
