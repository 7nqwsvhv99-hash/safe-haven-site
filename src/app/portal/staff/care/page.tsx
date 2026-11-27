import Link from "next/link";
import { revalidatePath } from "next/cache";
import {
  AlertTriangle,
  ArrowLeft,
  BedDouble,
  ClipboardCheck,
  Cat,
  Dog,
  MapPin,
  Plus,
} from "lucide-react";
import HousingBoard from "./housing-board";
import MoveAnimalForm from "./move-animal-form";
import HousingLocationManager from "./housing-location-manager";
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
const LOCATION_TYPES = ["Cat Room", "Cat Condo", "Dog Kennel", "Isolation", "Medical", "Recovery", "Other"];

function asNumber(value: unknown) {
  return typeof value === "number" ? value : null;
}

function normalizedLocationType(value: unknown) {
  const type = asText(value);
  return type === "Cat Cage" ? "Cat Condo" : type;
}

function isLocationCompatible(speciesValue: unknown, locationTypeValue: unknown, locationNameValue: unknown = "") {
  const species = asText(speciesValue).toLowerCase();
  const locationType = normalizedLocationType(locationTypeValue);
  const locationName = asText(locationNameValue);
  const isDogIsolationKennel = locationType === "Isolation" && /kennel/i.test(locationName);
  if (isDogIsolationKennel) return species === "dog" || species === "dogs";

  const sharedTypes = ["Isolation", "Medical", "Recovery", "Other"];
  if (sharedTypes.includes(locationType)) return true;
  if (species === "cat" || species === "cats") return ["Cat Condo", "Cat Room"].includes(locationType);
  if (species === "dog" || species === "dogs") return locationType === "Dog Kennel";
  return false;
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
  const catsInShelter = inShelter.filter((record) => ["cat", "cats"].includes(asText(record.fields.Species).toLowerCase()));
  const dogsInShelter = inShelter.filter((record) => ["dog", "dogs"].includes(asText(record.fields.Species).toLowerCase()));
  const activeLocations = locations.filter((record) => Boolean(record.fields.Active));
  const dogCapacityLocations = activeLocations.filter((location) => {
    const type = normalizedLocationType(location.fields["Location Type"]);
    return type === "Dog Kennel" || (type === "Isolation" && /kennel/i.test(asText(location.fields["Location Name"])))
      ? asNumber(location.fields.Capacity) !== null
      : false;
  });
  const catCondoLocations = activeLocations.filter((location) =>
    normalizedLocationType(location.fields["Location Type"]) === "Cat Condo" && asNumber(location.fields.Capacity) !== null
  );
  const countVacancies = (eligibleLocations: typeof activeLocations, species: "cat" | "dog") => eligibleLocations.length ? eligibleLocations.reduce((sum, location) => {
    const capacity = asNumber(location.fields.Capacity) ?? 0;
    const occupied = inShelter.filter((animal) =>
      [species, `${species}s`].includes(asText(animal.fields.Species).toLowerCase()) &&
      asStrings(animal.fields["Current Housing Location"]).includes(location.id)
    ).length;
    return sum + Math.max(0, capacity - occupied);
  }, 0) : null;
  const dogVacancies = countVacancies(dogCapacityLocations, "dog");
  const catVacancies = countVacancies(catCondoLocations, "cat");
  const unassigned = inShelter.filter((record) => asStrings(record.fields["Current Housing Location"]).length === 0);
  const boardLocations = activeLocations
    .map((location) => ({
      id: location.id,
      name: asText(location.fields["Location Name"]),
      type: normalizedLocationType(location.fields["Location Type"]),
      capacity: asNumber(location.fields.Capacity),
      notes: asText(location.fields.Notes),
      occupants: inShelter
        .filter((animal) => asStrings(animal.fields["Current Housing Location"]).includes(location.id))
        .map((animal) => ({
          id: animal.id,
          petName: asText(animal.fields["Pet Name"]),
          animalId: asText(animal.fields["Animal ID"]),
          species: asText(animal.fields.Species),
        })),
    }));

  const occupancyByLocation = new Map<string, number>();
  for (const animal of inShelter) {
    for (const locationId of asStrings(animal.fields["Current Housing Location"])) {
      occupancyByLocation.set(locationId, (occupancyByLocation.get(locationId) || 0) + 1);
    }
  }

  const openAlerts = care.filter((record) => {
    const level = asText(record.fields["Alert Level"]);
    const status = asText(record.fields["Follow-Up Status"]);
    if (status === "Completed") return false;
    return ["Needs Attention", "Urgent"].includes(level) || Boolean(record.fields["Follow-Up Needed"]);
  });

  async function createLocation(formData: FormData) {
    "use server";
    await requirePortalRole("Staff", "write");
    const name = field(formData, "name");
    const type = field(formData, "type");
    if (!name || !LOCATION_TYPES.includes(type)) return;

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
    await requirePortalRole("Staff", "write");
    const id = field(formData, "locationId");
    const latest = await airtableList(TABLES.housingLocations, ["Location Name", "Location Type"]);
    const currentLocation = latest.find((record) => record.id === id);
    if (!currentLocation) return;

    const active = formData.get("active") === "on";
    const nextType = field(formData, "type");
    if (!LOCATION_TYPES.includes(nextType)) return;
    const latestAnimals = await airtableList(TABLES.animals, ["Current Housing Location", "Adoption Status", "Species"]);
    const occupants = latestAnimals.filter(
      (record) =>
        asText(record.fields["Adoption Status"]) !== "Adopted" &&
        asStrings(record.fields["Current Housing Location"]).includes(id)
    );
    if (occupants.some((animal) => !isLocationCompatible(animal.fields.Species, nextType, field(formData, "name")))) return;
    if (!active) {
      const occupied = latestAnimals.some(
        (record) =>
          asText(record.fields["Adoption Status"]) !== "Adopted" &&
          asStrings(record.fields["Current Housing Location"]).includes(id)
      );
      if (occupied) return;
    }

    await airtableUpdate(
      TABLES.housingLocations,
      id,
      {
        "Location Name": field(formData, "name"),
        "Location Type": field(formData, "type"),
        Capacity: optionalNumber(formData, "capacity") ?? null,
        Active: active,
        Notes: field(formData, "notes"),
      },
      true
    );

    revalidatePath("/portal/staff/care");
    revalidatePath("/portal/staff/animals");
  }

  async function moveAnimal(formData: FormData) {
    "use server";
    await requirePortalRole("Staff", "write");
    const animalId = field(formData, "animalId");
    const locationId = field(formData, "locationId");

    const [latestAnimals, latestLocations] = await Promise.all([
      airtableList(TABLES.animals, ["Pet Name", "Species", "Housing Type", "Current Housing Location", "Adoption Status", "Bonded With", "From field: Bonded With"]),
      airtableList(TABLES.housingLocations, ["Location Name", "Location Type", "Capacity", "Active"]),
    ]);

    const animal = latestAnimals.find((record) => record.id === animalId);
    if (!animal || asText(animal.fields["Housing Type"]) !== "In Shelter") return;

    if (locationId) {
      const location = latestLocations.find((record) => record.id === locationId && Boolean(record.fields.Active));
      if (!location || !isLocationCompatible(animal.fields.Species, location.fields["Location Type"], location.fields["Location Name"])) return;

      const occupants = latestAnimals.filter((record) =>
        asStrings(record.fields["Current Housing Location"]).includes(locationId) &&
        record.id !== animalId &&
        asText(record.fields["Adoption Status"]) !== "Adopted"
      );
      const capacity = asNumber(location.fields.Capacity);
      const bondedIds = new Set([
        ...asStrings(animal.fields["Bonded With"]),
        ...asStrings(animal.fields["From field: Bonded With"]),
      ]);
      const isDogKennel = (asText(location.fields["Location Type"]) === "Dog Kennel") || (asText(location.fields["Location Type"]) === "Isolation" && /kennel/i.test(asText(location.fields["Location Name"])));
      const sharedBondedKennel = isDogKennel && field(formData, "allowBondedSharing") === "yes" && occupants.length === 1 && bondedIds.has(occupants[0].id);
      if (capacity !== null && occupants.length >= capacity && !sharedBondedKennel) return;

      const currentLocationIds = asStrings(animal.fields["Current Housing Location"]);
      const targetType = normalizedLocationType(location.fields["Location Type"]);
      const replaceTypes = targetType === "Cat Room" ? new Set(["Cat Room"])
        : targetType === "Cat Condo" ? new Set(["Cat Condo"])
        : targetType === "Dog Kennel" || isDogKennel ? new Set(["Dog Kennel", "Isolation"])
        : new Set(["Isolation", "Medical", "Recovery", "Other"]);
      const retainedLocationIds = currentLocationIds.filter((currentId) => {
        const current = latestLocations.find((candidate) => candidate.id === currentId);
        const currentType = normalizedLocationType(current?.fields["Location Type"]);
        const currentIsDogIsolation = currentType === "Isolation" && /kennel/i.test(asText(current?.fields["Location Name"]));
        return !replaceTypes.has(currentType) && !(isDogKennel && currentIsDogIsolation);
      });
      const nextLocationIds = [...new Set([...retainedLocationIds, locationId])];

      await airtableUpdate(TABLES.animals, animalId, {
        "Housing Type": "In Shelter",
        "Current Housing Location": nextLocationIds,
      }, true);
    }

    revalidatePath("/portal/staff/care");
    revalidatePath("/portal/staff/animals");
    revalidatePath(`/portal/staff/animals/${animalId}`);
  }

  async function recordCare(formData: FormData) {
    "use server";
    const current = await requirePortalRole("Staff", "write");
    const animalId = field(formData, "animalId");
    const careType = field(formData, "careType");
    if (!animalId || !careType) return;

    const latestAnimals = await airtableList(
      TABLES.animals,
      ["Pet Name", "Current Housing Location", "Adoption Status", "Weight (lb)"]
    );
    const animal = latestAnimals.find((record) => record.id === animalId);
    if (!animal) return;

    const currentLocation = asStrings(animal.fields["Current Housing Location"])[0] || "";
    const alertLevel = field(formData, "alertLevel") || "Normal";
    const followUpDate = field(formData, "followUpDate");
    const followUpNeeded = ["Needs Attention", "Urgent"].includes(alertLevel) || Boolean(followUpDate);
    const weight = optionalNumber(formData, "weight");

    const careRecord = await airtableCreate(
      TABLES.dailyCare,
      {
        Animal: [animalId],
        "Date / Time": new Date().toISOString(),
        "Care Type": careType,
        ...(currentLocation ? { "Housing Location": [currentLocation] } : {}),
        "Completed By": current.displayName,
        "Alert Level": alertLevel,
        "Follow-Up Needed": followUpNeeded,
        ...(followUpDate ? { "Follow-Up Date": followUpDate } : {}),
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
    await requirePortalRole("Staff", "write");
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

        <section className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-2xl border bg-white p-4 shadow-sm">
            <BedDouble className="mb-2 h-4 w-4 text-primary" />
            <p className="text-2xl font-bold">{inShelter.length}</p>
            <p className="mt-1 text-sm text-muted-foreground">Animals in shelter</p>
          </div>
          <div className="rounded-2xl border bg-white p-4 shadow-sm">
            <Dog className="mb-2 h-4 w-4 text-primary" />
            <p className="text-2xl font-bold">{dogsInShelter.length}</p>
            <p className="mt-1 text-sm text-muted-foreground">Dogs in shelter</p>
          </div>
          <div className="rounded-2xl border bg-white p-4 shadow-sm">
            <Cat className="mb-2 h-4 w-4 text-primary" />
            <p className="text-2xl font-bold">{catsInShelter.length}</p>
            <p className="mt-1 text-sm text-muted-foreground">Cats in shelter</p>
          </div>
          <div className="rounded-2xl border bg-white p-4 shadow-sm">
            <BedDouble className="mb-2 h-4 w-4 text-primary" />
            <p className="text-2xl font-bold">{dogVacancies ?? "—"}</p>
            <p className="mt-1 text-sm text-muted-foreground">Open dog kennel spaces</p>
          </div>
          <div className="rounded-2xl border bg-white p-4 shadow-sm">
            <BedDouble className="mb-2 h-4 w-4 text-primary" />
            <p className="text-2xl font-bold">{catVacancies ?? "—"}</p>
            <p className="mt-1 text-sm text-muted-foreground">Open cat condo spaces</p>
          </div>
        </section>
        <p className="mb-8 text-xs text-muted-foreground">Vacancies use active locations with capacity entered. Cat openings count condos, since cats also have room assignments. A dash means no capacity is configured for that housing type.</p>

        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">


            <section className="rounded-3xl border bg-white p-6 shadow-sm md:p-8">
              <div className="mb-5 flex items-center gap-3">
                <MapPin className="h-6 w-6 text-primary" />
                <div>
                  <h2 className="text-2xl font-bold">Housing Board</h2>
                  <p className="text-sm text-muted-foreground">Cats keep a condo assignment and also have a room assignment; room assignments can change as cats are introduced. Dogs are housed one per kennel unless a bonded pair should share for their welfare.</p>
                </div>
              </div>

              {!locations.length && (
                <p className="mb-5 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">
                  No active housing locations yet. Add cat condos or rooms, dog kennels, or shared isolation, medical, and recovery spaces below.
                </p>
              )}

              <HousingBoard locations={boardLocations} />

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
                  <p className="text-sm text-muted-foreground">Changing a cat&apos;s room keeps its condo assignment, and changing its condo keeps its room. For dogs, use one kennel per dog unless a bonded pair benefits from sharing.</p>
                </div>
              </div>
              <MoveAnimalForm
                action={moveAnimal}
                animals={inShelter.map((animal) => ({
                  id: animal.id,
                  label: `${asText(animal.fields["Pet Name"])} · ${asText(animal.fields["Animal ID"])}`,
                  species: asText(animal.fields.Species),
                }))}
                locations={locations.filter((record) => Boolean(record.fields.Active)).map((location) => ({
                  id: location.id,
                  name: asText(location.fields["Location Name"]),
                  type: normalizedLocationType(location.fields["Location Type"]),
                  capacity: asNumber(location.fields.Capacity),
                  occupancy: occupancyByLocation.get(location.id) || 0,
                }))}
              />
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
            {openAlerts.length > 0 && (
            <section className="rounded-3xl border border-amber-200 bg-white p-6 shadow-sm md:p-8">
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
              </div>
            </section>
            )}
            <section className="rounded-3xl border bg-white p-6 shadow-sm md:p-8">
              <div className="mb-5 flex items-center gap-3">
                <Plus className="h-6 w-6 text-primary" />
                <div>
                  <h2 id="record-care" className="scroll-mt-36 text-2xl font-bold">Record Daily Care</h2>
                  <p className="text-sm text-muted-foreground">Log completed routine care and noteworthy observations against an animal and its current housing space. Needs Attention or Urgent creates a staff follow-up.</p>
                </div>
              </div>
              <form action={recordCare} className="space-y-4">
                <label className="block text-sm font-medium">Animal<select name="animalId" required defaultValue="" className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5"><option value="" disabled>Select animal</option>{activeAnimals.map((animal)=><option key={animal.id} value={animal.id}>{asText(animal.fields["Pet Name"])} · {asText(animal.fields["Animal ID"])}</option>)}</select></label>
                <label className="block text-sm font-medium">Care type<select name="careType" required defaultValue="" className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5"><option value="" disabled>Select care type</option>{["Feeding","Water","Litter / Kennel Cleaning","Medication Support","Exercise / Walk","Enrichment / Socialization","Weight","Behavior Observation","Health Observation","Grooming","Other"].map((value)=><option key={value}>{value}</option>)}</select></label>
                <label className="block text-sm font-medium">Alert level<select name="alertLevel" defaultValue="Normal" className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5">{["Normal","Monitor","Needs Attention","Urgent"].map((value)=><option key={value}>{value}</option>)}</select><span className="mt-1 block text-xs text-muted-foreground">Needs Attention or Urgent automatically creates a follow-up.</span></label>
                <details className="rounded-2xl bg-slate-50 p-4">
                  <summary className="cursor-pointer text-sm font-semibold">Add details only if needed</summary>
                  <div className="mt-4 space-y-4">
                    <label className="block text-sm font-medium">Notes / observation<textarea name="notes" rows={3} placeholder="Only record something noteworthy." className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5" /></label>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="block text-sm font-medium">Weight (lb)<input name="weight" type="number" min="0" step="0.1" className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5" /><span className="mt-1 block text-xs text-muted-foreground">Use for a weight check or when weight is clinically relevant.</span></label>
                      <label className="block text-sm font-medium">Follow-up date<input name="followUpDate" type="date" className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5" /></label>
                    </div>
                    <label className="block text-sm font-medium">Photo / attachment<input name="photo" type="file" accept="image/*" className="mt-2 block w-full text-sm" /></label>
                  </div>
                </details>
                <button className="w-full rounded-full bg-primary px-5 py-3 font-semibold text-white">Save Care Entry</button>
              </form>
            </section>

            <section className="rounded-3xl border bg-white p-6 shadow-sm md:p-8">
              <div className="mb-5"><h2 className="text-2xl font-bold">Housing Locations</h2><p className="mt-2 text-sm text-muted-foreground">Add a new room, condo, or kennel, or select an existing location to update its capacity, notes, and active status.</p></div>
              <HousingLocationManager
                createAction={createLocation}
                updateAction={updateLocation}
                locations={locations.map((location) => ({
                  id: location.id,
                  name: asText(location.fields["Location Name"]),
                  type: normalizedLocationType(location.fields["Location Type"]),
                  capacity: asNumber(location.fields.Capacity)?.toString() || "",
                  notes: asText(location.fields.Notes),
                  active: Boolean(location.fields.Active),
                  occupied: (occupancyByLocation.get(location.id) || 0) > 0,
                }))}
              />
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
