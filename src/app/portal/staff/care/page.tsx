import Link from "next/link";
import { revalidatePath } from "next/cache";
import {
  ArrowLeft,
  BedDouble,
  Cat,
  Dog,
  MapPin,
} from "lucide-react";
import HousingBoard from "./housing-board";
import MoveAnimalForm from "./move-animal-form";
import HousingLocationManager from "./housing-location-manager";
import {
  airtableCreate,
  airtableList,
  airtableUpdate,
  asStrings,
  asText,
  requirePortalRole,
  TABLES,
} from "@/lib/portal";

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

export default async function CareAndHousingPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  await requirePortalRole("Staff");
  const notice = await searchParams;

  const [animals, locations] = await Promise.all([
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
    )
  ]);

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

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="container-custom py-10 md:py-12">
        <Link href="/portal/staff" className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline">
          <ArrowLeft className="h-4 w-4" /> Staff Portal
        </Link>

        <header className="mb-8">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-primary">Shelter Operations</p>
          <h1 className="text-4xl font-bold tracking-tight md:text-5xl">Housing</h1>
          <p className="mt-4 max-w-3xl text-muted-foreground">
            See where shelter animals are housed, manage room and kennel capacity, and maintain active housing locations.
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

        <div className="grid gap-6 xl:grid-cols-2">
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




          </div>

          <div className="space-y-6">
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
