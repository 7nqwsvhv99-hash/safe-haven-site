import Link from "next/link";
import { PawPrint, Plus, Search, ArrowLeft, MapPin } from "lucide-react";
import {
  airtableList,
  asStrings,
  asText,
  requirePortalRole,
  TABLES,
} from "@/lib/portal";

const HOUSING_LOCATIONS = "tblmwvODdr1Iuvy72";

function asNumber(value: unknown) {
  return typeof value === "number" ? value : null;
}

function photoUrl(value: unknown) {
  if (!Array.isArray(value)) return "";
  const first = value[0] as { url?: unknown } | undefined;
  return typeof first?.url === "string" ? first.url : "";
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
        "Current Age Display",
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
          <Link href="/portal/staff/intake?new=1#record-intake" className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-2.5 font-semibold text-white shadow-sm hover:opacity-90">
            <Plus className="h-4 w-4" /> Add Animal
          </Link>
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
                      <p className="mt-2 text-sm">{asText(record.fields.Species)} · {asText(record.fields.Sex)} · {asText(record.fields["Current Age Display"]) || "Age not entered"}</p>
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

      </div>
    </main>
  );
}
