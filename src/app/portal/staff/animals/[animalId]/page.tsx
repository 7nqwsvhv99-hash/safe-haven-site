import Link from "next/link";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  Activity,
  ArrowLeft,
  ClipboardList,
  ClipboardCheck,
  FileText,
  HeartHandshake,
  ImageIcon,
  PawPrint,
  Stethoscope,
  UserRoundCheck,
} from "lucide-react";
import {
  airtableList,
  airtableUpdate,
  airtableUploadAttachment,
  asStrings,
  asText,
  requirePortalRole,
  TABLES,
} from "@/lib/portal";

const ANIMAL_INTAKES = "tblkcwdDABVsxtaJH";
const ANIMAL_ACTIVITY = "tblPG9QksBJnCz6tq";
const ADOPTION_APPLICATIONS = "tblmDw2mrdg40JyoF";
const ADOPTIONS = "tblssnhDEIkz2D0iY";
const DOCUMENTS = "tblpqIQQvuAJXzF6K";
const HOUSING_LOCATIONS = "tblmwvODdr1Iuvy72";

const PRIMARY_PHOTO_FIELD_ID = "fldhyNKg0v9pfQ8If";
const ADDITIONAL_PHOTOS_FIELD_ID = "fldqpTkG8BkqawCGc";

function asNumber(value: unknown) {
  return typeof value === "number" ? value : null;
}

function attachments(value: unknown) {
  if (!Array.isArray(value)) return [];
  return (value as { url?: unknown; filename?: unknown }[])
    .map((item) => ({
      url: typeof item.url === "string" ? item.url : "",
      filename: typeof item.filename === "string" ? item.filename : "Animal photo",
    }))
    .filter((item) => item.url);
}

function formatDate(value: unknown, includeTime = false) {
  const text = asText(value);
  if (!text) return "";
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return text;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    ...(includeTime ? { hour: "numeric", minute: "2-digit" } : {}),
    timeZone: "America/Chicago",
  }).format(date);
}

function field(form: FormData, name: string) {
  return String(form.get(name) || "").trim();
}

function optionalNumber(form: FormData, name: string) {
  const value = field(form, name);
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function linked(record: { fields: Record<string, unknown> }, fieldName: string, animalId: string) {
  return asStrings(record.fields[fieldName]).includes(animalId);
}

function Detail({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm">{value || "Not entered"}</dd>
    </div>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-2xl bg-slate-50 p-4 text-sm text-muted-foreground">{children}</p>;
}

function StatusPill({ children }: { children: ReactNode }) {
  return <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold">{children}</span>;
}

export default async function AnimalProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ animalId: string }>;
  searchParams: Promise<{ saved?: string; uploaded?: string; created?: string }>;
}) {
  await requirePortalRole("Staff");
  const { animalId } = await params;
  const notice = await searchParams;

  const [
    animals,
    locations,
    medical,
    intakes,
    activity,
    fosters,
    applications,
    adoptions,
    documents,
    dailyCare,
  ] = await Promise.all([
    airtableList(TABLES.animals, [
      "Animal ID",
      "Pet Name",
      "Species",
      "Adoption Status",
      "Sex",
      "Date of Birth",
      "Age Display",
      "Breed",
      "Color / Markings",
      "Weight (lb)",
      "Adoption Fee",
      "Adoption Fee Status",
      "Short Bio",
      "Traits",
      "Good With Cats",
      "Good With Dogs",
      "Good With Children",
      "House / Litter Trained",
      "Compatibility Notes",
      "Medical Summary",
      "Adoption Includes",
      "Primary Photo",
      "Additional Photos",
      "Available Since",
      "Public Listing",
      "Housing Type",
      "Website Listing Readiness",
      "Current Housing Location",
      "Microchip Number",
      "Microchip Registration Status",
      "Bonded With",
      "From field: Bonded With",
      "Bonded Pair?",
    ]),
    airtableList(HOUSING_LOCATIONS, ["Location Name", "Location Type", "Active"], {
      sort: [{ field: "Location Name", direction: "asc" }],
    }),
    airtableList(TABLES.medicalRecords, [
      "Animal",
      "Date / Time",
      "Record Type",
      "Reason / Complaint",
      "Assessment / Diagnosis",
      "Treatment / Procedure",
      "Medication / Product",
      "Dose / Route / Frequency",
      "Vaccine / Preventative",
      "Follow-Up Date",
      "Follow-Up Status",
      "Needs Veterinarian Review",
      "Veterinary Review Status",
      "Notes",
    ], { sort: [{ field: "Date / Time", direction: "desc" }] }),
    airtableList(ANIMAL_INTAKES, [
      "Animal",
      "Intake Date",
      "Intake Type",
      "Source Person / Organization",
      "Source Contact",
      "Found / Origin Location",
      "Condition at Intake",
      "Weight at Intake (lb)",
      "Intake Notes",
    ], { sort: [{ field: "Intake Date", direction: "desc" }] }),
    airtableList(ANIMAL_ACTIVITY, [
      "Animal",
      "Activity Date / Time",
      "Activity Type",
      "Summary",
      "Details",
      "Source Table",
    ], { sort: [{ field: "Activity Date / Time", direction: "desc" }] }),
    airtableList(TABLES.fosterPlacements, [
      "Animal",
      "Foster Placement ID",
      "Placement Status",
      "Placement Type",
      "Start Date",
      "Expected End Date",
      "End Date",
      "Next Check-In Date",
      "Check-In Status",
      "Care Instructions / Notes",
      "Foster Update Notes",
      "Return / Outcome",
      "Outcome Notes",
    ], { sort: [{ field: "Start Date", direction: "desc" }] }),
    airtableList(ADOPTION_APPLICATIONS, [
      "Preferred Animal",
      "Application ID",
      "Submitted At",
      "Status",
      "First Name",
      "Last Name",
      "Email",
      "Phone",
      "Application Type",
      "Reviewer Notes",
      "Next Follow-Up Date",
      "Decision Date",
    ], { sort: [{ field: "Submitted At", direction: "desc" }] }),
    airtableList(ADOPTIONS, [
      "Animal",
      "Adoption ID",
      "Adoption Date",
      "Adoption Fee Paid",
      "Payment Method",
      "Follow-Up Date",
      "Follow-Up Status",
      "Placement Notes",
      "Follow-up Notes",
      "Website Permission",
      "Testimonial / Feedback",
    ], { sort: [{ field: "Adoption Date", direction: "desc" }] }),
    airtableList(DOCUMENTS, [
      "Animal",
      "Document Type",
      "Status",
      "Generated Date",
      "Sent Date",
      "Signed Date",
      "Signed By",
      "Template / Version",
      "Document File",
      "Notes",
    ], { sort: [{ field: "Generated Date", direction: "desc" }] }),
    airtableList(TABLES.dailyCare, [
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
      "Follow-Up Status",
    ], { sort: [{ field: "Date / Time", direction: "desc" }] }),
  ]);

  const animal = animals.find((record) => record.id === animalId);
  if (!animal) notFound();

  const animalById = new Map(animals.map((record) => [record.id, record]));
  const locationById = new Map(locations.map((record) => [record.id, asText(record.fields["Location Name"])]));
  const currentLocationIds = asStrings(animal.fields["Current Housing Location"]);
  const currentLocation = currentLocationIds.map((id) => locationById.get(id)).filter(Boolean).join(", ");
  const primaryPhotos = attachments(animal.fields["Primary Photo"]);
  const additionalPhotos = attachments(animal.fields["Additional Photos"]);
  const bondedIds = Array.from(new Set([
    ...asStrings(animal.fields["Bonded With"]),
    ...asStrings(animal.fields["From field: Bonded With"]),
  ])).filter((id) => id !== animalId);
  const bondedNames = bondedIds.map((id) => asText(animalById.get(id)?.fields["Pet Name"])).filter(Boolean);

  const relatedMedical = medical.filter((record) => linked(record, "Animal", animalId));
  const relatedIntakes = intakes.filter((record) => linked(record, "Animal", animalId));
  const relatedActivity = activity.filter((record) => linked(record, "Animal", animalId));
  const relatedFosters = fosters.filter((record) => linked(record, "Animal", animalId));
  const relatedApplications = applications.filter((record) => linked(record, "Preferred Animal", animalId));
  const relatedAdoptions = adoptions.filter((record) => linked(record, "Animal", animalId));
  const relatedDocuments = documents.filter((record) => linked(record, "Animal", animalId));
  const relatedCare = dailyCare.filter((record) => linked(record, "Animal", animalId));

  async function saveAnimal(formData: FormData) {
    "use server";
    await requirePortalRole("Staff");
    const current = (await airtableList(TABLES.animals, ["Pet Name"])).find((record) => record.id === animalId);
    if (!current) return;

    const weight = optionalNumber(formData, "weight");
    const fee = optionalNumber(formData, "adoptionFee");
    const location = currentLocationIds[0] || "";

    await airtableUpdate(TABLES.animals, animalId, {
      "Pet Name": field(formData, "petName"),
      "Adoption Status": field(formData, "adoptionStatus"),
      Sex: field(formData, "sex"),
      ...(field(formData, "dateOfBirth") ? { "Date of Birth": field(formData, "dateOfBirth") } : { "Date of Birth": null }),
      "Age Display": field(formData, "ageDisplay"),
      Breed: field(formData, "breed"),
      "Color / Markings": field(formData, "color"),
      "Weight (lb)": weight,
      "Adoption Fee": fee,
      "Adoption Fee Status": field(formData, "adoptionFeeStatus"),
      "Short Bio": field(formData, "shortBio"),
      "Compatibility Notes": field(formData, "compatibilityNotes"),
      "Medical Summary": field(formData, "medicalSummary"),
      "Adoption Includes": field(formData, "adoptionIncludes"),
      "Good With Cats": field(formData, "goodWithCats"),
      "Good With Dogs": field(formData, "goodWithDogs"),
      "Good With Children": field(formData, "goodWithChildren"),
      "House / Litter Trained": field(formData, "houseTrained"),
      "Housing Type": asText(animal.fields["Housing Type"]),
      "Current Housing Location": location ? [location] : [],
      "Microchip Number": field(formData, "microchipNumber"),
      "Microchip Registration Status": field(formData, "microchipStatus"),
      "Public Listing": formData.get("publicListing") === "on",
      ...(field(formData, "availableSince") ? { "Available Since": field(formData, "availableSince") } : { "Available Since": null }),
    }, true);

    revalidatePath(`/portal/staff/animals/${animalId}`);
    revalidatePath("/portal/staff/animals");
    revalidatePath("/adopt");
  }

  async function uploadPrimaryPhoto(formData: FormData) {
    "use server";
    await requirePortalRole("Staff");
    const file = formData.get("photo");
    if (!(file instanceof File) || !file.size) return;
    await airtableUploadAttachment(animalId, PRIMARY_PHOTO_FIELD_ID, file);
    revalidatePath(`/portal/staff/animals/${animalId}`);
    revalidatePath("/portal/staff/animals");
    revalidatePath("/adopt");
  }

  async function uploadAdditionalPhoto(formData: FormData) {
    "use server";
    await requirePortalRole("Staff");
    const file = formData.get("photo");
    if (!(file instanceof File) || !file.size) return;
    await airtableUploadAttachment(animalId, ADDITIONAL_PHOTOS_FIELD_ID, file);
    revalidatePath(`/portal/staff/animals/${animalId}`);
    revalidatePath("/adopt");
  }

  const status = asText(animal.fields["Adoption Status"]);
  const readiness = asText(animal.fields["Website Listing Readiness"]);

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="container-custom py-10 md:py-12">
        <Link href="/portal/staff/animals" className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline">
          <ArrowLeft className="h-4 w-4" /> Animal Management
        </Link>

        {(notice.saved || notice.uploaded || notice.created) && (
          <p className="mb-6 rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm">
            {notice.created ? "Animal and intake record created." : notice.uploaded ? "Photo uploaded." : "Animal profile saved."}
          </p>
        )}

        <header className="mb-8 overflow-hidden rounded-3xl border bg-white shadow-sm">
          <div className="grid md:grid-cols-[260px_1fr]">
            <div className="flex min-h-64 items-center justify-center bg-slate-100">
              {primaryPhotos[0]?.url ? (
                <img src={primaryPhotos[0].url} alt={asText(animal.fields["Pet Name"])} className="h-full min-h-64 w-full object-cover" />
              ) : (
                <PawPrint className="h-16 w-16 text-muted-foreground" />
              )}
            </div>
            <div className="p-7 md:p-9">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Unified Animal Profile</p>
                  <h1 className="mt-2 text-4xl font-bold tracking-tight">{asText(animal.fields["Pet Name"]) || "Unnamed animal"}</h1>
                  <p className="mt-2 text-muted-foreground">{asText(animal.fields["Animal ID"])} · {asText(animal.fields.Species)}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <StatusPill>{status || "No status"}</StatusPill>
                  <StatusPill>{readiness || "Website readiness unavailable"}</StatusPill>
                  {Boolean(animal.fields["Public Listing"]) && <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">Public listing</span>}
                </div>
              </div>

              <dl className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                <Detail label="Sex" value={asText(animal.fields.Sex)} />
                <Detail label="Age" value={asText(animal.fields["Age Display"])} />
                <Detail label="Breed" value={asText(animal.fields.Breed)} />
                <Detail label="Housing" value={currentLocation || asText(animal.fields["Housing Type"])} />
                <Detail label="Microchip" value={asText(animal.fields["Microchip Number"])} />
                <Detail label="Microchip status" value={asText(animal.fields["Microchip Registration Status"])} />
                <Detail label="Bonded companion" value={bondedNames.join(", ")} />
                <Detail label="Medical review" value={relatedMedical.some((record) => Boolean(record.fields["Needs Veterinarian Review"]) && !["Reviewed", "Resolved"].includes(asText(record.fields["Veterinary Review Status"]))) ? "Needs review" : "No unresolved review"} />
              </dl>
            </div>
          </div>
        </header>

        <nav className="mb-8 flex gap-2 overflow-x-auto rounded-2xl border bg-white p-2 text-sm font-semibold shadow-sm">
          {[
            ["overview", "Overview"],
            ["care", "Daily Care"],
            ["medical", "Medical"],
            ["timeline", "Timeline"],
            ["foster", "Foster"],
            ["adoption", "Adoption"],
            ["documents", "Documents"],
            ["photos", "Photos"],
          ].map(([id, label]) => <a key={id} href={`#${id}`} className="whitespace-nowrap rounded-xl px-4 py-2 hover:bg-slate-50 hover:text-primary">{label}</a>)}
        </nav>

        <section id="overview" className="mb-8 rounded-3xl border bg-white p-6 shadow-sm md:p-8">
          <div className="mb-6 flex items-center gap-3">
            <PawPrint className="h-6 w-6 text-primary" />
            <div><h2 className="text-2xl font-bold">Overview</h2><p className="text-sm text-muted-foreground">Staff-owned animal information. System formulas and linked-record infrastructure stay protected.</p></div>
          </div>

          <form action={saveAnimal} className="space-y-8">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <label className="text-sm font-medium">Pet name<input name="petName" required defaultValue={asText(animal.fields["Pet Name"])} className="mt-2 w-full rounded-xl border px-3 py-2.5" /></label>
              <label className="text-sm font-medium">Animal ID<input readOnly value={asText(animal.fields["Animal ID"])} className="mt-2 w-full rounded-xl border bg-slate-50 px-3 py-2.5 text-muted-foreground" /></label>
              <label className="text-sm font-medium">Species<input readOnly value={asText(animal.fields.Species)} className="mt-2 w-full rounded-xl border bg-slate-50 px-3 py-2.5 text-muted-foreground" /></label>
              <label className="text-sm font-medium">Adoption status<select name="adoptionStatus" defaultValue={status} className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5">{["Getting Ready for Adoption","Available","Pending","Adopted"].map((v)=><option key={v}>{v}</option>)}</select></label>
              <label className="text-sm font-medium">Sex<select name="sex" defaultValue={asText(animal.fields.Sex)} className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5">{["Female","Male","Unknown"].map((v)=><option key={v}>{v}</option>)}</select></label>
              <label className="text-sm font-medium">Age / estimated age<input name="ageDisplay" defaultValue={asText(animal.fields["Age Display"])} placeholder="Example: about 3 years" className="mt-2 w-full rounded-xl border px-3 py-2.5" /><span className="mt-1 block text-xs text-muted-foreground">An exact birth date is not required.</span></label>
              <label className="text-sm font-medium">Breed<input name="breed" defaultValue={asText(animal.fields.Breed)} className="mt-2 w-full rounded-xl border px-3 py-2.5" /></label>
              <label className="text-sm font-medium">Color / markings<input name="color" defaultValue={asText(animal.fields["Color / Markings"])} className="mt-2 w-full rounded-xl border px-3 py-2.5" /></label>
              <label className="text-sm font-medium">Weight (lb)<input name="weight" type="number" min="0" step="0.1" defaultValue={asNumber(animal.fields["Weight (lb)"]) ?? ""} className="mt-2 w-full rounded-xl border px-3 py-2.5" /></label>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4 text-sm text-muted-foreground">
              <strong>Current placement:</strong> {currentLocation || asText(animal.fields["Housing Type"]) || "Not assigned"}. Use Housing Management or Foster Management to change placement so the related records stay consistent.
            </div>
            <details className="rounded-2xl bg-slate-50 p-4">
              <summary className="cursor-pointer text-sm font-semibold">Additional animal, identification & adoption details</summary>
              <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <label className="text-sm font-medium">Exact date of birth, if known<input name="dateOfBirth" type="date" defaultValue={asText(animal.fields["Date of Birth"]).slice(0,10)} className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5" /></label>
                <label className="text-sm font-medium">Adoption fee<input name="adoptionFee" type="number" min="0" step="0.01" defaultValue={asNumber(animal.fields["Adoption Fee"]) ?? ""} className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5" /></label>
                <label className="text-sm font-medium">Fee status<select name="adoptionFeeStatus" defaultValue={asText(animal.fields["Adoption Fee Status"])} className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5"><option value="">Select</option>{["Standard","Reduced","Waived","Sponsored"].map((v)=><option key={v}>{v}</option>)}</select></label>
                <label className="text-sm font-medium">Available since<input name="availableSince" type="date" defaultValue={asText(animal.fields["Available Since"]).slice(0,10)} className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5" /></label>
                <label className="text-sm font-medium">Microchip number<input name="microchipNumber" defaultValue={asText(animal.fields["Microchip Number"])} className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5" /></label>
                <label className="text-sm font-medium">Microchip registration<select name="microchipStatus" defaultValue={asText(animal.fields["Microchip Registration Status"])} className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5">{["No Microchip","Needs Registration","Registered to Safe Haven","Transferred to Adopter","Unknown"].map((v)=><option key={v}>{v}</option>)}</select></label>
              </div>
            </details>

            <div className="grid gap-4 md:grid-cols-2">
              {[["goodWithCats","Good With Cats"],["goodWithDogs","Good With Dogs"],["goodWithChildren","Good With Children"],["houseTrained","House / Litter Trained"]].map(([name,label])=>(
                <label key={name} className="text-sm font-medium">{label}<select name={name} defaultValue={asText(animal.fields[label])} className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5">{["Yes","No","Unknown"].map((v)=><option key={v}>{v}</option>)}</select></label>
              ))}
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <label className="text-sm font-medium">Short bio<textarea name="shortBio" rows={5} defaultValue={asText(animal.fields["Short Bio"])} className="mt-2 w-full rounded-xl border px-3 py-2.5" /></label>
              <label className="text-sm font-medium">Compatibility notes<textarea name="compatibilityNotes" rows={5} defaultValue={asText(animal.fields["Compatibility Notes"])} className="mt-2 w-full rounded-xl border px-3 py-2.5" /></label>
              <label className="text-sm font-medium">Medical summary<textarea name="medicalSummary" rows={4} defaultValue={asText(animal.fields["Medical Summary"])} className="mt-2 w-full rounded-xl border px-3 py-2.5" /></label>
              <label className="text-sm font-medium">Adoption includes<textarea name="adoptionIncludes" rows={4} defaultValue={asText(animal.fields["Adoption Includes"])} className="mt-2 w-full rounded-xl border px-3 py-2.5" /></label>
            </div>

            <div className="rounded-2xl bg-slate-50 p-5">
              <label className="flex items-start gap-3 text-sm"><input name="publicListing" type="checkbox" defaultChecked={Boolean(animal.fields["Public Listing"])} className="mt-1" /><span><strong>Publish on adoption website</strong><span className="mt-1 block text-muted-foreground">The website still requires the Airtable readiness formula to equal Ready before displaying the animal.</span></span></label>
              <p className="mt-3 text-sm text-muted-foreground"><strong>Website readiness:</strong> {readiness || "Not calculated"}</p>
            </div>

            <button className="rounded-full bg-primary px-6 py-3 font-semibold text-white shadow-sm hover:opacity-90">Save Animal Profile</button>
          </form>
        </section>

        <section id="care" className="mb-8 rounded-3xl border bg-white p-6 shadow-sm md:p-8">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <ClipboardCheck className="h-6 w-6 text-primary" />
              <div>
                <h2 className="text-2xl font-bold">Daily Care</h2>
                <p className="text-sm text-muted-foreground">Feeding, cleaning, enrichment, exercise, weight, behavior, health observations, and follow-up.</p>
              </div>
            </div>
            <Link href="/portal/staff/care" className="text-sm font-semibold text-primary hover:underline">Open Daily Care & Housing</Link>
          </div>
          <div className="space-y-3">
            {relatedCare.length ? relatedCare.slice(0, 30).map((record) => {
              const locationId = asStrings(record.fields["Housing Location"])[0];
              const location = locationById.get(locationId);
              const alert = asText(record.fields["Alert Level"]);
              return (
                <article key={record.id} className="rounded-2xl bg-slate-50 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{asText(record.fields["Care Type"]) || "Care entry"}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatDate(record.fields["Date / Time"], true)}
                        {asText(record.fields["Completed By"]) ? ` · ${asText(record.fields["Completed By"])}` : ""}
                        {location ? ` · ${location}` : ""}
                      </p>
                    </div>
                    {alert && alert !== "Normal" && <StatusPill>{alert}</StatusPill>}
                  </div>
                  {asText(record.fields["Notes / Observation"]) && <p className="mt-3 text-sm">{asText(record.fields["Notes / Observation"])}</p>}
                  <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
                    {asNumber(record.fields["Weight (lb)"]) !== null && <span>Weight: {asNumber(record.fields["Weight (lb)"])} lb</span>}
                    {Boolean(record.fields["Follow-Up Needed"]) && <span>Follow-up: {asText(record.fields["Follow-Up Status"]) || "Needed"}</span>}
                    {asText(record.fields["Follow-Up Date"]) && <span>Due {formatDate(record.fields["Follow-Up Date"])}</span>}
                  </div>
                </article>
              );
            }) : <Empty>No daily care entries have been recorded for this animal yet.</Empty>}
          </div>
        </section>

        <section id="medical" className="mb-8 rounded-3xl border bg-white p-6 shadow-sm md:p-8">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3"><Stethoscope className="h-6 w-6 text-primary" /><div><h2 className="text-2xl font-bold">Medical</h2><p className="text-sm text-muted-foreground">Complete medical history for this animal.</p></div></div>
            <Link href="/portal/medical" className="text-sm font-semibold text-primary hover:underline">Open Medical Portal</Link>
          </div>
          <div className="space-y-3">
            {relatedMedical.length ? relatedMedical.map((record)=>(
              <article key={record.id} className="rounded-2xl bg-slate-50 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-semibold">{asText(record.fields["Record Type"]) || "Medical entry"}</p><p className="text-xs text-muted-foreground">{formatDate(record.fields["Date / Time"], true)}</p></div>{Boolean(record.fields["Needs Veterinarian Review"])&&<StatusPill>{asText(record.fields["Veterinary Review Status"])||"Needs Review"}</StatusPill>}</div>
                <div className="mt-3 space-y-1 text-sm">{asText(record.fields["Reason / Complaint"])&&<p><strong>Concern:</strong> {asText(record.fields["Reason / Complaint"])}</p>}{asText(record.fields["Assessment / Diagnosis"])&&<p><strong>Assessment:</strong> {asText(record.fields["Assessment / Diagnosis"])}</p>}{asText(record.fields["Treatment / Procedure"])&&<p><strong>Treatment:</strong> {asText(record.fields["Treatment / Procedure"])}</p>}{asText(record.fields["Medication / Product"])&&<p><strong>Medication:</strong> {asText(record.fields["Medication / Product"])}</p>}{asText(record.fields.Notes)&&<p><strong>Notes:</strong> {asText(record.fields.Notes)}</p>}</div>
              </article>
            )):<Empty>No medical records are linked to this animal yet.</Empty>}
          </div>
        </section>

        <section id="timeline" className="mb-8 rounded-3xl border bg-white p-6 shadow-sm md:p-8">
          <div className="mb-5 flex items-center gap-3"><Activity className="h-6 w-6 text-primary" /><div><h2 className="text-2xl font-bold">Timeline</h2><p className="text-sm text-muted-foreground">Chronological activity from the Animal Activity table.</p></div></div>
          <div className="space-y-3">
            {relatedActivity.length ? relatedActivity.map((record)=>(
              <article key={record.id} className="grid gap-2 rounded-2xl bg-slate-50 p-5 sm:grid-cols-[160px_1fr]"><p className="text-sm text-muted-foreground">{formatDate(record.fields["Activity Date / Time"], true)}</p><div><p className="font-semibold">{asText(record.fields.Summary)||asText(record.fields["Activity Type"])||"Animal activity"}</p>{asText(record.fields.Details)&&<p className="mt-1 text-sm text-muted-foreground">{asText(record.fields.Details)}</p>}</div></article>
            )):<Empty>No timeline activity has been recorded yet.</Empty>}
          </div>
          {relatedIntakes.length > 0 && <div className="mt-6 border-t pt-6"><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2"><ClipboardList className="h-5 w-5 text-primary"/><h3 className="font-bold">Intake history</h3></div><Link href="/portal/staff/intake" className="text-sm font-semibold text-primary hover:underline">Open Intake Management</Link></div>{relatedIntakes.map((record)=><article key={record.id} className="mb-3 rounded-2xl bg-slate-50 p-5 text-sm"><p className="font-semibold">{asText(record.fields["Intake Type"])||"Intake"} · {formatDate(record.fields["Intake Date"])}</p><p className="mt-2 text-muted-foreground">{[asText(record.fields["Source Person / Organization"]),asText(record.fields["Found / Origin Location"])].filter(Boolean).join(" · ")}</p>{asText(record.fields["Intake Notes"])&&<p className="mt-2">{asText(record.fields["Intake Notes"])}</p>}</article>)}</div>}
        </section>

        <section id="foster" className="mb-8 rounded-3xl border bg-white p-6 shadow-sm md:p-8">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3"><HeartHandshake className="h-6 w-6 text-primary" /><div><h2 className="text-2xl font-bold">Foster</h2><p className="text-sm text-muted-foreground">Placement history and care follow-up.</p></div></div>
            <Link href="/portal/staff/fosters" className="text-sm font-semibold text-primary hover:underline">Open Foster Management</Link>
          </div>
          <div className="space-y-3">
            {relatedFosters.length ? relatedFosters.map((record)=>(
              <article key={record.id} className="rounded-2xl bg-slate-50 p-5"><div className="flex flex-wrap justify-between gap-3"><div><p className="font-semibold">{asText(record.fields["Placement Type"])||"Foster placement"}</p><p className="text-sm text-muted-foreground">{formatDate(record.fields["Start Date"])}{asText(record.fields["End Date"])?` to ${formatDate(record.fields["End Date"])}`:""}</p></div><StatusPill>{asText(record.fields["Placement Status"])||"No status"}</StatusPill></div>{asText(record.fields["Care Instructions / Notes"])&&<p className="mt-3 text-sm"><strong>Care:</strong> {asText(record.fields["Care Instructions / Notes"])}</p>}{asText(record.fields["Foster Update Notes"])&&<p className="mt-2 text-sm"><strong>Updates:</strong> {asText(record.fields["Foster Update Notes"])}</p>}</article>
            )):<Empty>No foster placements are linked to this animal.</Empty>}
          </div>
        </section>

        <section id="adoption" className="mb-8 rounded-3xl border bg-white p-6 shadow-sm md:p-8">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3"><UserRoundCheck className="h-6 w-6 text-primary" /><div><h2 className="text-2xl font-bold">Adoption</h2><p className="text-sm text-muted-foreground">Applications and completed adoption records tied to this animal.</p></div></div>
            <Link href="/portal/staff/adoptions" className="text-sm font-semibold text-primary hover:underline">Open Adoption Management</Link>
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <div><h3 className="mb-3 font-bold">Applications</h3><div className="space-y-3">{relatedApplications.length?relatedApplications.map((record)=><article key={record.id} className="rounded-2xl bg-slate-50 p-5"><div className="flex justify-between gap-3"><div><p className="font-semibold">{[asText(record.fields["First Name"]),asText(record.fields["Last Name"])].filter(Boolean).join(" ")||"Applicant"}</p><p className="text-xs text-muted-foreground">{asText(record.fields["Application ID"])} · {formatDate(record.fields["Submitted At"])}</p></div><StatusPill>{asText(record.fields.Status)||"No status"}</StatusPill></div>{asText(record.fields["Reviewer Notes"])&&<p className="mt-3 text-sm">{asText(record.fields["Reviewer Notes"])}</p>}</article>):<Empty>No adoption applications are linked to this animal.</Empty>}</div></div>
            <div><h3 className="mb-3 font-bold">Adoptions</h3><div className="space-y-3">{relatedAdoptions.length?relatedAdoptions.map((record)=><article key={record.id} className="rounded-2xl bg-slate-50 p-5"><p className="font-semibold">{asText(record.fields["Adoption ID"])||"Adoption"}</p><p className="mt-1 text-sm text-muted-foreground">{formatDate(record.fields["Adoption Date"])}</p>{asNumber(record.fields["Adoption Fee Paid"])!==null&&<p className="mt-2 text-sm">Fee paid: ${asNumber(record.fields["Adoption Fee Paid"])?.toFixed(2)}</p>}{asText(record.fields["Placement Notes"])&&<p className="mt-2 text-sm">{asText(record.fields["Placement Notes"])}</p>}</article>):<Empty>No completed adoption record is linked to this animal.</Empty>}</div></div>
          </div>
        </section>

        <section id="documents" className="mb-8 rounded-3xl border bg-white p-6 shadow-sm md:p-8">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-4"><div className="flex items-center gap-3"><FileText className="h-6 w-6 text-primary" /><div><h2 className="text-2xl font-bold">Documents</h2><p className="text-sm text-muted-foreground">Agreements and files linked to this animal.</p></div></div><Link href="/portal/staff/documents" className="text-sm font-semibold text-primary hover:underline">Open Documents & Agreements</Link></div>
          <div className="space-y-3">
            {relatedDocuments.length?relatedDocuments.map((record)=>{
              const files=attachments(record.fields["Document File"]);
              return <article key={record.id} className="rounded-2xl bg-slate-50 p-5"><div className="flex flex-wrap justify-between gap-3"><div><p className="font-semibold">{asText(record.fields["Document Type"])||"Document"}</p><p className="text-xs text-muted-foreground">{formatDate(record.fields["Generated Date"])}{asText(record.fields["Signed Date"])?` · Signed ${formatDate(record.fields["Signed Date"])}`:""}</p></div><StatusPill>{asText(record.fields.Status)||"No status"}</StatusPill></div>{files.map((file)=><a key={file.url} href={file.url} target="_blank" rel="noopener noreferrer" className="mt-3 block text-sm font-semibold text-primary hover:underline">{file.filename}</a>)}</article>;
            }):<Empty>No documents are linked to this animal.</Empty>}
          </div>
        </section>

        <section id="photos" className="rounded-3xl border bg-white p-6 shadow-sm md:p-8">
          <div className="mb-5 flex items-center gap-3"><ImageIcon className="h-6 w-6 text-primary" /><div><h2 className="text-2xl font-bold">Photos</h2><p className="text-sm text-muted-foreground">Primary and additional animal photos stored with the Airtable record.</p></div></div>
          <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[...primaryPhotos,...additionalPhotos].map((photo,index)=><figure key={photo.url} className="overflow-hidden rounded-2xl border bg-slate-50"><img src={photo.url} alt={`${asText(animal.fields["Pet Name"])} photo ${index+1}`} className="aspect-square w-full object-cover"/><figcaption className="p-3 text-xs text-muted-foreground">{index===0?"Primary photo":photo.filename}</figcaption></figure>)}
          </div>
          {!primaryPhotos.length&&!additionalPhotos.length&&<Empty>No photos have been uploaded yet.</Empty>}
          <div className="mt-6 grid gap-4 border-t pt-6 md:grid-cols-2">
            <form action={uploadPrimaryPhoto} className="rounded-2xl bg-slate-50 p-5"><h3 className="font-bold">Upload primary photo</h3><p className="mt-1 text-xs text-muted-foreground">Image files up to 5 MB.</p><input name="photo" type="file" accept="image/*" required className="mt-4 block w-full text-sm"/><button className="mt-4 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white">Upload Primary Photo</button></form>
            <form action={uploadAdditionalPhoto} className="rounded-2xl bg-slate-50 p-5"><h3 className="font-bold">Add gallery photo</h3><p className="mt-1 text-xs text-muted-foreground">Image files up to 5 MB.</p><input name="photo" type="file" accept="image/*" required className="mt-4 block w-full text-sm"/><button className="mt-4 rounded-full border border-primary px-5 py-2.5 text-sm font-semibold text-primary">Add Photo</button></form>
          </div>
        </section>
      </div>
    </main>
  );
}
