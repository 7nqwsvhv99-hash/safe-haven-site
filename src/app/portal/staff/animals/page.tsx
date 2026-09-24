import Link from "next/link";
import { redirect } from "next/navigation";
import { PawPrint, Plus, Search, ArrowLeft, MapPin } from "lucide-react";
import {
  airtableCreate,
  airtableList,
  asStrings,
  asText,
  requirePortalRole,
  TABLES,
} from "@/lib/portal";

const ANIMAL_INTAKES = "tblkcwdDABVsxtaJH";
const HOUSING_LOCATIONS = "tblmwvODdr1Iuvy72";

function asNumber(value: unknown) {
  return typeof value === "number" ? value : null;
}

function photoUrl(value: unknown) {
  if (!Array.isArray(value)) return "";
  const first = value[0] as { url?: unknown } | undefined;
  return typeof first?.url === "string" ? first.url : "";
}

function currentYearChicago() {
  return new Intl.DateTimeFormat("en-US", { year: "numeric", timeZone: "America/Chicago" }).format(new Date());
}

function nextAnimalId(records: Awaited<ReturnType<typeof airtableList>>, species: string) {
  const prefix = species === "Dog" ? "DOG" : "CAT";
  const year = currentYearChicago();
  const matcher = new RegExp(`^${prefix}-${year}-(\\d+)$`);
  const max = records.reduce((current, record) => {
    const match = asText(record.fields["Animal ID"]).match(matcher);
    return match ? Math.max(current, Number(match[1])) : current;
  }, 0);
  return `${prefix}-${year}-${String(max + 1).padStart(3, "0")}`;
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

function Select({
  name,
  label,
  options,
  required = false,
  defaultValue = "",
}: {
  name: string;
  label: string;
  options: string[];
  required?: boolean;
  defaultValue?: string;
}) {
  return (
    <label className="block text-sm font-medium">
      {label}
      <select name={name} required={required} defaultValue={defaultValue} className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5">
        {!defaultValue && <option value="">Select</option>}
        {options.map((option) => <option key={option}>{option}</option>)}
      </select>
    </label>
  );
}

export default async function AnimalManagementPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; species?: string; status?: string }>;
}) {
  await requirePortalRole("Staff");
  const query = await searchParams;

  const [animals, locations] = await Promise.all([
    airtableList(
      TABLES.animals,
      [
        "Animal ID",
        "Pet Name",
        "Species",
        "Adoption Status",
        "Sex",
        "Age Display",
        "Breed",
        "Primary Photo",
        "Housing Type",
        "Current Housing Location",
        "Public Listing",
        "Website Listing Readiness",
        "Medical Summary",
      ],
      { sort: [{ field: "Pet Name", direction: "asc" }] }
    ),
    airtableList(
      HOUSING_LOCATIONS,
      ["Location Name", "Location Type", "Active"],
      { sort: [{ field: "Location Name", direction: "asc" }] }
    ),
  ]);

  const locationById = new Map(locations.map((record) => [record.id, asText(record.fields["Location Name"])]));
  const q = (query.q || "").trim().toLowerCase();
  const filtered = animals.filter((record) => {
    const species = asText(record.fields.Species);
    const status = asText(record.fields["Adoption Status"]);
    const haystack = [
      asText(record.fields["Animal ID"]),
      asText(record.fields["Pet Name"]),
      species,
      status,
      asText(record.fields.Breed),
    ].join(" ").toLowerCase();
    return (!q || haystack.includes(q)) &&
      (!query.species || species === query.species) &&
      (!query.status || status === query.status);
  });

  async function createAnimal(formData: FormData) {
    "use server";
    await requirePortalRole("Staff");

    const species = field(formData, "species");
    const petName = field(formData, "petName");
    const sex = field(formData, "sex");
    if (!["Cat", "Dog"].includes(species) || !petName || !sex) return;

    const existing = await airtableList(TABLES.animals, ["Animal ID"]);
    const animalId = nextAnimalId(existing, species);
    const adoptionStatus = field(formData, "adoptionStatus") || "Getting Ready for Adoption";
    const housingType = "In Shelter";
    const housingLocation = field(formData, "housingLocation");
    const microchipStatus = field(formData, "microchipStatus") || "Unknown";

    const animal = await airtableCreate(
      TABLES.animals,
      {
        "Animal ID": animalId,
        "Pet Name": petName,
        Species: species,
        "Adoption Status": adoptionStatus,
        Sex: sex,
        ...(field(formData, "dateOfBirth") ? { "Date of Birth": field(formData, "dateOfBirth") } : {}),
        ...(field(formData, "ageDisplay") ? { "Age Display": field(formData, "ageDisplay") } : {}),
        ...(field(formData, "breed") ? { Breed: field(formData, "breed") } : {}),
        ...(field(formData, "color") ? { "Color / Markings": field(formData, "color") } : {}),
        ...(optionalNumber(formData, "weight") !== undefined ? { "Weight (lb)": optionalNumber(formData, "weight") } : {}),
        "Housing Type": housingType,
        ...(housingLocation ? { "Current Housing Location": [housingLocation] } : {}),
        ...(field(formData, "microchipNumber") ? { "Microchip Number": field(formData, "microchipNumber") } : {}),
        "Microchip Registration Status": microchipStatus,
        "Public Listing": false,
      },
      true
    );

    if (!animal) return;

    await airtableCreate(
      ANIMAL_INTAKES,
      {
        Animal: [animal.id],
        "Intake Date": field(formData, "intakeDate") || new Intl.DateTimeFormat("en-CA", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          timeZone: "America/Chicago",
        }).format(new Date()),
        "Intake Type": field(formData, "intakeType") || "Other",
        ...(field(formData, "source") ? { "Source Person / Organization": field(formData, "source") } : {}),
        ...(field(formData, "sourceContact") ? { "Source Contact": field(formData, "sourceContact") } : {}),
        ...(field(formData, "origin") ? { "Found / Origin Location": field(formData, "origin") } : {}),
        "Condition at Intake": field(formData, "condition") || "Unknown",
        ...(optionalNumber(formData, "intakeWeight") !== undefined ? { "Weight at Intake (lb)": optionalNumber(formData, "intakeWeight") } : {}),
        ...(field(formData, "intakeNotes") ? { "Intake Notes": field(formData, "intakeNotes") } : {}),
      },
      true
    );

    redirect(`/portal/staff/animals/${animal.id}?created=1`);
  }

  const activeCount = animals.filter((record) => asText(record.fields["Adoption Status"]) !== "Adopted").length;
  const fosterCount = animals.filter((record) => asText(record.fields["Housing Type"]) === "Foster Home").length;
  const readyCount = animals.filter((record) => asText(record.fields["Website Listing Readiness"]) === "Ready").length;

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="container-custom py-10 md:py-12">
        <Link href="/portal/staff" className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline">
          <ArrowLeft className="h-4 w-4" /> Staff Portal
        </Link>

        <header className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-primary">Animal Management</p>
            <h1 className="text-4xl font-bold tracking-tight md:text-5xl">Animals</h1>
            <p className="mt-4 max-w-3xl text-muted-foreground">
              Add animals, update shelter records, and open one unified profile for medical, foster, adoption, timeline, documents, and photos.
            </p>
          </div>
          <a href="#add-animal" className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-2.5 font-semibold text-white shadow-sm hover:opacity-90">
            <Plus className="h-4 w-4" /> Add Animal
          </a>
        </header>

        <section className="mb-8 grid gap-4 sm:grid-cols-3">
          {[
            ["Active care", activeCount],
            ["In foster", fosterCount],
            ["Website ready", readyCount],
          ].map(([label, value]) => (
            <div key={String(label)} className="rounded-2xl border bg-white p-5 shadow-sm">
              <p className="text-3xl font-bold">{String(value)}</p>
              <p className="mt-1 text-sm text-muted-foreground">{String(label)}</p>
            </div>
          ))}
        </section>

        <section className="mb-8 rounded-3xl border bg-white p-6 shadow-sm">
          <form className="grid gap-3 lg:grid-cols-[1fr_180px_230px_auto]">
            <label className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <input name="q" defaultValue={query.q || ""} placeholder="Search name, ID, breed, or status" className="w-full rounded-xl border bg-white py-2.5 pl-9 pr-3" />
            </label>
            <select name="species" defaultValue={query.species || ""} className="rounded-xl border bg-white px-3 py-2.5">
              <option value="">All species</option>
              <option>Cat</option>
              <option>Dog</option>
            </select>
            <select name="status" defaultValue={query.status || ""} className="rounded-xl border bg-white px-3 py-2.5">
              <option value="">All adoption statuses</option>
              <option>Getting Ready for Adoption</option>
              <option>Available</option>
              <option>Pending</option>
              <option>Adopted</option>
            </select>
            <button className="rounded-xl border px-5 py-2.5 font-semibold hover:bg-slate-50">Filter</button>
          </form>
        </section>

        <section className="mb-10">
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2 className="text-2xl font-bold">Animal Directory</h2>
            <p className="text-sm text-muted-foreground">{filtered.length} shown · {animals.length} total</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((record) => {
              const image = photoUrl(record.fields["Primary Photo"]);
              const location = asStrings(record.fields["Current Housing Location"]).map((id) => locationById.get(id)).filter(Boolean).join(", ");
              const readiness = asText(record.fields["Website Listing Readiness"]);
              return (
                <Link key={record.id} href={`/portal/staff/animals/${record.id}`} className="group overflow-hidden rounded-3xl border bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                  <div className="flex gap-4 p-5">
                    <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-slate-100">
                      {image ? <img src={image} alt="" className="h-full w-full object-cover" /> : <PawPrint className="h-8 w-8 text-muted-foreground" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="truncate text-xl font-bold group-hover:text-primary">{asText(record.fields["Pet Name"]) || "Unnamed animal"}</h3>
                          <p className="text-sm text-muted-foreground">{asText(record.fields["Animal ID"])}</p>
                        </div>
                        {Boolean(record.fields["Public Listing"]) && <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">Public</span>}
                      </div>
                      <p className="mt-2 text-sm">{asText(record.fields.Species)} · {asText(record.fields.Sex)} · {asText(record.fields["Age Display"]) || "Age not entered"}</p>
                      <p className="mt-1 truncate text-sm text-muted-foreground">{asText(record.fields.Breed) || "Breed not entered"}</p>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs">
                        <span className="rounded-full bg-slate-100 px-2.5 py-1">{asText(record.fields["Adoption Status"])}</span>
                        {readiness && <span className="rounded-full bg-slate-100 px-2.5 py-1">{readiness}</span>}
                      </div>
                      {(location || asText(record.fields["Housing Type"])) && (
                        <p className="mt-3 flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3.5 w-3.5" /> {location || asText(record.fields["Housing Type"])}</p>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
          {!filtered.length && <p className="rounded-2xl border bg-white p-6 text-muted-foreground">No animals match those filters.</p>}
        </section>

        <section id="add-animal" className="rounded-3xl border bg-white p-6 shadow-sm md:p-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold">Add Animal</h2>
            <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
              This creates the master animal record and a linked intake record together. The Animal ID is generated automatically from species and year.
            </p>
          </div>
          <form action={createAnimal} className="space-y-8">
            <div>
              <h3 className="mb-4 font-semibold">Animal details</h3>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <label className="block text-sm font-medium">Pet name<input name="petName" required className="mt-2 w-full rounded-xl border px-3 py-2.5" /></label>
                <Select name="species" label="Species" options={["Cat", "Dog"]} required />
                <Select name="sex" label="Sex" options={["Female", "Male", "Unknown"]} required />
                <label className="block text-sm font-medium">Date of birth<input name="dateOfBirth" type="date" className="mt-2 w-full rounded-xl border px-3 py-2.5" /></label>
                <label className="block text-sm font-medium">Age display<input name="ageDisplay" placeholder="Example: 5 months old" className="mt-2 w-full rounded-xl border px-3 py-2.5" /></label>
                <label className="block text-sm font-medium">Breed<input name="breed" className="mt-2 w-full rounded-xl border px-3 py-2.5" /></label>
                <label className="block text-sm font-medium">Color / markings<input name="color" className="mt-2 w-full rounded-xl border px-3 py-2.5" /></label>
                <label className="block text-sm font-medium">Current weight (lb)<input name="weight" type="number" min="0" step="0.1" className="mt-2 w-full rounded-xl border px-3 py-2.5" /></label>
                <Select name="adoptionStatus" label="Adoption status" options={["Getting Ready for Adoption", "Available", "Pending", "Adopted"]} defaultValue="Getting Ready for Adoption" />
              </div>
            </div>

            <div>
              <h3 className="mb-4 font-semibold">Housing & identification</h3>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <label className="block text-sm font-medium">Housing type<input value="In Shelter" readOnly className="mt-2 w-full rounded-xl border bg-slate-50 px-3 py-2.5 text-muted-foreground" /><span className="mt-1 block text-xs text-muted-foreground">For a direct-to-foster intake, use Intake & Owner Surrender so the Foster Placement is created at the same time.</span></label>
                <label className="block text-sm font-medium">
                  Shelter location
                  <select name="housingLocation" defaultValue="" className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5">
                    <option value="">No in-shelter location</option>
                    {locations.filter((record) => Boolean(record.fields.Active)).map((record) => (
                      <option key={record.id} value={record.id}>{asText(record.fields["Location Name"])}</option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm font-medium">Microchip number<input name="microchipNumber" className="mt-2 w-full rounded-xl border px-3 py-2.5" /></label>
                <Select name="microchipStatus" label="Microchip registration" options={["No Microchip", "Needs Registration", "Registered to Safe Haven", "Transferred to Adopter", "Unknown"]} defaultValue="Unknown" />
              </div>
            </div>

            <div>
              <h3 className="mb-4 font-semibold">Intake</h3>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <label className="block text-sm font-medium">Intake date<input name="intakeDate" type="date" className="mt-2 w-full rounded-xl border px-3 py-2.5" /></label>
                <Select name="intakeType" label="Intake type" options={["Owner Surrender", "Stray", "Transfer In", "Adoption Return", "Born in Care", "Other"]} defaultValue="Other" />
                <Select name="condition" label="Condition at intake" options={["Good", "Fair", "Needs Medical Attention", "Critical", "Unknown"]} defaultValue="Unknown" />
                <label className="block text-sm font-medium">Source person / organization<input name="source" className="mt-2 w-full rounded-xl border px-3 py-2.5" /></label>
                <label className="block text-sm font-medium">Source contact<input name="sourceContact" className="mt-2 w-full rounded-xl border px-3 py-2.5" /></label>
                <label className="block text-sm font-medium">Found / origin location<input name="origin" className="mt-2 w-full rounded-xl border px-3 py-2.5" /></label>
                <label className="block text-sm font-medium">Weight at intake (lb)<input name="intakeWeight" type="number" min="0" step="0.1" className="mt-2 w-full rounded-xl border px-3 py-2.5" /></label>
              </div>
              <label className="mt-4 block text-sm font-medium">Intake notes<textarea name="intakeNotes" rows={3} className="mt-2 w-full rounded-xl border px-3 py-2.5" /></label>
            </div>

            <button type="submit" className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 font-semibold text-white shadow-sm hover:opacity-90">
              <Plus className="h-4 w-4" /> Create Animal
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
