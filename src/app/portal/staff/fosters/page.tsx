import Link from "next/link";
import { revalidatePath } from "next/cache";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarClock,
  HeartHandshake,
  Home,
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

function field(form: FormData, name: string) {
  return String(form.get(name) || "").trim();
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

function nextPlacementId(records: Awaited<ReturnType<typeof airtableList>>) {
  const year = new Intl.DateTimeFormat("en-US", { year: "numeric", timeZone: "America/Chicago" }).format(new Date());
  const matcher = new RegExp(`^FOST-${year}-(\\d+)$`);
  const max = records.reduce((current, record) => {
    const match = asText(record.fields["Foster Placement ID"]).match(matcher);
    return match ? Math.max(current, Number(match[1])) : current;
  }, 0);
  return `FOST-${year}-${String(max + 1).padStart(3, "0")}`;
}

function nextUpdateId(records: Awaited<ReturnType<typeof airtableList>>) {
  const date = todayChicago().replaceAll("-", "");
  const prefix = `FU-${date}-`;
  const max = records.reduce((current, record) => {
    const value = asText(record.fields["Update ID"]);
    if (!value.startsWith(prefix)) return current;
    const number = Number(value.slice(prefix.length));
    return Number.isFinite(number) ? Math.max(current, number) : current;
  }, 0);
  return `${prefix}${String(max + 1).padStart(3, "0")}`;
}

function Status({ value }: { value: string }) {
  return <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold">{value || "No status"}</span>;
}

export default async function FosterManagementPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const context = await requirePortalRole("Staff");
  const query = await searchParams;

  const [applications, placements, animals, updates] = await Promise.all([
    airtableList(TABLES.fosterApplications, [
      "Foster Application ID",
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
      "Current Pets",
      "Household Allergies",
      "All Household Members Agree",
      "Typical Schedule / Time Away",
      "Animal / Foster Experience",
      "Species Interest",
      "Foster Interests",
      "Ready to Foster",
      "Willing to Foster Medical Needs",
      "Willing to Foster Behavior Challenges",
      "Willing to Transport for Veterinary Care",
      "Willing to Provide Progress Updates",
      "Willing to Accommodate Potential Adopter Visits",
      "Special Foster Notes",
      "Reference Name",
      "Reference Phone",
      "Reference Email",
      "Has Used Veterinarian",
      "Veterinary Clinic Name",
      "Veterinary Clinic Phone",
      "Reviewer Notes",
      "Reference Check Notes",
      "Veterinary Check Notes",
      "Next Follow-Up Date",
      "Decision Date",
      "Follow-Up Status",
    ], { sort: [{ field: "Submitted At", direction: "desc" }] }),
    airtableList(TABLES.fosterPlacements, [
      "Foster Placement ID",
      "Animal",
      "Foster Application",
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
    airtableList(TABLES.animals, [
      "Animal ID",
      "Pet Name",
      "Species",
      "Adoption Status",
      "Housing Type",
      "Current Housing Location",
      "Medical Summary",
    ], { sort: [{ field: "Pet Name", direction: "asc" }] }),
    airtableList(TABLES.fosterUpdates, [
      "Update ID",
      "Submitted By",
      "Submitted At",
      "Update Type",
      "General Progress",
      "Appetite / Eating",
      "Behavior",
      "Medication / Treatment Update",
      "Supply Need",
      "Health Concern",
      "Behavior Concern",
      "Unable to Continue Placement",
      "Needs Staff Attention",
      "Priority",
      "Staff Response",
      "Resolution Status",
      "Resolved By",
      "Resolved At",
      "Internal Notes",
      "Foster Placement",
      "Animal",
    ], { sort: [{ field: "Submitted At", direction: "desc" }] }),
  ]);

  const animalById = new Map(animals.map((record) => [record.id, record]));
  const appById = new Map(applications.map((record) => [record.id, record]));
  const activePlacements = placements.filter((record) =>
    ["Planned", "Active", "Needs Attention"].includes(asText(record.fields["Placement Status"]))
  );
  const animalWithActiveFoster = new Set(activePlacements.flatMap((record) => asStrings(record.fields.Animal)));
  const approvedApplications = applications.filter((record) => asText(record.fields.Status) === "Approved");
  const applicationFollowUps = applications.filter((record) =>
    ["Due", "Needs Attention"].includes(asText(record.fields["Follow-Up Status"]))
  );
  const placementFollowUps = activePlacements.filter((record) =>
    ["Due", "Needs Attention"].includes(asText(record.fields["Check-In Status"]))
  );
  const unresolvedUpdates = updates.filter((record) =>
    !["Resolved", "Closed"].includes(asText(record.fields["Resolution Status"])) &&
    (
      Boolean(record.fields["Needs Staff Attention"]) ||
      Boolean(record.fields["Unable to Continue Placement"]) ||
      ["High", "Urgent"].includes(asText(record.fields.Priority))
    )
  );

  const q = (query.q || "").trim().toLowerCase();
  const filteredApplications = applications.filter((record) => {
    const haystack = [
      asText(record.fields["Foster Application ID"]),
      asText(record.fields["First Name"]),
      asText(record.fields["Last Name"]),
      asText(record.fields.Email),
      asText(record.fields.Phone),
      asStrings(record.fields["Species Interest"]).join(" "),
      asStrings(record.fields["Foster Interests"]).join(" "),
    ].join(" ").toLowerCase();
    return (!q || haystack.includes(q)) &&
      (!query.status || asText(record.fields.Status) === query.status);
  });

  async function updateApplication(formData: FormData) {
    "use server";
    await requirePortalRole("Staff");
    const applicationId = field(formData, "applicationId");
    const latest = await airtableList(TABLES.fosterApplications, ["Status"]);
    if (!latest.some((record) => record.id === applicationId)) return;

    const status = field(formData, "status");
    const payload: Record<string, unknown> = {
      Status: status,
      "Reviewer Notes": field(formData, "reviewerNotes"),
      "Reference Check Notes": field(formData, "referenceNotes"),
      "Veterinary Check Notes": field(formData, "veterinaryNotes"),
      "Next Follow-Up Date": field(formData, "nextFollowUp") || null,
    };
    if (["Approved", "Declined", "Withdrawn"].includes(status)) {
      payload["Decision Date"] = field(formData, "decisionDate") || todayChicago();
    }
    await airtableUpdate(TABLES.fosterApplications, applicationId, payload, true);
    revalidatePath("/portal/staff/fosters");
    revalidatePath("/portal/foster");
  }

  async function createPlacement(formData: FormData) {
    "use server";
    await requirePortalRole("Staff");
    const applicationId = field(formData, "applicationId");
    const animalIds = formData.getAll("animalIds").map(String).filter(Boolean);
    if (!applicationId || !animalIds.length) return;

    const [latestApps, latestAnimals, latestPlacements] = await Promise.all([
      airtableList(TABLES.fosterApplications, ["Status"]),
      airtableList(TABLES.animals, ["Adoption Status", "Housing Type"]),
      airtableList(TABLES.fosterPlacements, ["Foster Placement ID", "Animal", "Placement Status"]),
    ]);

    const application = latestApps.find((record) => record.id === applicationId);
    if (!application || asText(application.fields.Status) !== "Approved") return;

    const alreadyPlaced = new Set(
      latestPlacements
        .filter((record) => ["Planned", "Active", "Needs Attention"].includes(asText(record.fields["Placement Status"])))
        .flatMap((record) => asStrings(record.fields.Animal))
    );
    const validAnimalIds = animalIds.filter((animalId) => {
      const animal = latestAnimals.find((record) => record.id === animalId);
      return animal && asText(animal.fields["Adoption Status"]) !== "Adopted" && !alreadyPlaced.has(animalId);
    });
    if (!validAnimalIds.length) return;

    const placementId = nextPlacementId(latestPlacements);
    await airtableCreate(TABLES.fosterPlacements, {
      "Foster Placement ID": placementId,
      Animal: validAnimalIds,
      "Foster Application": [applicationId],
      "Placement Status": field(formData, "placementStatus") || "Active",
      "Placement Type": field(formData, "placementType") || "Other",
      "Start Date": field(formData, "startDate") || todayChicago(),
      ...(field(formData, "expectedEndDate") ? { "Expected End Date": field(formData, "expectedEndDate") } : {}),
      ...(field(formData, "nextCheckInDate") ? { "Next Check-In Date": field(formData, "nextCheckInDate"), "Check-In Status": "Not Due" } : {}),
      ...(field(formData, "careInstructions") ? { "Care Instructions / Notes": field(formData, "careInstructions") } : {}),
    }, true);

    for (const animalId of validAnimalIds) {
      await airtableUpdate(TABLES.animals, animalId, {
        "Housing Type": "Foster Home",
        "Current Housing Location": [],
      }, true);
      revalidatePath(`/portal/staff/animals/${animalId}`);
    }

    revalidatePath("/portal/staff/fosters");
    revalidatePath("/portal/staff/animals");
    revalidatePath("/portal/staff/care");
    revalidatePath("/portal/foster");
  }

  async function updatePlacement(formData: FormData) {
    "use server";
    await requirePortalRole("Staff");
    const placementId = field(formData, "placementId");
    const latest = await airtableList(TABLES.fosterPlacements, ["Placement Status"]);
    if (!latest.some((record) => record.id === placementId)) return;

    await airtableUpdate(TABLES.fosterPlacements, placementId, {
      "Placement Status": field(formData, "placementStatus"),
      "Expected End Date": field(formData, "expectedEndDate") || null,
      "Next Check-In Date": field(formData, "nextCheckInDate") || null,
      "Check-In Status": field(formData, "checkInStatus"),
      "Care Instructions / Notes": field(formData, "careInstructions"),
      "Foster Update Notes": field(formData, "fosterUpdateNotes"),
    }, true);

    revalidatePath("/portal/staff/fosters");
    revalidatePath("/portal/foster");
  }

  async function endPlacement(formData: FormData) {
    "use server";
    await requirePortalRole("Staff");
    const placementId = field(formData, "placementId");
    const outcome = field(formData, "outcome");
    if (!placementId || !outcome || outcome === "Adopted") return;

    const latestPlacements = await airtableList(TABLES.fosterPlacements, ["Animal", "Placement Status"]);
    const placement = latestPlacements.find((record) => record.id === placementId);
    if (!placement || !["Planned", "Active", "Needs Attention"].includes(asText(placement.fields["Placement Status"]))) return;

    const animalIds = asStrings(placement.fields.Animal);
    const endDate = field(formData, "endDate") || todayChicago();

    await airtableUpdate(TABLES.fosterPlacements, placementId, {
      "Placement Status": "Completed",
      "End Date": endDate,
      "Return / Outcome": outcome,
      "Outcome Notes": field(formData, "outcomeNotes"),
      "Next Check-In Date": null,
      "Check-In Status": "Check-In Completed",
    }, true);

    if (outcome === "Returned to Shelter" || outcome === "Medical Transfer" || outcome === "Other") {
      for (const animalId of animalIds) {
        await airtableUpdate(TABLES.animals, animalId, {
          "Housing Type": "In Shelter",
          "Current Housing Location": [],
        }, true);
        revalidatePath(`/portal/staff/animals/${animalId}`);
      }
    }

    revalidatePath("/portal/staff/fosters");
    revalidatePath("/portal/staff/animals");
    revalidatePath("/portal/staff/care");
    revalidatePath("/portal/foster");
  }

  async function transferPlacement(formData: FormData) {
    "use server";
    await requirePortalRole("Staff");
    const placementId = field(formData, "placementId");
    const destinationApplicationId = field(formData, "destinationApplicationId");
    if (!placementId || !destinationApplicationId) return;

    const [latestPlacements, latestApps] = await Promise.all([
      airtableList(TABLES.fosterPlacements, ["Foster Placement ID", "Animal", "Placement Status"]),
      airtableList(TABLES.fosterApplications, ["Status"]),
    ]);
    const currentPlacement = latestPlacements.find((record) => record.id === placementId);
    const destination = latestApps.find((record) => record.id === destinationApplicationId);
    if (!currentPlacement || !destination || asText(destination.fields.Status) !== "Approved") return;
    if (!["Planned", "Active", "Needs Attention"].includes(asText(currentPlacement.fields["Placement Status"]))) return;

    const animalIds = asStrings(currentPlacement.fields.Animal);
    const transferDate = field(formData, "transferDate") || todayChicago();

    await airtableUpdate(TABLES.fosterPlacements, placementId, {
      "Placement Status": "Completed",
      "End Date": transferDate,
      "Return / Outcome": "Transferred to Another Foster",
      "Outcome Notes": field(formData, "transferNotes") || "Transferred to another approved foster.",
      "Next Check-In Date": null,
      "Check-In Status": "Check-In Completed",
    }, true);

    await airtableCreate(TABLES.fosterPlacements, {
      "Foster Placement ID": nextPlacementId(latestPlacements),
      Animal: animalIds,
      "Foster Application": [destinationApplicationId],
      "Placement Status": "Active",
      "Placement Type": field(formData, "placementType") || "Other",
      "Start Date": transferDate,
      ...(field(formData, "nextCheckInDate") ? { "Next Check-In Date": field(formData, "nextCheckInDate"), "Check-In Status": "Not Due" } : {}),
      ...(field(formData, "careInstructions") ? { "Care Instructions / Notes": field(formData, "careInstructions") } : {}),
    }, true);

    for (const animalId of animalIds) {
      await airtableUpdate(TABLES.animals, animalId, {
        "Housing Type": "Foster Home",
        "Current Housing Location": [],
      }, true);
      revalidatePath(`/portal/staff/animals/${animalId}`);
    }

    revalidatePath("/portal/staff/fosters");
    revalidatePath("/portal/foster");
  }

  async function addStaffCheckIn(formData: FormData) {
    "use server";
    const current = await requirePortalRole("Staff");
    const placementId = field(formData, "placementId");
    const latestPlacements = await airtableList(TABLES.fosterPlacements, ["Animal", "Placement Status"]);
    const placement = latestPlacements.find((record) => record.id === placementId);
    if (!placement) return;

    const latestUpdates = await airtableList(TABLES.fosterUpdates, ["Update ID"]);
    const animalIds = asStrings(placement.fields.Animal);
    const healthConcern = field(formData, "healthConcern");
    const behaviorConcern = field(formData, "behaviorConcern");
    const supplyNeed = field(formData, "supplyNeed");
    const priority = field(formData, "priority") || "Normal";
    const needsAttention = Boolean(healthConcern || behaviorConcern || supplyNeed || priority !== "Normal");

    await airtableCreate(TABLES.fosterUpdates, {
      "Update ID": nextUpdateId(latestUpdates),
      "Submitted By": current.email,
      "Submitted At": new Date().toISOString(),
      "Update Type": field(formData, "updateType") || "Routine Check-In",
      ...(field(formData, "generalProgress") ? { "General Progress": field(formData, "generalProgress") } : {}),
      ...(field(formData, "appetite") ? { "Appetite / Eating": field(formData, "appetite") } : {}),
      ...(field(formData, "behavior") ? { Behavior: field(formData, "behavior") } : {}),
      ...(field(formData, "medication") ? { "Medication / Treatment Update": field(formData, "medication") } : {}),
      ...(supplyNeed ? { "Supply Need": supplyNeed } : {}),
      ...(healthConcern ? { "Health Concern": healthConcern } : {}),
      ...(behaviorConcern ? { "Behavior Concern": behaviorConcern } : {}),
      "Needs Staff Attention": needsAttention,
      Priority: priority,
      "Resolution Status": needsAttention ? "In Review" : "Resolved",
      ...(needsAttention ? {} : { "Resolved By": current.displayName, "Resolved At": new Date().toISOString() }),
      ...(field(formData, "internalNotes") ? { "Internal Notes": field(formData, "internalNotes") } : {}),
      "Foster Placement": [placementId],
      Animal: animalIds,
    }, true);

    await airtableUpdate(TABLES.fosterPlacements, placementId, {
      "Check-In Status": needsAttention ? "Needs Attention" : "Check-In Completed",
      ...(field(formData, "nextCheckInDate") ? { "Next Check-In Date": field(formData, "nextCheckInDate") } : {}),
      ...(field(formData, "generalProgress") ? { "Foster Update Notes": field(formData, "generalProgress") } : {}),
    }, true);

    revalidatePath("/portal/staff/fosters");
    revalidatePath("/portal/staff");
    revalidatePath("/portal/foster");
  }

  async function resolveUpdate(formData: FormData) {
    "use server";
    const current = await requirePortalRole("Staff");
    const updateId = field(formData, "updateId");
    const resolutionStatus = field(formData, "resolutionStatus");
    const latestUpdates = await airtableList(TABLES.fosterUpdates, ["Foster Placement"]);
    const update = latestUpdates.find((record) => record.id === updateId);
    if (!update) return;

    const resolved = ["Resolved", "Closed"].includes(resolutionStatus);
    await airtableUpdate(TABLES.fosterUpdates, updateId, {
      "Staff Response": field(formData, "staffResponse"),
      "Internal Notes": field(formData, "internalNotes"),
      "Resolution Status": resolutionStatus,
      ...(resolved ? {
        "Needs Staff Attention": false,
        "Resolved By": current.displayName,
        "Resolved At": new Date().toISOString(),
      } : {}),
    }, true);

    if (resolved) {
      for (const placementId of asStrings(update.fields["Foster Placement"])) {
        await airtableUpdate(TABLES.fosterPlacements, placementId, {
          "Check-In Status": "Check-In Completed",
        }, true);
      }
    }

    revalidatePath("/portal/staff/fosters");
    revalidatePath("/portal/staff");
    revalidatePath("/portal/foster");
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="container-custom py-10 md:py-12">
        <Link href="/portal/staff" className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline">
          <ArrowLeft className="h-4 w-4" /> Staff Portal
        </Link>

        <header className="mb-8">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-primary">Animal Placement</p>
          <h1 className="text-4xl font-bold tracking-tight md:text-5xl">Foster Management</h1>
          <p className="mt-4 max-w-3xl text-muted-foreground">
            Review foster applicants, create and transfer placements, track check-ins, respond to concerns, and move animals between foster care and shelter housing without forcing a fixed lifecycle.
          </p>
        </header>

        <section className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ["Active placements", activePlacements.length, Home],
            ["Approved fosters", approvedApplications.length, UserCheck],
            ["Check-ins due", placementFollowUps.length, CalendarClock],
            ["Needs attention", unresolvedUpdates.length + applicationFollowUps.length, AlertTriangle],
          ].map(([label, value, Icon]) => {
            const MetricIcon = Icon as typeof Home;
            return <div key={String(label)} className="rounded-2xl border bg-white p-5 shadow-sm"><MetricIcon className="mb-3 h-5 w-5 text-primary"/><p className="text-3xl font-bold">{String(value)}</p><p className="mt-1 text-sm text-muted-foreground">{String(label)}</p></div>;
          })}
        </section>

        <section className="mb-8 rounded-3xl border bg-white p-6 shadow-sm">
          <form className="grid gap-3 md:grid-cols-[1fr_230px_auto]">
            <label className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground"/><input name="q" defaultValue={query.q || ""} placeholder="Search foster, email, phone, species, or interest" className="w-full rounded-xl border py-2.5 pl-9 pr-3"/></label>
            <select name="status" defaultValue={query.status || ""} className="rounded-xl border bg-white px-3 py-2.5"><option value="">All application statuses</option>{["New","Under Review","Contacted","Reference Check","Approved","Declined","Withdrawn"].map((value)=><option key={value}>{value}</option>)}</select>
            <button className="rounded-xl border px-5 py-2.5 font-semibold hover:bg-slate-50">Filter</button>
          </form>
        </section>

        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <section className="rounded-3xl border bg-white p-6 shadow-sm md:p-8">
              <div className="mb-5"><h2 className="text-2xl font-bold">Foster Application Queue</h2><p className="mt-2 text-sm text-muted-foreground">{filteredApplications.length} applications shown.</p></div>
              <div className="space-y-4">
                {filteredApplications.map((record) => (
                  <details key={record.id} className="rounded-2xl border p-5">
                    <summary className="cursor-pointer list-none">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div><h3 className="text-lg font-bold">{[asText(record.fields["First Name"]),asText(record.fields["Last Name"])].filter(Boolean).join(" ") || "Applicant"}</h3><p className="mt-1 text-sm text-muted-foreground">{asText(record.fields["Foster Application ID"])} · {formatDate(record.fields["Submitted At"])}</p><p className="mt-2 text-sm">{asStrings(record.fields["Species Interest"]).join(" / ") || "Species not specified"}{asStrings(record.fields["Foster Interests"]).length ? ` · ${asStrings(record.fields["Foster Interests"]).join(", ")}` : ""}</p></div>
                        <Status value={asText(record.fields.Status)}/>
                      </div>
                    </summary>
                    <div className="mt-5 grid gap-5 border-t pt-5 lg:grid-cols-2">
                      <div className="space-y-4 text-sm">
                        <div><h4 className="font-bold">Contact & household</h4><p className="mt-2">{asText(record.fields.Email)} · {asText(record.fields.Phone)}</p><p>{[asText(record.fields["Street Address"]),asText(record.fields["Unit / Apt"]),asText(record.fields.City),asText(record.fields.State),asText(record.fields.ZIP)].filter(Boolean).join(", ")}</p><p className="mt-2">{asText(record.fields["Residence Type"])} · {asText(record.fields["Own or Rent"])}</p><p>Other adults: {asText(record.fields["Other Adults in Home"])}</p><p>Children: {asText(record.fields["Children in Home"])}</p><p>Current pets: {asText(record.fields["Current Pets"])}</p></div>
                        <div><h4 className="font-bold">Experience & availability</h4><p className="mt-2">{asText(record.fields["Animal / Foster Experience"])}</p><p className="mt-2">Ready: {asText(record.fields["Ready to Foster"])}</p><p>Medical needs: {asText(record.fields["Willing to Foster Medical Needs"])}</p><p>Behavior challenges: {asText(record.fields["Willing to Foster Behavior Challenges"])}</p><p>Transport to vet: {asText(record.fields["Willing to Transport for Veterinary Care"])}</p><p>Progress updates: {asText(record.fields["Willing to Provide Progress Updates"])}</p><p>Potential adopter visits: {asText(record.fields["Willing to Accommodate Potential Adopter Visits"])}</p></div>
                        <div><h4 className="font-bold">Schedule</h4><p className="mt-2">{asText(record.fields["Typical Schedule / Time Away"])}</p>{asText(record.fields["Special Foster Notes"])&&<p className="mt-2"><strong>Special notes:</strong> {asText(record.fields["Special Foster Notes"])}</p>}</div>
                        <div><h4 className="font-bold">Reference & veterinarian</h4><p className="mt-2">{asText(record.fields["Reference Name"])} · {asText(record.fields["Reference Phone"])}</p>{asText(record.fields["Veterinary Clinic Name"])&&<p className="mt-2">Vet: {asText(record.fields["Veterinary Clinic Name"])} · {asText(record.fields["Veterinary Clinic Phone"])}</p>}</div>
                      </div>
                      <form action={updateApplication} className="space-y-4 rounded-2xl bg-slate-50 p-5">
                        <input type="hidden" name="applicationId" value={record.id}/>
                        <label className="block text-sm font-medium">Status<select name="status" defaultValue={asText(record.fields.Status)} className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5">{["New","Under Review","Contacted","Reference Check","Approved","Declined","Withdrawn"].map((value)=><option key={value}>{value}</option>)}</select></label>
                        <label className="block text-sm font-medium">Reviewer notes<textarea name="reviewerNotes" rows={3} defaultValue={asText(record.fields["Reviewer Notes"])} className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5"/></label>
                        <label className="block text-sm font-medium">Reference check notes<textarea name="referenceNotes" rows={3} defaultValue={asText(record.fields["Reference Check Notes"])} className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5"/></label>
                        <label className="block text-sm font-medium">Veterinary check notes<textarea name="veterinaryNotes" rows={3} defaultValue={asText(record.fields["Veterinary Check Notes"])} className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5"/></label>
                        <label className="block text-sm font-medium">Next follow-up<input name="nextFollowUp" type="date" defaultValue={asText(record.fields["Next Follow-Up Date"]).slice(0,10)} className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5"/><span className="mt-1 block text-xs text-muted-foreground">Decision date is recorded automatically when the application reaches a final decision.</span></label>
                        <button className="rounded-full bg-primary px-5 py-2.5 font-semibold text-white">Save Foster Review</button>
                      </form>
                    </div>
                  </details>
                ))}
              </div>
            </section>

            <section className="rounded-3xl border bg-white p-6 shadow-sm md:p-8">
              <div className="mb-5 flex items-center gap-3"><HeartHandshake className="h-6 w-6 text-primary"/><div><h2 className="text-2xl font-bold">Active Foster Placements</h2><p className="text-sm text-muted-foreground">Manage placement details, check-ins, returns, and transfers.</p></div></div>
              <div className="space-y-4">
                {activePlacements.map((placement) => {
                  const foster = appById.get(asStrings(placement.fields["Foster Application"])[0]);
                  const placementAnimals = asStrings(placement.fields.Animal).map((id)=>animalById.get(id)).filter(Boolean);
                  return (
                    <details key={placement.id} className="rounded-2xl border p-5">
                      <summary className="cursor-pointer list-none">
                        <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-bold">{placementAnimals.map((animal)=>asText(animal?.fields["Pet Name"])).join(", ") || "Foster placement"}</h3><p className="mt-1 text-sm text-muted-foreground">{asText(placement.fields["Foster Placement ID"])} · {[asText(foster?.fields["First Name"]),asText(foster?.fields["Last Name"])].filter(Boolean).join(" ") || "Foster"}</p><p className="mt-2 text-sm">{formatDate(placement.fields["Start Date"])}{asText(placement.fields["Next Check-In Date"])?` · Next check-in ${formatDate(placement.fields["Next Check-In Date"])}`:""}</p></div><Status value={asText(placement.fields["Placement Status"])}/></div>
                      </summary>
                      <div className="mt-5 grid gap-5 border-t pt-5 lg:grid-cols-2">
                        <form action={updatePlacement} className="space-y-3 rounded-2xl bg-slate-50 p-5">
                          <input type="hidden" name="placementId" value={placement.id}/>
                          <h4 className="font-bold">Placement details</h4>
                          <label className="block text-sm font-medium">Placement status<select name="placementStatus" defaultValue={asText(placement.fields["Placement Status"])} className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5">{["Planned","Active","Needs Attention"].map((value)=><option key={value}>{value}</option>)}</select></label>
                          <label className="block text-sm font-medium">Expected end date<input name="expectedEndDate" type="date" defaultValue={asText(placement.fields["Expected End Date"]).slice(0,10)} className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5"/></label>
                          <label className="block text-sm font-medium">Next check-in<input name="nextCheckInDate" type="date" defaultValue={asText(placement.fields["Next Check-In Date"]).slice(0,10)} className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5"/></label>
                          <label className="block text-sm font-medium">Check-in status<select name="checkInStatus" defaultValue={asText(placement.fields["Check-In Status"])||"Not Due"} className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5">{["Not Due","Due","Check-In Completed","Needs Attention"].map((value)=><option key={value}>{value}</option>)}</select></label>
                          <label className="block text-sm font-medium">Care instructions<textarea name="careInstructions" rows={3} defaultValue={asText(placement.fields["Care Instructions / Notes"])} className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5"/></label>
                          <label className="block text-sm font-medium">Internal placement update<textarea name="fosterUpdateNotes" rows={3} defaultValue={asText(placement.fields["Foster Update Notes"])} className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5"/></label>
                          <button className="rounded-full border border-primary px-4 py-2 text-sm font-semibold text-primary">Save Placement</button>
                        </form>

                        <form action={addStaffCheckIn} className="space-y-3 rounded-2xl bg-slate-50 p-5">
                          <input type="hidden" name="placementId" value={placement.id}/>
                          <h4 className="font-bold">Record staff check-in</h4>
                          <label className="block text-sm font-medium">Update type<select name="updateType" defaultValue="Routine Check-In" className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5">{["Routine Check-In","Progress Update","Health / Medical","Behavior","Medication / Treatment","Supplies","Placement Support","Other"].map((value)=><option key={value}>{value}</option>)}</select></label>
                          <label className="block text-sm font-medium">General progress<textarea name="generalProgress" rows={2} className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5"/></label>
                          <label className="block text-sm font-medium">Priority<select name="priority" defaultValue="Normal" className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5">{["Normal","High","Urgent"].map((value)=><option key={value}>{value}</option>)}</select></label>
                          <details className="rounded-xl border bg-white p-3"><summary className="cursor-pointer text-sm font-semibold">Health, behavior, supplies & follow-up</summary><div className="mt-3 space-y-3"><label className="block text-sm font-medium">Appetite<select name="appetite" defaultValue="Not Applicable" className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5">{["Normal","Reduced","Not Eating","Increased","Variable","Not Applicable"].map((value)=><option key={value}>{value}</option>)}</select></label><label className="block text-sm font-medium">Behavior<textarea name="behavior" rows={2} className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5"/></label><label className="block text-sm font-medium">Medication / treatment<textarea name="medication" rows={2} className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5"/></label><label className="block text-sm font-medium">Health concern<textarea name="healthConcern" rows={2} className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5"/></label><label className="block text-sm font-medium">Behavior concern<textarea name="behaviorConcern" rows={2} className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5"/></label><label className="block text-sm font-medium">Supply need<textarea name="supplyNeed" rows={2} className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5"/></label><label className="block text-sm font-medium">Next check-in<input name="nextCheckInDate" type="date" className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5"/></label><label className="block text-sm font-medium">Internal notes<textarea name="internalNotes" rows={2} className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5"/></label></div></details>
                          <button className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white">Save Check-In</button>
                        </form>

                        <form action={endPlacement} className="space-y-3 rounded-2xl border border-amber-200 bg-amber-50 p-5">
                          <input type="hidden" name="placementId" value={placement.id}/>
                          <h4 className="font-bold">End placement</h4>
                          <p className="text-xs text-muted-foreground">Use Adoption Management when the outcome is adoption.</p>
                          <label className="block text-sm font-medium">Outcome<select name="outcome" required defaultValue="" className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5"><option value="" disabled>Select outcome</option>{["Returned to Shelter","Medical Transfer","Other"].map((value)=><option key={value}>{value}</option>)}</select></label>
                          <label className="block text-sm font-medium">End date<input name="endDate" type="date" defaultValue={todayChicago()} className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5"/></label>
                          <label className="block text-sm font-medium">Outcome notes<textarea name="outcomeNotes" rows={2} className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5"/></label>
                          <button className="rounded-full border border-amber-700 px-4 py-2 text-sm font-semibold text-amber-900">Complete Placement</button>
                        </form>

                        <form action={transferPlacement} className="space-y-3 rounded-2xl border border-blue-200 bg-blue-50 p-5">
                          <input type="hidden" name="placementId" value={placement.id}/>
                          <h4 className="font-bold">Transfer to another foster</h4>
                          <label className="block text-sm font-medium">New foster<select name="destinationApplicationId" required defaultValue="" className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5"><option value="" disabled>Select approved foster</option>{approvedApplications.filter((app)=>app.id!==asStrings(placement.fields["Foster Application"])[0]).map((app)=><option key={app.id} value={app.id}>{[asText(app.fields["First Name"]),asText(app.fields["Last Name"])].filter(Boolean).join(" ")}</option>)}</select></label>
                          <label className="block text-sm font-medium">Placement type<select name="placementType" defaultValue={asText(placement.fields["Placement Type"])||"Other"} className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5">{["Bottle Babies","Pregnant Mom","Nursing Mom with Litter","Orphaned Litter","Kitten / Puppy","Adult Animal","Medical","Behavior Support","Short-Term / Emergency","Other"].map((value)=><option key={value}>{value}</option>)}</select></label>
                          <div className="grid gap-3 sm:grid-cols-2"><label className="block text-sm font-medium">Transfer date<input name="transferDate" type="date" defaultValue={todayChicago()} className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5"/></label><label className="block text-sm font-medium">Next check-in<input name="nextCheckInDate" type="date" className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5"/></label></div>
                          <label className="block text-sm font-medium">Care instructions<textarea name="careInstructions" rows={2} defaultValue={asText(placement.fields["Care Instructions / Notes"])} className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5"/></label>
                          <label className="block text-sm font-medium">Transfer notes<textarea name="transferNotes" rows={2} className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5"/></label>
                          <button className="rounded-full border border-blue-700 px-4 py-2 text-sm font-semibold text-blue-900">Transfer Placement</button>
                        </form>
                      </div>
                    </details>
                  );
                })}
                {!activePlacements.length&&<p className="text-sm text-muted-foreground">No active foster placements.</p>}
              </div>
            </section>
          </div>

          <div className="space-y-6">
            <section className="rounded-3xl border bg-white p-6 shadow-sm md:p-8">
              <div className="mb-5"><h2 className="text-2xl font-bold">Create Foster Placement</h2><p className="mt-2 text-sm text-muted-foreground">Assign one or more animals to an approved foster. Animals may enter foster directly from intake or from shelter housing.</p></div>
              <form action={createPlacement} className="space-y-4">
                <label className="block text-sm font-medium">Approved foster<select name="applicationId" required defaultValue="" className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5"><option value="" disabled>Select approved foster</option>{approvedApplications.map((record)=><option key={record.id} value={record.id}>{[asText(record.fields["First Name"]),asText(record.fields["Last Name"])].filter(Boolean).join(" ")} · {asText(record.fields["Foster Application ID"])}</option>)}</select></label>
                <div><p className="text-sm font-medium">Animal(s)</p><div className="mt-2 max-h-72 space-y-2 overflow-y-auto rounded-xl border bg-white p-3">{animals.filter((animal)=>asText(animal.fields["Adoption Status"])!=="Adopted"&&!animalWithActiveFoster.has(animal.id)).map((animal)=><label key={animal.id} className="flex items-start gap-3 rounded-lg p-2 text-sm hover:bg-slate-50"><input name="animalIds" value={animal.id} type="checkbox" className="mt-1"/><span><strong>{asText(animal.fields["Pet Name"])}</strong><span className="block text-xs text-muted-foreground">{asText(animal.fields["Animal ID"])} · {asText(animal.fields.Species)} · Current: {asText(animal.fields["Housing Type"])||"Unassigned"}</span></span></label>)}</div></div>
                <label className="block text-sm font-medium">Placement type<select name="placementType" defaultValue="Other" className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5">{["Bottle Babies","Pregnant Mom","Nursing Mom with Litter","Orphaned Litter","Kitten / Puppy","Adult Animal","Medical","Behavior Support","Short-Term / Emergency","Other"].map((value)=><option key={value}>{value}</option>)}</select></label>
                <label className="block text-sm font-medium">Start date<input name="startDate" type="date" defaultValue={todayChicago()} className="mt-2 w-full rounded-xl border px-3 py-2.5"/></label>
                <details className="rounded-2xl bg-slate-50 p-4"><summary className="cursor-pointer text-sm font-semibold">Additional placement details</summary><div className="mt-4 space-y-4"><label className="block text-sm font-medium">Placement status<select name="placementStatus" defaultValue="Active" className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5">{["Planned","Active"].map((value)=><option key={value}>{value}</option>)}</select></label><label className="block text-sm font-medium">Expected end date<input name="expectedEndDate" type="date" className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5"/></label><label className="block text-sm font-medium">Next check-in<input name="nextCheckInDate" type="date" className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5"/></label><label className="block text-sm font-medium">Care instructions<textarea name="careInstructions" rows={4} className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5"/></label></div></details>
                <button className="w-full rounded-full bg-primary px-5 py-3 font-semibold text-white">Create Foster Placement</button>
              </form>
            </section>

            <section className="rounded-3xl border bg-white p-6 shadow-sm md:p-8">
              <div className="mb-5"><h2 className="text-2xl font-bold">Foster Updates Requiring Attention</h2><p className="mt-2 text-sm text-muted-foreground">Health, behavior, supply, or placement concerns submitted by fosters or staff.</p></div>
              <div className="space-y-4">
                {unresolvedUpdates.map((update)=>{
                  const updateAnimals=asStrings(update.fields.Animal).map((id)=>asText(animalById.get(id)?.fields["Pet Name"])).filter(Boolean);
                  return <form key={update.id} action={resolveUpdate} className="rounded-2xl border border-amber-200 bg-amber-50 p-5"><input type="hidden" name="updateId" value={update.id}/><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-semibold">{updateAnimals.join(", ")||"Foster update"} · {asText(update.fields["Update Type"])}</p><p className="mt-1 text-xs text-muted-foreground">{asText(update.fields["Submitted By"])} · {formatDate(update.fields["Submitted At"])}</p></div><Status value={asText(update.fields.Priority)||"Normal"}/></div><div className="mt-3 space-y-1 text-sm">{asText(update.fields["Health Concern"])&&<p><strong>Health:</strong> {asText(update.fields["Health Concern"])}</p>}{asText(update.fields["Behavior Concern"])&&<p><strong>Behavior:</strong> {asText(update.fields["Behavior Concern"])}</p>}{asText(update.fields["Supply Need"])&&<p><strong>Supply:</strong> {asText(update.fields["Supply Need"])}</p>}{Boolean(update.fields["Unable to Continue Placement"])&&<p className="font-semibold">Foster reports they may be unable to continue placement.</p>}</div><label className="mt-4 block text-sm font-medium">Response to foster<textarea name="staffResponse" rows={2} defaultValue={asText(update.fields["Staff Response"])} className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5"/></label><label className="mt-3 block text-sm font-medium">Internal notes<textarea name="internalNotes" rows={2} defaultValue={asText(update.fields["Internal Notes"])} className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5"/></label><div className="mt-3 flex flex-col gap-3 sm:flex-row"><select name="resolutionStatus" defaultValue={asText(update.fields["Resolution Status"])||"New"} className="rounded-xl border bg-white px-3 py-2.5">{["New","In Review","Waiting on Foster","Resolved","Closed"].map((value)=><option key={value}>{value}</option>)}</select><button className="rounded-full border border-primary px-4 py-2 text-sm font-semibold text-primary">Save Resolution</button></div></form>;
                })}
                {!unresolvedUpdates.length&&<p className="text-sm text-muted-foreground">No foster updates currently require staff attention.</p>}
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
