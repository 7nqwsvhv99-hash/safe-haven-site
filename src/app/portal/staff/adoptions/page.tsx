import Link from "next/link";
import { revalidatePath } from "next/cache";
import {
  ArrowLeft,
  BadgeCheck,
  CalendarClock,
  ClipboardList,
  Heart,
  Search,
  UserCheck,
} from "lucide-react";
import {
  airtableCreate,
  airtableList,
  airtableUpdate,
  asStrings,
  asText,
  requirePortalRole,
  TABLES,
} from "@/lib/portal";

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

function formatDate(value: unknown) {
  const text = asText(value);
  if (!text) return "";
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return text;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "America/Chicago",
  }).format(date);
}

function todayChicago() {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "America/Chicago",
  }).format(new Date());
}

function Status({ value }: { value: string }) {
  return <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold">{value || "No status"}</span>;
}

export default async function AdoptionManagementPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  await requirePortalRole("Staff");
  const query = await searchParams;

  const [applications, animals, adoptions, fosterPlacements] = await Promise.all([
    airtableList(TABLES.adoptionApplications, [
      "Application ID",
      "Submitted At",
      "Status",
      "First Name",
      "Last Name",
      "Email",
      "Phone",
      "Preferred Contact",
      "Street Address",
      "Unit / Apt",
      "City",
      "State",
      "ZIP",
      "Applicant Is 18+",
      "Residence Type",
      "Own or Rent",
      "Landlord / Property Contact",
      "Landlord / Property Phone",
      "Other Adults in Home",
      "Children in Home",
      "Current / Previous Pet Experience",
      "Current Pets",
      "All Household Members Agree",
      "Household Allergies",
      "Long-Term Commitment",
      "Care Plan if Unable to Keep Pet",
      "Can Provide Timely Veterinary Care",
      "Willing to Allow Adjustment Time",
      "Ready to Adopt",
      "Reference 1 Name",
      "Reference 1 Phone",
      "Reference 2 Name",
      "Reference 2 Phone",
      "Has Used Veterinarian",
      "Veterinary Clinic Name",
      "Veterinary Clinic Phone",
      "Application Type",
      "Species Interest",
      "Preferred Animal",
      "Reviewer Notes",
      "Reference Check Notes",
      "Veterinary Check Notes",
      "Next Follow-Up Date",
      "Decision Date",
      "Follow-Up Status",
    ], { sort: [{ field: "Submitted At", direction: "desc" }] }),
    airtableList(TABLES.animals, [
      "Animal ID",
      "Pet Name",
      "Species",
      "Adoption Status",
      "Housing Type",
      "Current Housing Location",
      "Microchip Number",
      "Microchip Registration Status",
      "Adoption Fee",
      "Adoption Fee Status",
    ], { sort: [{ field: "Pet Name", direction: "asc" }] }),
    airtableList(TABLES.adoptions, [
      "Adoption ID",
      "Adoption Date",
      "Adoption Fee Paid",
      "Payment Method",
      "Follow-Up Date",
      "Follow-Up Status",
      "Placement Notes",
      "Animal",
      "Application",
      "Testimonial Requested",
      "Testimonial Received",
      "Website Permission",
      "Testimonial / Feedback",
      "Donation Received",
      "Donation Method",
      "Follow-up Notes",
    ], { sort: [{ field: "Adoption Date", direction: "desc" }] }),
    airtableList(TABLES.fosterPlacements, [
      "Animal",
      "Placement Status",
      "End Date",
      "Return / Outcome",
      "Outcome Notes",
    ]),
  ]);

  const animalById = new Map(animals.map((record) => [record.id, record]));
  const applicationById = new Map(applications.map((record) => [record.id, record]));
  const q = (query.q || "").trim().toLowerCase();

  const filteredApplications = applications.filter((record) => {
    const preferred = asStrings(record.fields["Preferred Animal"])
      .map((id) => asText(animalById.get(id)?.fields["Pet Name"]))
      .join(" ");
    const haystack = [
      asText(record.fields["Application ID"]),
      asText(record.fields["First Name"]),
      asText(record.fields["Last Name"]),
      asText(record.fields.Email),
      asText(record.fields.Phone),
      preferred,
    ].join(" ").toLowerCase();
    return (!q || haystack.includes(q)) &&
      (!query.status || asText(record.fields.Status) === query.status);
  });

  const openApplications = applications.filter((record) =>
    !["Declined", "Withdrawn", "Adopted"].includes(asText(record.fields.Status))
  );
  const approvedApplications = applications.filter((record) => asText(record.fields.Status) === "Approved");
  const followUpsDue = applications.filter((record) =>
    ["Due", "Needs Attention"].includes(asText(record.fields["Follow-Up Status"]))
  );
  const adoptedAnimals = new Set(adoptions.flatMap((record) => asStrings(record.fields.Animal)));

  async function updateApplication(formData: FormData) {
    "use server";
    await requirePortalRole("Staff");
    const applicationId = field(formData, "applicationId");
    const latest = await airtableList(TABLES.adoptionApplications, ["Status"]);
    if (!latest.some((record) => record.id === applicationId)) return;

    const status = field(formData, "status");
    const fields: Record<string, unknown> = {
      Status: status,
      "Reviewer Notes": field(formData, "reviewerNotes"),
      "Reference Check Notes": field(formData, "referenceNotes"),
      "Veterinary Check Notes": field(formData, "veterinaryNotes"),
      "Next Follow-Up Date": field(formData, "nextFollowUp") || null,
    };

    if (["Approved", "Declined", "Withdrawn", "Adopted"].includes(status)) {
      fields["Decision Date"] = field(formData, "decisionDate") || todayChicago();
    }

    await airtableUpdate(TABLES.adoptionApplications, applicationId, fields, true);
    revalidatePath("/portal/staff/adoptions");
  }

  async function completeAdoption(formData: FormData) {
    "use server";
    await requirePortalRole("Staff");
    const applicationId = field(formData, "applicationId");
    const animalId = field(formData, "animalId");
    if (!applicationId || !animalId) return;

    const [latestApplications, latestAnimals, latestAdoptions, latestFosters] = await Promise.all([
      airtableList(TABLES.adoptionApplications, ["Status", "Preferred Animal"]),
      airtableList(TABLES.animals, ["Adoption Status", "Housing Type", "Microchip Number"]),
      airtableList(TABLES.adoptions, ["Animal"]),
      airtableList(TABLES.fosterPlacements, ["Animal", "Placement Status"]),
    ]);

    const application = latestApplications.find((record) => record.id === applicationId);
    const animal = latestAnimals.find((record) => record.id === animalId);
    if (!application || !animal || asText(application.fields.Status) !== "Approved") return;
    if (asText(animal.fields["Adoption Status"]) === "Adopted") return;
    if (latestAdoptions.some((record) => asStrings(record.fields.Animal).includes(animalId))) return;

    const adoptionDate = field(formData, "adoptionDate") || todayChicago();
    const fee = optionalNumber(formData, "feePaid");
    const followUpDate = field(formData, "followUpDate");
    const paymentMethod = field(formData, "paymentMethod");

    await airtableCreate(TABLES.adoptions, {
      "Adoption Date": adoptionDate,
      ...(fee !== undefined ? { "Adoption Fee Paid": fee } : {}),
      ...(paymentMethod ? { "Payment Method": paymentMethod } : {}),
      ...(followUpDate ? { "Follow-Up Date": followUpDate, "Follow-Up Status": "Not Due" } : {}),
      ...(field(formData, "placementNotes") ? { "Placement Notes": field(formData, "placementNotes") } : {}),
      Animal: [animalId],
      Application: [applicationId],
      "Website Permission": "Not Requested",
    }, true);

    await airtableUpdate(TABLES.adoptionApplications, applicationId, {
      Status: "Adopted",
      "Decision Date": adoptionDate,
    }, true);

    await airtableUpdate(TABLES.animals, animalId, {
      "Adoption Status": "Adopted",
      "Public Listing": false,
      "Current Housing Location": [],
      ...(formData.get("microchipTransferred") === "on" && asText(animal.fields["Microchip Number"])
        ? { "Microchip Registration Status": "Transferred to Adopter" }
        : {}),
    }, true);

    const activeFosters = latestFosters.filter((record) =>
      asStrings(record.fields.Animal).includes(animalId) &&
      ["Active", "Needs Attention"].includes(asText(record.fields["Placement Status"]))
    );
    for (const foster of activeFosters) {
      await airtableUpdate(TABLES.fosterPlacements, foster.id, {
        "Placement Status": "Completed",
        "End Date": adoptionDate,
        "Return / Outcome": "Adopted",
        "Outcome Notes": "Placement closed automatically when adoption was completed in the Staff Portal.",
      }, true);
    }

    revalidatePath("/portal/staff/adoptions");
    revalidatePath("/portal/staff/animals");
    revalidatePath(`/portal/staff/animals/${animalId}`);
    revalidatePath("/portal/staff/care");
    revalidatePath("/adopt");
  }

  async function saveAdoptionFollowUp(formData: FormData) {
    "use server";
    await requirePortalRole("Staff");
    const adoptionId = field(formData, "adoptionId");
    const latest = await airtableList(TABLES.adoptions, ["Adoption Date"]);
    if (!latest.some((record) => record.id === adoptionId)) return;

    const donation = optionalNumber(formData, "donationReceived");
    await airtableUpdate(TABLES.adoptions, adoptionId, {
      "Follow-Up Status": field(formData, "followUpStatus"),
      "Follow-up Notes": field(formData, "followUpNotes"),
      "Testimonial Requested": formData.get("testimonialRequested") === "on",
      "Testimonial Received": formData.get("testimonialReceived") === "on",
      "Website Permission": field(formData, "websitePermission"),
      "Testimonial / Feedback": field(formData, "testimonialFeedback"),
      ...(donation !== undefined ? { "Donation Received": donation } : { "Donation Received": null }),
      ...(field(formData, "donationMethod") ? { "Donation Method": field(formData, "donationMethod") } : {}),
    }, true);

    revalidatePath("/portal/staff/adoptions");
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="container-custom py-10 md:py-12">
        <Link href="/portal/staff" className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline">
          <ArrowLeft className="h-4 w-4" /> Staff Portal
        </Link>

        <header className="mb-8">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-primary">Animal Placement</p>
          <h1 className="text-4xl font-bold tracking-tight md:text-5xl">Adoption Management</h1>
          <p className="mt-4 max-w-3xl text-muted-foreground">
            Review applications, document checks and follow-up, approve adopters, complete adoptions, and manage post-adoption contact whether an animal comes from shelter housing or foster care.
          </p>
        </header>

        <section className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ["Open applications", openApplications.length, ClipboardList],
            ["Approved", approvedApplications.length, BadgeCheck],
            ["Application follow-up", followUpsDue.length, CalendarClock],
            ["Completed adoptions", adoptions.length, Heart],
          ].map(([label, value, Icon]) => {
            const MetricIcon = Icon as typeof Heart;
            return <div key={String(label)} className="rounded-2xl border bg-white p-5 shadow-sm"><MetricIcon className="mb-3 h-5 w-5 text-primary"/><p className="text-3xl font-bold">{String(value)}</p><p className="mt-1 text-sm text-muted-foreground">{String(label)}</p></div>;
          })}
        </section>

        <section className="mb-8 rounded-3xl border bg-white p-6 shadow-sm">
          <form className="grid gap-3 md:grid-cols-[1fr_230px_auto]">
            <label className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground"/>
              <input name="q" defaultValue={query.q || ""} placeholder="Search applicant, application ID, animal, email, or phone" className="w-full rounded-xl border py-2.5 pl-9 pr-3"/>
            </label>
            <select name="status" defaultValue={query.status || ""} className="rounded-xl border bg-white px-3 py-2.5">
              <option value="">All statuses</option>
              {["New","Under Review","Contacted","Reference Check","Meet & Greet","Approved","Waitlist","Declined","Withdrawn","Adopted"].map((value)=><option key={value}>{value}</option>)}
            </select>
            <button className="rounded-xl border px-5 py-2.5 font-semibold hover:bg-slate-50">Filter</button>
          </form>
        </section>

        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <section className="rounded-3xl border bg-white p-6 shadow-sm md:p-8">
            <div className="mb-5"><h2 className="text-2xl font-bold">Application Queue</h2><p className="mt-2 text-sm text-muted-foreground">{filteredApplications.length} applications shown.</p></div>
            <div className="space-y-4">
              {filteredApplications.map((record) => {
                const preferredIds = asStrings(record.fields["Preferred Animal"]);
                const preferredAnimals = preferredIds.map((id) => animalById.get(id)).filter(Boolean);
                return (
                  <details key={record.id} className="rounded-2xl border p-5">
                    <summary className="cursor-pointer list-none">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h3 className="text-lg font-bold">{[asText(record.fields["First Name"]),asText(record.fields["Last Name"])].filter(Boolean).join(" ") || "Applicant"}</h3>
                          <p className="mt-1 text-sm text-muted-foreground">{asText(record.fields["Application ID"])} · {formatDate(record.fields["Submitted At"])}</p>
                          <p className="mt-2 text-sm">{preferredAnimals.length ? preferredAnimals.map((animal)=>asText(animal?.fields["Pet Name"])).join(", ") : asStrings(record.fields["Species Interest"]).join(" / ") || "General application"}</p>
                        </div>
                        <Status value={asText(record.fields.Status)} />
                      </div>
                    </summary>

                    <div className="mt-5 grid gap-5 border-t pt-5 lg:grid-cols-2">
                      <div className="space-y-4 text-sm">
                        <div><h4 className="font-bold">Contact</h4><p className="mt-2">{asText(record.fields.Email)} · {asText(record.fields.Phone)}</p><p>{[asText(record.fields["Street Address"]),asText(record.fields["Unit / Apt"]),asText(record.fields.City),asText(record.fields.State),asText(record.fields.ZIP)].filter(Boolean).join(", ")}</p><p>Preferred: {asText(record.fields["Preferred Contact"]) || "Not specified"}</p></div>
                        <div><h4 className="font-bold">Household</h4><p className="mt-2">{asText(record.fields["Residence Type"])} · {asText(record.fields["Own or Rent"])}</p><p>Adults: {asText(record.fields["Other Adults in Home"])}</p><p>Children: {asText(record.fields["Children in Home"])}</p><p>Current pets: {asText(record.fields["Current Pets"])}</p></div>
                        <div><h4 className="font-bold">Pet experience & readiness</h4><p className="mt-2">{asText(record.fields["Current / Previous Pet Experience"])}</p><p className="mt-2">Ready to adopt: {asText(record.fields["Ready to Adopt"])}</p></div>
                        <div><h4 className="font-bold">References & veterinarian</h4><p className="mt-2">{asText(record.fields["Reference 1 Name"])} · {asText(record.fields["Reference 1 Phone"])}</p><p>{asText(record.fields["Reference 2 Name"])} · {asText(record.fields["Reference 2 Phone"])}</p>{asText(record.fields["Veterinary Clinic Name"])&&<p className="mt-2">Vet: {asText(record.fields["Veterinary Clinic Name"])} · {asText(record.fields["Veterinary Clinic Phone"])}</p>}</div>
                      </div>

                      <form action={updateApplication} className="space-y-4 rounded-2xl bg-slate-50 p-5">
                        <input type="hidden" name="applicationId" value={record.id}/>
                        <label className="block text-sm font-medium">Application status<select name="status" defaultValue={asText(record.fields.Status)} className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5">{["New","Under Review","Contacted","Reference Check","Meet & Greet","Approved","Waitlist","Declined","Withdrawn","Adopted"].map((value)=><option key={value}>{value}</option>)}</select></label>
                        <label className="block text-sm font-medium">Reviewer notes<textarea name="reviewerNotes" rows={3} defaultValue={asText(record.fields["Reviewer Notes"])} className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5"/></label>
                        <label className="block text-sm font-medium">Reference check notes<textarea name="referenceNotes" rows={3} defaultValue={asText(record.fields["Reference Check Notes"])} className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5"/></label>
                        <label className="block text-sm font-medium">Veterinary check notes<textarea name="veterinaryNotes" rows={3} defaultValue={asText(record.fields["Veterinary Check Notes"])} className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5"/></label>
                        <label className="block text-sm font-medium">Next follow-up<input name="nextFollowUp" type="date" defaultValue={asText(record.fields["Next Follow-Up Date"]).slice(0,10)} className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5"/><span className="mt-1 block text-xs text-muted-foreground">Decision date is recorded automatically when the application reaches a final decision.</span></label>
                        <button className="rounded-full bg-primary px-5 py-2.5 font-semibold text-white">Save Application Review</button>
                      </form>
                    </div>
                  </details>
                );
              })}
              {!filteredApplications.length && <p className="text-sm text-muted-foreground">No applications match the selected filters.</p>}
            </div>
          </section>

          <div className="space-y-6">
            <section className="rounded-3xl border bg-white p-6 shadow-sm md:p-8">
              <div className="mb-5 flex items-center gap-3"><UserCheck className="h-6 w-6 text-primary"/><div><h2 className="text-2xl font-bold">Complete Adoption</h2><p className="text-sm text-muted-foreground">Available for approved applications.</p></div></div>
              <form action={completeAdoption} className="space-y-4">
                <label className="block text-sm font-medium">Approved application<select name="applicationId" required defaultValue="" className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5"><option value="" disabled>Select application</option>{approvedApplications.map((record)=><option key={record.id} value={record.id}>{[asText(record.fields["First Name"]),asText(record.fields["Last Name"])].filter(Boolean).join(" ")} · {asText(record.fields["Application ID"])}</option>)}</select></label>
                <label className="block text-sm font-medium">Animal<select name="animalId" required defaultValue="" className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5"><option value="" disabled>Select animal</option>{animals.filter((animal)=>asText(animal.fields["Adoption Status"])!=="Adopted"&&!adoptedAnimals.has(animal.id)).map((animal)=><option key={animal.id} value={animal.id}>{asText(animal.fields["Pet Name"])} · {asText(animal.fields["Animal ID"])} · {asText(animal.fields["Housing Type"])}</option>)}</select></label>
                <label className="block text-sm font-medium">Adoption date<input name="adoptionDate" type="date" defaultValue={todayChicago()} className="mt-2 w-full rounded-xl border px-3 py-2.5"/></label>
                <div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm font-medium">Fee paid<input name="feePaid" type="number" min="0" step="0.01" className="mt-2 w-full rounded-xl border px-3 py-2.5"/></label><label className="block text-sm font-medium">Payment method<select name="paymentMethod" defaultValue="" className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5"><option value="">Select</option>{["Cash","Check","Card","PayPal","Venmo","Other"].map((value)=><option key={value}>{value}</option>)}</select></label></div>
                <details className="rounded-2xl bg-slate-50 p-4"><summary className="cursor-pointer text-sm font-semibold">Additional adoption details</summary><div className="mt-4 space-y-4"><label className="block text-sm font-medium">Follow-up date<input name="followUpDate" type="date" className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5"/></label><label className="block text-sm font-medium">Placement notes<textarea name="placementNotes" rows={3} className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5"/></label><label className="flex items-start gap-3 text-sm"><input name="microchipTransferred" type="checkbox" className="mt-1"/><span><strong>Microchip registration transferred to adopter</strong><span className="mt-1 block text-muted-foreground">Check only after the transfer has actually been completed.</span></span></label></div></details>
                <p className="text-xs text-muted-foreground">Completing an adoption removes the animal from the public listing, clears any shelter housing assignment, and closes an active foster placement as Adopted when one exists.</p>
                <button className="w-full rounded-full bg-primary px-5 py-3 font-semibold text-white">Complete Adoption</button>
              </form>
            </section>

            <section className="rounded-3xl border bg-white p-6 shadow-sm md:p-8">
              <div className="mb-5"><h2 className="text-2xl font-bold">Post-Adoption Follow-Up</h2><p className="mt-2 text-sm text-muted-foreground">Track adjustment, testimonials, website permission, and optional donations.</p></div>
              <div className="space-y-4">
                {adoptions.slice(0,30).map((record)=>{
                  const animal=animalById.get(asStrings(record.fields.Animal)[0]);
                  const application=applicationById.get(asStrings(record.fields.Application)[0]);
                  return <details key={record.id} className="rounded-2xl border p-4"><summary className="cursor-pointer list-none"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold">{asText(animal?.fields["Pet Name"])||"Animal"} · {[asText(application?.fields["First Name"]),asText(application?.fields["Last Name"])].filter(Boolean).join(" ")||"Adopter"}</p><p className="mt-1 text-xs text-muted-foreground">{formatDate(record.fields["Adoption Date"])}{asText(record.fields["Follow-Up Date"])?` · Follow-up ${formatDate(record.fields["Follow-Up Date"])}`:""}</p></div><Status value={asText(record.fields["Follow-Up Status"])}/></div></summary><form action={saveAdoptionFollowUp} className="mt-4 space-y-3 border-t pt-4"><input type="hidden" name="adoptionId" value={record.id}/><label className="block text-sm font-medium">Follow-up status<select name="followUpStatus" defaultValue={asText(record.fields["Follow-Up Status"])} className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5"><option value="">Select</option>{["Not Due","Due","Follow-Up Completed","Needs Attention"].map((value)=><option key={value}>{value}</option>)}</select></label><label className="block text-sm font-medium">Follow-up notes<textarea name="followUpNotes" rows={3} defaultValue={asText(record.fields["Follow-up Notes"])} className="mt-2 w-full rounded-xl border px-3 py-2.5"/></label><div className="grid gap-3 sm:grid-cols-2"><label className="flex items-center gap-2 text-sm"><input name="testimonialRequested" type="checkbox" defaultChecked={Boolean(record.fields["Testimonial Requested"])}/> Testimonial requested</label><label className="flex items-center gap-2 text-sm"><input name="testimonialReceived" type="checkbox" defaultChecked={Boolean(record.fields["Testimonial Received"])}/> Testimonial received</label></div><label className="block text-sm font-medium">Website permission<select name="websitePermission" defaultValue={asText(record.fields["Website Permission"])||"Not Requested"} className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5">{["Not Requested","Granted","Declined"].map((value)=><option key={value}>{value}</option>)}</select></label><label className="block text-sm font-medium">Testimonial / feedback<textarea name="testimonialFeedback" rows={3} defaultValue={asText(record.fields["Testimonial / Feedback"])} className="mt-2 w-full rounded-xl border px-3 py-2.5"/></label><div className="grid gap-3 sm:grid-cols-2"><label className="block text-sm font-medium">Donation received<input name="donationReceived" type="number" min="0" step="0.01" defaultValue={asNumber(record.fields["Donation Received"])??""} className="mt-2 w-full rounded-xl border px-3 py-2.5"/></label><label className="block text-sm font-medium">Donation method<select name="donationMethod" defaultValue={asText(record.fields["Donation Method"])} className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5"><option value="">Select</option>{["Cash","Check","Card","PayPal","Venmo","Other"].map((value)=><option key={value}>{value}</option>)}</select></label></div><button className="rounded-full border border-primary px-5 py-2.5 font-semibold text-primary">Save Follow-Up</button></form></details>;
                })}
                {!adoptions.length&&<p className="text-sm text-muted-foreground">No completed adoptions have been recorded yet.</p>}
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
