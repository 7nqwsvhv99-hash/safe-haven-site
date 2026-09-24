import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { ArrowLeft, ClipboardPlus, Inbox, PawPrint, Search } from "lucide-react";
import {
  airtableCreate,
  airtableList,
  airtableUpdate,
  asStrings,
  asText,
  requirePortalRole,
  TABLES,
} from "@/lib/portal";

function value(form: FormData, name: string) {
  return String(form.get(name) || "").trim();
}
function numberValue(form: FormData, name: string) {
  const raw = value(form, name);
  if (!raw) return undefined;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : undefined;
}
function today() {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric", month: "2-digit", day: "2-digit", timeZone: "America/Chicago",
  }).format(new Date());
}
function year() {
  return new Intl.DateTimeFormat("en-US", { year: "numeric", timeZone: "America/Chicago" }).format(new Date());
}
function nextAnimalId(records: Awaited<ReturnType<typeof airtableList>>, species: string) {
  const prefix = species === "Dog" ? "DOG" : "CAT";
  const matcher = new RegExp("^" + prefix + "-" + year() + "-(\\\\d+)$");
  const max = records.reduce((current, record) => {
    const match = asText(record.fields["Animal ID"]).match(matcher);
    return match ? Math.max(current, Number(match[1])) : current;
  }, 0);
  return prefix + "-" + year() + "-" + String(max + 1).padStart(3, "0");
}
function formatDate(input: unknown) {
  const text = asText(input);
  if (!text) return "";
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return text;
  return new Intl.DateTimeFormat("en-US", {
    month: "short", day: "numeric", year: "numeric", timeZone: "America/Chicago",
  }).format(date);
}
function Status({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold">{children || "No status"}</span>;
}

export default async function IntakeManagementPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  await requirePortalRole("Staff");
  const query = await searchParams;

  const [requests, intakes, animals] = await Promise.all([
    airtableList(TABLES.surrenderRequests, [
      "Submitted At","Status","Owner First Name","Owner Last Name","Email","Phone",
      "Street Address","City","State","ZIP","Animal Name","Species","Sex","Approximate Age",
      "Breed / Mix","Spay / Neuter Status","Microchip Known","Reason for Surrender",
      "Behavior / Safety Notes","Medical Conditions / Medications","Current Veterinarian",
      "Urgency","Requested Surrender Date","Can Keep Animal Until","Decision Date",
      "Staff Notes","Follow-Up Status","Animal Intakes"
    ], { sort: [{ field: "Submitted At", direction: "desc" }] }),
    airtableList(TABLES.animalIntakes, [
      "Animal","Intake Date","Intake Type","Related Surrender Request","Source Person / Organization",
      "Source Contact","Found / Origin Location","Condition at Intake","Weight at Intake (lb)",
      "Intake Notes","Pet Name","Species","Animal Creation Status"
    ], { sort: [{ field: "Intake Date", direction: "desc" }] }),
    airtableList(TABLES.animals, [
      "Animal ID","Pet Name","Species","Adoption Status","Housing Type"
    ], { sort: [{ field: "Pet Name", direction: "asc" }] }),
  ]);

  const animalById = new Map(animals.map((record) => [record.id, record]));
  const q = (query.q || "").trim().toLowerCase();
  const filtered = requests.filter((record) => {
    const haystack = [
      asText(record.fields["Owner First Name"]), asText(record.fields["Owner Last Name"]),
      asText(record.fields.Email), asText(record.fields.Phone), asText(record.fields["Animal Name"]),
      asText(record.fields.Species), asText(record.fields["Breed / Mix"]), asText(record.fields.Urgency),
    ].join(" ").toLowerCase();
    return (!q || haystack.includes(q)) && (!query.status || asText(record.fields.Status) === query.status);
  });

  const pending = requests.filter((r) => !["Declined","Withdrawn","Completed"].includes(asText(r.fields.Status)));
  const approved = requests.filter((r) => asText(r.fields.Status) === "Approved for Intake");
  const urgent = pending.filter((r) => asText(r.fields.Urgency) === "Urgent");

  async function saveRequest(formData: FormData) {
    "use server";
    await requirePortalRole("Staff");
    const requestId = value(formData, "requestId");
    const latest = await airtableList(TABLES.surrenderRequests, ["Status"]);
    if (!latest.some((r) => r.id === requestId)) return;
    const status = value(formData, "status");
    await airtableUpdate(TABLES.surrenderRequests, requestId, {
      Status: status,
      Urgency: value(formData, "urgency"),
      "Staff Notes": value(formData, "staffNotes"),
      "Requested Surrender Date": value(formData, "requestedDate") || null,
      "Can Keep Animal Until": value(formData, "canKeepUntil") || null,
      ...(["Approved for Intake","Declined","Withdrawn","Completed"].includes(status)
        ? { "Decision Date": value(formData, "decisionDate") || today() } : {}),
    }, true);
    revalidatePath("/portal/staff/intake");
  }

  async function acceptSurrender(formData: FormData) {
    "use server";
    await requirePortalRole("Staff");
    const requestId = value(formData, "requestId");
    const latest = await airtableList(TABLES.surrenderRequests, [
      "Status","Owner First Name","Owner Last Name","Email","Phone","Animal Name","Species","Sex",
      "Approximate Age","Breed / Mix","Reason for Surrender","Behavior / Safety Notes",
      "Medical Conditions / Medications","Animal Intakes"
    ]);
    const request = latest.find((r) => r.id === requestId);
    if (!request || asText(request.fields.Status) !== "Approved for Intake") return;
    if (asStrings(request.fields["Animal Intakes"]).length) return;
    const species = asText(request.fields.Species);
    if (!["Cat","Dog"].includes(species)) return;

    const existingAnimals = await airtableList(TABLES.animals, ["Animal ID"]);
    const animal = await airtableCreate(TABLES.animals, {
      "Animal ID": nextAnimalId(existingAnimals, species),
      "Pet Name": asText(request.fields["Animal Name"]) || "Unnamed",
      Species: species,
      Sex: asText(request.fields.Sex) || "Unknown",
      "Age Display": asText(request.fields["Approximate Age"]),
      Breed: asText(request.fields["Breed / Mix"]),
      "Adoption Status": "Getting Ready for Adoption",
      "Housing Type": value(formData, "initialPlacement") || "In Shelter",
      "Public Listing": false,
      "Microchip Registration Status": "Unknown",
    }, true);
    if (!animal) return;

    const owner = [asText(request.fields["Owner First Name"]), asText(request.fields["Owner Last Name"])].filter(Boolean).join(" ");
    const contact = [asText(request.fields.Email), asText(request.fields.Phone)].filter(Boolean).join(" · ");
    const notes = [
      asText(request.fields["Reason for Surrender"]) ? "Reason: " + asText(request.fields["Reason for Surrender"]) : "",
      asText(request.fields["Behavior / Safety Notes"]) ? "Behavior/safety: " + asText(request.fields["Behavior / Safety Notes"]) : "",
      asText(request.fields["Medical Conditions / Medications"]) ? "Medical: " + asText(request.fields["Medical Conditions / Medications"]) : "",
      value(formData, "intakeNotes"),
    ].filter(Boolean).join("\\n\\n");

    await airtableCreate(TABLES.animalIntakes, {
      Animal: [animal.id],
      "Intake Date": value(formData, "intakeDate") || today(),
      "Intake Type": "Owner Surrender",
      "Related Surrender Request": [requestId],
      "Source Person / Organization": owner,
      "Source Contact": contact,
      "Condition at Intake": value(formData, "condition") || "Unknown",
      ...(numberValue(formData, "weight") !== undefined ? { "Weight at Intake (lb)": numberValue(formData, "weight") } : {}),
      "Intake Notes": notes,
    }, true);

    await airtableUpdate(TABLES.surrenderRequests, requestId, {
      Status: "Completed",
      "Decision Date": value(formData, "intakeDate") || today(),
    }, true);

    revalidatePath("/portal/staff/intake");
    revalidatePath("/portal/staff/animals");
    redirect("/portal/staff/animals/" + animal.id + "?created=1");
  }

  async function directIntake(formData: FormData) {
    "use server";
    await requirePortalRole("Staff");
    let animalId = value(formData, "existingAnimalId");
    if (!animalId) {
      const species = value(formData, "species");
      const petName = value(formData, "petName");
      if (!["Cat","Dog"].includes(species) || !petName) return;
      const existing = await airtableList(TABLES.animals, ["Animal ID"]);
      const animal = await airtableCreate(TABLES.animals, {
        "Animal ID": nextAnimalId(existing, species),
        "Pet Name": petName,
        Species: species,
        Sex: value(formData, "sex") || "Unknown",
        "Age Display": value(formData, "ageDisplay"),
        Breed: value(formData, "breed"),
        "Color / Markings": value(formData, "color"),
        "Adoption Status": "Getting Ready for Adoption",
        "Housing Type": value(formData, "initialPlacement") || "In Shelter",
        "Public Listing": false,
        "Microchip Registration Status": "Unknown",
      }, true);
      if (!animal) return;
      animalId = animal.id;
    }
    await airtableCreate(TABLES.animalIntakes, {
      Animal: [animalId],
      "Intake Date": value(formData, "intakeDate") || today(),
      "Intake Type": value(formData, "intakeType") || "Other",
      "Source Person / Organization": value(formData, "source"),
      "Source Contact": value(formData, "sourceContact"),
      "Found / Origin Location": value(formData, "origin"),
      "Condition at Intake": value(formData, "condition") || "Unknown",
      ...(numberValue(formData, "weight") !== undefined ? { "Weight at Intake (lb)": numberValue(formData, "weight") } : {}),
      "Intake Notes": value(formData, "intakeNotes"),
    }, true);
    revalidatePath("/portal/staff/intake");
    revalidatePath("/portal/staff/animals");
    redirect("/portal/staff/animals/" + animalId);
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="container-custom py-10 md:py-12">
        <Link href="/portal/staff" className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline">
          <ArrowLeft className="h-4 w-4" /> Staff Portal
        </Link>

        <header className="mb-8">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-primary">Animal Entry</p>
          <h1 className="text-4xl font-bold tracking-tight md:text-5xl">Intake & Owner Surrender</h1>
          <p className="mt-4 max-w-3xl text-muted-foreground">
            Review owner surrender requests before acceptance, convert approved requests into actual intakes, and record direct intakes for other entry paths.
          </p>
        </header>

        <section className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ["Pending requests", pending.length, Inbox],
            ["Approved for intake", approved.length, ClipboardPlus],
            ["Urgent requests", urgent.length, Search],
            ["Recorded intakes", intakes.length, PawPrint],
          ].map(([label,count,Icon]) => {
            const MetricIcon = Icon as typeof PawPrint;
            return <div key={String(label)} className="rounded-2xl border bg-white p-5 shadow-sm"><MetricIcon className="mb-3 h-5 w-5 text-primary"/><p className="text-3xl font-bold">{String(count)}</p><p className="mt-1 text-sm text-muted-foreground">{String(label)}</p></div>;
          })}
        </section>

        <section className="mb-8 rounded-3xl border bg-white p-6 shadow-sm">
          <form className="grid gap-3 md:grid-cols-[1fr_220px_auto]">
            <input name="q" defaultValue={query.q || ""} placeholder="Search owner, animal, contact, breed, or urgency" className="rounded-xl border px-3 py-2.5"/>
            <select name="status" defaultValue={query.status || ""} className="rounded-xl border bg-white px-3 py-2.5"><option value="">All statuses</option>{["New","Under Review","Contacted","Waitlist","Approved for Intake","Declined","Withdrawn","Completed"].map((s)=><option key={s}>{s}</option>)}</select>
            <button className="rounded-xl border px-5 py-2.5 font-semibold">Filter</button>
          </form>
        </section>

        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-3xl border bg-white p-6 shadow-sm md:p-8">
            <h2 className="text-2xl font-bold">Owner Surrender Queue</h2>
            <p className="mt-2 text-sm text-muted-foreground">Requests remain pre-intake until Safe Haven accepts the animal.</p>
            <div className="mt-5 space-y-4">
              {filtered.map((record) => (
                <details key={record.id} className="rounded-2xl border p-5">
                  <summary className="cursor-pointer list-none">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div><h3 className="font-bold">{asText(record.fields["Animal Name"]) || "Unnamed animal"}</h3><p className="mt-1 text-sm text-muted-foreground">{[asText(record.fields["Owner First Name"]),asText(record.fields["Owner Last Name"])].filter(Boolean).join(" ")} · {formatDate(record.fields["Submitted At"])}</p><p className="mt-2 text-sm">{asText(record.fields.Species)} · {asText(record.fields.Sex)} · {asText(record.fields["Approximate Age"])} · {asText(record.fields["Breed / Mix"])}</p></div>
                      <div className="flex gap-2"><Status>{asText(record.fields.Status)}</Status>{asText(record.fields.Urgency)==="Urgent"&&<span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900">Urgent</span>}</div>
                    </div>
                  </summary>

                  <div className="mt-5 grid gap-5 border-t pt-5 lg:grid-cols-2">
                    <div className="space-y-3 text-sm">
                      <p><strong>Owner:</strong> {asText(record.fields.Email)} · {asText(record.fields.Phone)}</p>
                      <p><strong>Reason:</strong> {asText(record.fields["Reason for Surrender"]) || "Not provided"}</p>
                      <p><strong>Behavior/safety:</strong> {asText(record.fields["Behavior / Safety Notes"]) || "No notes"}</p>
                      <p><strong>Medical:</strong> {asText(record.fields["Medical Conditions / Medications"]) || "No notes"}</p>
                      <p><strong>Requested date:</strong> {formatDate(record.fields["Requested Surrender Date"]) || "Not specified"}</p>
                      <p><strong>Can keep until:</strong> {formatDate(record.fields["Can Keep Animal Until"]) || "Not specified"}</p>
                    </div>
                    <div className="space-y-4">
                      <form action={saveRequest} className="space-y-3 rounded-2xl bg-slate-50 p-5">
                        <input type="hidden" name="requestId" value={record.id}/>
                        <select name="status" defaultValue={asText(record.fields.Status)} className="w-full rounded-xl border bg-white px-3 py-2.5">{["New","Under Review","Contacted","Waitlist","Approved for Intake","Declined","Withdrawn","Completed"].map((s)=><option key={s}>{s}</option>)}</select>
                        <select name="urgency" defaultValue={asText(record.fields.Urgency)||"Routine"} className="w-full rounded-xl border bg-white px-3 py-2.5">{["Routine","Soon","Urgent"].map((s)=><option key={s}>{s}</option>)}</select>
                        <div className="grid gap-3 sm:grid-cols-2"><input name="requestedDate" type="date" defaultValue={asText(record.fields["Requested Surrender Date"]).slice(0,10)} className="rounded-xl border bg-white px-3 py-2.5"/><input name="canKeepUntil" type="date" defaultValue={asText(record.fields["Can Keep Animal Until"]).slice(0,10)} className="rounded-xl border bg-white px-3 py-2.5"/></div>
                        <input name="decisionDate" type="date" defaultValue={asText(record.fields["Decision Date"]).slice(0,10)} className="w-full rounded-xl border bg-white px-3 py-2.5"/>
                        <textarea name="staffNotes" rows={3} defaultValue={asText(record.fields["Staff Notes"])} placeholder="Staff notes" className="w-full rounded-xl border bg-white px-3 py-2.5"/>
                        <button className="rounded-full border border-primary px-4 py-2 text-sm font-semibold text-primary">Save Review</button>
                      </form>

                      {asText(record.fields.Status)==="Approved for Intake" && asStrings(record.fields["Animal Intakes"]).length===0 && (
                        <form action={acceptSurrender} className="space-y-3 rounded-2xl border border-primary/20 bg-primary/5 p-5">
                          <input type="hidden" name="requestId" value={record.id}/>
                          <h4 className="font-bold">Accept Into Safe Haven Care</h4>
                          <input name="intakeDate" type="date" defaultValue={today()} className="w-full rounded-xl border bg-white px-3 py-2.5"/>
                          <select name="initialPlacement" defaultValue="In Shelter" className="w-full rounded-xl border bg-white px-3 py-2.5"><option>In Shelter</option><option>Foster Home</option></select>
                          <select name="condition" defaultValue="Unknown" className="w-full rounded-xl border bg-white px-3 py-2.5">{["Good","Fair","Needs Medical Attention","Critical","Unknown"].map((s)=><option key={s}>{s}</option>)}</select>
                          <input name="weight" type="number" min="0" step="0.1" placeholder="Weight at intake (lb)" className="w-full rounded-xl border bg-white px-3 py-2.5"/>
                          <textarea name="intakeNotes" rows={3} placeholder="Additional intake notes" className="w-full rounded-xl border bg-white px-3 py-2.5"/>
                          <button className="rounded-full bg-primary px-5 py-2.5 font-semibold text-white">Create Animal & Intake</button>
                        </form>
                      )}
                    </div>
                  </div>
                </details>
              ))}
            </div>
          </section>

          <div className="space-y-6">
            <section className="rounded-3xl border bg-white p-6 shadow-sm md:p-8">
              <h2 className="text-2xl font-bold">Record Direct Intake</h2>
              <p className="mt-2 text-sm text-muted-foreground">For strays, transfers, adoption returns, animals born in care, or other accepted entry paths.</p>
              <form action={directIntake} className="mt-5 space-y-3">
                <select name="intakeType" defaultValue="Stray" className="w-full rounded-xl border bg-white px-3 py-2.5">{["Stray","Transfer In","Adoption Return","Born in Care","Other"].map((s)=><option key={s}>{s}</option>)}</select>
                <select name="existingAnimalId" defaultValue="" className="w-full rounded-xl border bg-white px-3 py-2.5"><option value="">Create new animal</option>{animals.map((a)=><option key={a.id} value={a.id}>{asText(a.fields["Pet Name"])} · {asText(a.fields["Animal ID"])}</option>)}</select>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="mb-3 text-sm font-semibold">New animal details, if needed</p>
                  <input name="petName" placeholder="Pet name" className="mb-3 w-full rounded-xl border bg-white px-3 py-2.5"/>
                  <div className="grid gap-3 sm:grid-cols-2"><select name="species" defaultValue="" className="rounded-xl border bg-white px-3 py-2.5"><option value="">Species</option><option>Cat</option><option>Dog</option></select><select name="sex" defaultValue="Unknown" className="rounded-xl border bg-white px-3 py-2.5"><option>Female</option><option>Male</option><option>Unknown</option></select></div>
                  <input name="ageDisplay" placeholder="Age display" className="mt-3 w-full rounded-xl border bg-white px-3 py-2.5"/>
                  <input name="breed" placeholder="Breed" className="mt-3 w-full rounded-xl border bg-white px-3 py-2.5"/>
                  <input name="color" placeholder="Color / markings" className="mt-3 w-full rounded-xl border bg-white px-3 py-2.5"/>
                </div>
                <select name="initialPlacement" defaultValue="In Shelter" className="w-full rounded-xl border bg-white px-3 py-2.5"><option>In Shelter</option><option>Foster Home</option></select>
                <input name="intakeDate" type="date" defaultValue={today()} className="w-full rounded-xl border px-3 py-2.5"/>
                <input name="source" placeholder="Source person / organization" className="w-full rounded-xl border px-3 py-2.5"/>
                <textarea name="sourceContact" rows={2} placeholder="Source contact" className="w-full rounded-xl border px-3 py-2.5"/>
                <input name="origin" placeholder="Found / origin location" className="w-full rounded-xl border px-3 py-2.5"/>
                <select name="condition" defaultValue="Unknown" className="w-full rounded-xl border bg-white px-3 py-2.5">{["Good","Fair","Needs Medical Attention","Critical","Unknown"].map((s)=><option key={s}>{s}</option>)}</select>
                <input name="weight" type="number" min="0" step="0.1" placeholder="Weight at intake (lb)" className="w-full rounded-xl border px-3 py-2.5"/>
                <textarea name="intakeNotes" rows={4} placeholder="Intake notes" className="w-full rounded-xl border px-3 py-2.5"/>
                <button className="w-full rounded-full bg-primary px-5 py-3 font-semibold text-white">Record Intake</button>
              </form>
            </section>

            <section className="rounded-3xl border bg-white p-6 shadow-sm md:p-8">
              <h2 className="text-2xl font-bold">Recent Intakes</h2>
              <div className="mt-4 space-y-2">
                {intakes.slice(0,12).map((record) => {
                  const animal = animalById.get(asStrings(record.fields.Animal)[0]);
                  const href = animal ? "/portal/staff/animals/" + animal.id : "#";
                  return <Link key={record.id} href={href} className="block rounded-xl bg-slate-50 p-4 hover:bg-slate-100"><strong>{asText(animal?.fields["Pet Name"]) || asText(record.fields["Pet Name"]) || "Animal"}</strong><span className="ml-2 text-sm text-muted-foreground">{asText(record.fields["Intake Type"])} · {formatDate(record.fields["Intake Date"])}</span></Link>;
                })}
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
