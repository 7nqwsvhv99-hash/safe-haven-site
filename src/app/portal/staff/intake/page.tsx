import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ArrowLeft, ChevronDown, ClipboardPlus, Inbox, Search } from "lucide-react";
import IntakeRecordForm from "./intake-record-form";
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
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}
function todayChicago() {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric", month: "2-digit", day: "2-digit", timeZone: "America/Chicago",
  }).format(new Date());
}
function yearChicago() {
  return new Intl.DateTimeFormat("en-US", { year: "numeric", timeZone: "America/Chicago" }).format(new Date());
}
function nextAnimalId(records: Awaited<ReturnType<typeof airtableList>>, species: string) {
  const prefix = species === "Dog" ? "DOG" : "CAT";
  const matcher = new RegExp(`^${prefix}-${yearChicago()}-(\\d+)$`);
  const max = records.reduce((current, record) => {
    const match = asText(record.fields["Animal ID"]).match(matcher);
    return match ? Math.max(current, Number(match[1])) : current;
  }, 0);
  return `${prefix}-${yearChicago()}-${String(max + 1).padStart(3, "0")}`;
}
function nextPlacementId(records: Awaited<ReturnType<typeof airtableList>>) {
  const matcher = new RegExp(`^FOST-${yearChicago()}-(\\d+)$`);
  const max = records.reduce((current, record) => {
    const match = asText(record.fields["Foster Placement ID"]).match(matcher);
    return match ? Math.max(current, Number(match[1])) : current;
  }, 0);
  return `FOST-${yearChicago()}-${String(max + 1).padStart(3, "0")}`;
}
function formatDate(input: unknown) {
  const text = asText(input);
  if (!text) return "";
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return text;
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "America/Chicago" }).format(date);
}
const REVIEW_HISTORY_MARKER = "\n\n--- Staff review history ---\n";
function splitReviewHistory(input: unknown) {
  const raw = asText(input);
  const markerIndex = raw.indexOf(REVIEW_HISTORY_MARKER);
  if (markerIndex < 0) return { notes: raw, history: [] as string[] };
  return {
    notes: raw.slice(0, markerIndex),
    history: raw.slice(markerIndex + REVIEW_HISTORY_MARKER.length).split("\n").filter(Boolean),
  };
}
function lastReviewer(input: unknown) {
  const latest = splitReviewHistory(input).history.at(-1);
  if (!latest) return "";
  const separator = latest.indexOf(" | ");
  if (separator < 0) return "";
  const timestamp = latest.slice(0, separator);
  const reviewer = latest.slice(separator + 3);
  const date = new Date(timestamp);
  const when = Number.isNaN(date.getTime()) ? "" : new Intl.DateTimeFormat("en-US", {
    month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/Chicago", timeZoneName: "short",
  }).format(date);
  return `Reviewed by ${reviewer}${when ? ` · ${when}` : ""}`;
}

const REQUEST_FIELDS = [
  "Submitted At", "Status", "Owner First Name", "Owner Last Name", "Email", "Phone",
  "Street Address", "City", "State", "ZIP",
  "Animal Name", "Species", "Sex", "Approximate Age", "Breed / Mix", "Reason for Surrender",
  "Spay / Neuter Status", "Microchip Known", "Microchip Number", "Microchip Manufacturer",
  "Good with Children", "Good with Dogs", "Good with Cats", "Current Veterinarian", "Veterinarian Phone", "Veterinarian Address",
  "Behavior / Safety Notes", "Medical Conditions / Medications", "Urgency", "Requested Surrender Date",
  "Can Keep Animal Until", "Decision Date", "Staff Notes", "Follow-Up Status", "Animal Intakes",
];

export default async function IntakeManagementPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; urgent?: string; new?: string; surrenderRequest?: string }>;
}) {
  await requirePortalRole("Staff");
  const query = await searchParams;
  const [requests, animals, fosterApplications, housingLocations] = await Promise.all([
    airtableList(TABLES.surrenderRequests, REQUEST_FIELDS, { sort: [{ field: "Submitted At", direction: "desc" }] }),
    airtableList(TABLES.animals, [
      "Animal ID", "Pet Name", "Species", "Sex", "Breed", "Color / Markings", "Date of Birth",
      "Estimated Date of Birth", "Microchip Number", "Adoption Status", "Housing Type", "Current Housing Location",
    ], { sort: [{ field: "Pet Name", direction: "asc" }] }),
    airtableList(TABLES.fosterApplications, ["First Name", "Last Name", "Status"], { sort: [{ field: "Last Name", direction: "asc" }] }),
    airtableList(TABLES.housingLocations, ["Location Name", "Location Type", "Active"], { sort: [{ field: "Location Name", direction: "asc" }] }),
  ]);

  const approvedFosters = fosterApplications.filter((record) => asText(record.fields.Status) === "Approved");
  const activeLocations = housingLocations.filter((record) => Boolean(record.fields.Active));
  const q = (query.q || "").trim().toLowerCase();
  const filteredRequests = requests.filter((record) => {
    const haystack = [
      asText(record.fields["Owner First Name"]), asText(record.fields["Owner Last Name"]),
      asText(record.fields.Email), asText(record.fields.Phone), asText(record.fields["Animal Name"]),
      asText(record.fields.Species), asText(record.fields["Breed / Mix"]), asText(record.fields.Urgency),
    ].join(" ").toLowerCase();
    const status = asText(record.fields.Status);
    const isActiveUrgent = asText(record.fields.Urgency) === "Urgent" && !["Declined", "Withdrawn", "Completed"].includes(status);
    return (!q || haystack.includes(q)) && (!query.status || status === query.status) && (query.urgent !== "1" || isActiveUrgent);
  });
  const pending = requests.filter((record) => ["New", "Under Review", "Contacted", "Waitlist"].includes(asText(record.fields.Status)));
  const approved = requests.filter((record) => asText(record.fields.Status) === "Approved for Intake" && asStrings(record.fields["Animal Intakes"]).length === 0);
  const urgent = requests.filter((record) => asText(record.fields.Urgency) === "Urgent" && !["Declined", "Withdrawn", "Completed"].includes(asText(record.fields.Status)));
  const selectedRequest = query.surrenderRequest
    ? requests.find((record) => record.id === query.surrenderRequest && asText(record.fields.Status) === "Approved for Intake" && asStrings(record.fields["Animal Intakes"]).length === 0)
    : undefined;
  const ownerName = selectedRequest
    ? [asText(selectedRequest.fields["Owner First Name"]), asText(selectedRequest.fields["Owner Last Name"])].filter(Boolean).join(" ")
    : "";
  const requestNotes = selectedRequest ? [
    asText(selectedRequest.fields["Reason for Surrender"]) ? `Surrender reason: ${asText(selectedRequest.fields["Reason for Surrender"])}` : "",
    asText(selectedRequest.fields["Behavior / Safety Notes"]) ? `Behavior / safety: ${asText(selectedRequest.fields["Behavior / Safety Notes"])}` : "",
    asText(selectedRequest.fields["Medical Conditions / Medications"]) ? `Medical history / medications: ${asText(selectedRequest.fields["Medical Conditions / Medications"])}` : "",
    asText(selectedRequest.fields["Spay / Neuter Status"]) ? `Spay/neuter: ${asText(selectedRequest.fields["Spay / Neuter Status"])}` : "",
    asText(selectedRequest.fields["Microchip Known"]) ? `Microchip known: ${asText(selectedRequest.fields["Microchip Known"])}${asText(selectedRequest.fields["Microchip Number"]) ? ` · ${asText(selectedRequest.fields["Microchip Number"])}` : ""}${asText(selectedRequest.fields["Microchip Manufacturer"]) ? ` · ${asText(selectedRequest.fields["Microchip Manufacturer"])}` : ""}` : "",
    asText(selectedRequest.fields["Current Veterinarian"]) ? `Veterinarian: ${asText(selectedRequest.fields["Current Veterinarian"])}${asText(selectedRequest.fields["Veterinarian Phone"]) ? ` · ${asText(selectedRequest.fields["Veterinarian Phone"])}` : ""}${asText(selectedRequest.fields["Veterinarian Address"]) ? ` · ${asText(selectedRequest.fields["Veterinarian Address"])}` : ""}` : "",
    `Compatibility: children ${asText(selectedRequest.fields["Good with Children"]) || "unknown / not assessed"}; dogs ${asText(selectedRequest.fields["Good with Dogs"]) || "unknown / not assessed"}; cats ${asText(selectedRequest.fields["Good with Cats"]) || "unknown / not assessed"}`,
  ].filter(Boolean).join("\n\n") : "";

  async function saveRequest(formData: FormData) {
    "use server";
    const reviewer = await requirePortalRole("Staff", "write");
    const requestId = value(formData, "requestId");
    const latest = await airtableList(TABLES.surrenderRequests, ["Status", "Staff Notes"]);
    const current = latest.find((record) => record.id === requestId);
    if (!current) return;
    const status = value(formData, "status");
    const previousHistory = splitReviewHistory(current.fields["Staff Notes"]).history;
    const timestamp = new Date().toISOString();
    const reviewHistory = [...previousHistory, `${timestamp} | ${reviewer.displayName || reviewer.email}`];
    const staffNotes = [
      value(formData, "staffNotes"),
      `${REVIEW_HISTORY_MARKER}${reviewHistory.join("\n")}`,
    ].filter(Boolean).join("");
    await airtableUpdate(TABLES.surrenderRequests, requestId, {
      Status: status,
      Urgency: value(formData, "urgency"),
      "Staff Notes": staffNotes,
      "Requested Surrender Date": value(formData, "requestedDate") || null,
      "Can Keep Animal Until": value(formData, "canKeepUntil") || null,
      ...(["Approved for Intake", "Declined", "Withdrawn", "Completed"].includes(status) ? { "Decision Date": todayChicago() } : {}),
    }, true);
    revalidatePath("/portal/staff/intake");
  }

  async function recordIntake(formData: FormData) {
    "use server";
    await requirePortalRole("Staff", "write");
    const requestId = value(formData, "requestId");
    const placementPath = value(formData, "placementPath");
    if (!["shelter", "foster"].includes(placementPath)) return;

    const [latestAnimals, latestRequests, latestLocations, latestFosters] = await Promise.all([
      airtableList(TABLES.animals, ["Animal ID", "Species", "Adoption Status", "Current Housing Location"]),
      airtableList(TABLES.surrenderRequests, REQUEST_FIELDS),
      airtableList(TABLES.housingLocations, ["Location Name", "Location Type", "Capacity", "Active"]),
      airtableList(TABLES.fosterApplications, ["First Name", "Last Name", "Status"]),
    ]);
    const request = requestId ? latestRequests.find((record) => record.id === requestId) : undefined;
    if (requestId && (!request || asText(request.fields.Status) !== "Approved for Intake" || asStrings(request.fields["Animal Intakes"]).length > 0)) return;
    if (!requestId && !["Stray", "Transfer In", "Adoption Return", "Born in Care", "Other"].includes(value(formData, "intakeType"))) return;
    const locationId = value(formData, "housingLocationId");
    const fosterId = value(formData, "fosterApplicationId");
    const activeLocation = (id: string) => latestLocations.find((record) => record.id === id && Boolean(record.fields.Active));
    if (placementPath === "foster" && !latestFosters.some((record) => record.id === fosterId && asText(record.fields.Status) === "Approved")) return;

    let animalId = value(formData, "existingAnimalId");
    const existingAnimal = animalId ? latestAnimals.find((record) => record.id === animalId) : undefined;
    if (animalId && !existingAnimal) return;
    let species = asText(existingAnimal?.fields.Species) || value(formData, "species");
    let petName = value(formData, "petName");
    let sex = value(formData, "sex") || "Unknown";
    let breed = value(formData, "breed");
    const color = value(formData, "color");
    const dateOfBirth = value(formData, "dateOfBirth");
    const estimatedDateOfBirth = value(formData, "estimatedDateOfBirth");
    let microchipNumber = value(formData, "microchipNumber");
    if (request) {
      species = asText(request.fields.Species);
      petName = asText(request.fields["Animal Name"]) || petName;
      sex = asText(request.fields.Sex) || sex;
      breed = asText(request.fields["Breed / Mix"]) || breed;
      microchipNumber = asText(request.fields["Microchip Number"]) || microchipNumber;
    }
    let currentHousing: string[] = [];
    if (placementPath === "shelter") {
      if (species === "Cat") {
        const condoId = value(formData, "catCondoId");
        const roomId = value(formData, "catRoomId");
        const condo = activeLocation(condoId);
        const room = activeLocation(roomId);
        if (!condo || asText(condo.fields["Location Type"]) !== "Cat Condo" || !room || asText(room.fields["Location Type"]) !== "Cat Room") return;
        currentHousing = [condoId, roomId];
      } else if (species === "Dog") {
        const location = activeLocation(locationId);
        const type = asText(location?.fields["Location Type"]);
        const name = asText(location?.fields["Location Name"]);
        const compatible = type === "Dog Kennel" || (["Isolation", "Medical", "Recovery", "Other"].includes(type) && (type !== "Isolation" || /kennel/i.test(name)));
        if (!location || !compatible) return;
        currentHousing = [locationId];
      } else return;

      const occupied = latestAnimals.filter((record) =>
        record.id !== animalId && asText(record.fields["Adoption Status"]) !== "Adopted" &&
        currentHousing.some((id) => asStrings(record.fields["Current Housing Location"]).includes(id))
      );
      for (const id of currentHousing) {
        const location = activeLocation(id);
        const capacity = typeof location?.fields.Capacity === "number" ? location.fields.Capacity : null;
        const occupants = occupied.filter((record) => asStrings(record.fields["Current Housing Location"]).includes(id)).length;
        if (capacity !== null && occupants >= capacity) return;
      }
    }
    const intakeWeight = numberValue(formData, "intakeWeight");
    const intakeDate = value(formData, "intakeDate") || todayChicago();
    if (placementPath === "foster") currentHousing = [];

    if (!animalId) {
      if (!["Cat", "Dog"].includes(species) || !petName) return;
      const animal = await airtableCreate(TABLES.animals, {
        "Animal ID": nextAnimalId(latestAnimals, species),
        "Pet Name": petName,
        Species: species,
        Sex: sex,
        ...(dateOfBirth ? { "Date of Birth": dateOfBirth } : {}),
        ...(!dateOfBirth && estimatedDateOfBirth ? { "Estimated Date of Birth": estimatedDateOfBirth } : {}),
        ...(breed ? { Breed: breed } : {}),
        ...(color ? { "Color / Markings": color } : {}),
        ...(microchipNumber ? { "Microchip Number": microchipNumber } : {}),
        ...(intakeWeight !== undefined ? { "Weight (lb)": intakeWeight } : {}),
        "Adoption Status": "Getting Ready for Adoption",
        "Housing Type": placementPath === "foster" ? "Foster Home" : "In Shelter",
        "Current Housing Location": currentHousing,
        "Microchip Registration Status": value(formData, "microchipStatus") || "Unknown",
        "Public Listing": false,
      }, true);
      if (!animal) return;
      animalId = animal.id;
    } else {
      const updated = await airtableUpdate(TABLES.animals, animalId, {
        "Housing Type": placementPath === "foster" ? "Foster Home" : "In Shelter",
        "Current Housing Location": currentHousing,
        ...(intakeWeight !== undefined ? { "Weight (lb)": intakeWeight } : {}),
      }, true);
      if (!updated) return;
    }

    const ownerNameForIntake = request
      ? [asText(request.fields["Owner First Name"]), asText(request.fields["Owner Last Name"])].filter(Boolean).join(" ")
      : value(formData, "source");
    const requestNotesForIntake = request ? [
      asText(request.fields["Reason for Surrender"]) ? `Surrender reason: ${asText(request.fields["Reason for Surrender"])}` : "",
      asText(request.fields["Behavior / Safety Notes"]) ? `Behavior / safety: ${asText(request.fields["Behavior / Safety Notes"])}` : "",
      asText(request.fields["Medical Conditions / Medications"]) ? `Medical history / medications: ${asText(request.fields["Medical Conditions / Medications"])}` : "",
      asText(request.fields["Spay / Neuter Status"]) ? `Spay/neuter: ${asText(request.fields["Spay / Neuter Status"])}` : "",
      asText(request.fields["Microchip Known"]) ? `Microchip known: ${asText(request.fields["Microchip Known"])}${asText(request.fields["Microchip Number"]) ? ` · ${asText(request.fields["Microchip Number"])}` : ""}${asText(request.fields["Microchip Manufacturer"]) ? ` · ${asText(request.fields["Microchip Manufacturer"])}` : ""}` : "",
      asText(request.fields["Current Veterinarian"]) ? `Veterinarian: ${asText(request.fields["Current Veterinarian"])}${asText(request.fields["Veterinarian Phone"]) ? ` · ${asText(request.fields["Veterinarian Phone"])}` : ""}${asText(request.fields["Veterinarian Address"]) ? ` · ${asText(request.fields["Veterinarian Address"])}` : ""}` : "",
      `Compatibility: children ${asText(request.fields["Good with Children"]) || "unknown / not assessed"}; dogs ${asText(request.fields["Good with Dogs"]) || "unknown / not assessed"}; cats ${asText(request.fields["Good with Cats"]) || "unknown / not assessed"}`,
      value(formData, "intakeNotes"),
    ].filter(Boolean).join("\n\n") : value(formData, "intakeNotes");
    const intake = await airtableCreate(TABLES.animalIntakes, {
      Animal: [animalId],
      "Intake Date": intakeDate,
      "Intake Type": request ? "Owner Surrender" : value(formData, "intakeType"),
      ...(request ? { "Related Surrender Request": [request.id] } : {}),
      ...(ownerNameForIntake ? { "Source Person / Organization": ownerNameForIntake } : {}),
      ...((request ? asText(request.fields.Phone) : value(formData, "sourcePhone")) ? { "Source Phone": request ? asText(request.fields.Phone) : value(formData, "sourcePhone") } : {}),
      ...((request ? asText(request.fields.Email) : value(formData, "sourceEmail")) ? { "Source Email": request ? asText(request.fields.Email) : value(formData, "sourceEmail") } : {}),
      ...(!request && value(formData, "origin") ? { "Found / Origin Location": value(formData, "origin") } : {}),
      "Condition at Intake": value(formData, "condition") || "Unable to assess",
      ...(intakeWeight !== undefined ? { "Weight at Intake (lb)": intakeWeight } : {}),
      ...(requestNotesForIntake ? { "Intake Notes": requestNotesForIntake } : {}),
    }, true);
    if (!intake) return;

    if (placementPath === "foster") {
      const placements = await airtableList(TABLES.fosterPlacements, ["Foster Placement ID"]);
      await airtableCreate(TABLES.fosterPlacements, {
        "Foster Placement ID": nextPlacementId(placements),
        Animal: [animalId],
        "Foster Application": [fosterId],
        "Placement Status": "Active",
        "Placement Type": value(formData, "placementType") || "Other",
        "Start Date": intakeDate,
        ...(value(formData, "nextCheckInDate") ? { "Next Check-In Date": value(formData, "nextCheckInDate"), "Check-In Status": "Not Due" } : {}),
        ...(value(formData, "careInstructions") ? { "Care Instructions / Notes": value(formData, "careInstructions") } : {}),
      }, true);
    }
    if (request) {
      await airtableUpdate(TABLES.surrenderRequests, request.id, { Status: "Completed", "Decision Date": intakeDate }, true);
    }

    revalidatePath("/portal/staff/intake");
    revalidatePath("/portal/staff/animals");
    revalidatePath("/portal/staff/fosters");
    redirect(`/portal/staff/animals/${animalId}?created=1`);
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="container-custom py-10 md:py-12">
        <Link href="/portal/staff" className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"><ArrowLeft className="h-4 w-4" /> Staff Portal</Link>
        <header className="mb-8">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-primary">Animal Entry</p>
          <h1 className="text-4xl font-bold tracking-tight md:text-5xl">Intake &amp; Owner Surrender</h1>
          <p className="mt-4 max-w-3xl text-muted-foreground">Review surrender requests, then record every accepted animal through one intake workflow.</p>
        </header>

        <section className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <div className="rounded-2xl border bg-white p-5 shadow-sm"><Inbox className="mb-3 h-5 w-5 text-primary"/><p className="text-3xl font-bold">{pending.length}</p><p className="mt-1 text-sm text-muted-foreground">Requests to review</p></div>
          <Link href="/portal/staff/intake?urgent=1#owner-surrender-queue" className="rounded-2xl border bg-white p-5 shadow-sm transition hover:border-primary hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" aria-label={`Show ${urgent.length} urgent surrender requests`}>
            <Search className="mb-3 h-5 w-5 text-primary"/><p className="text-3xl font-bold">{urgent.length}</p><p className="mt-1 text-sm text-muted-foreground">Urgent requests · view queue</p>
          </Link>
          <div className="rounded-2xl border bg-white p-5 shadow-sm"><ClipboardPlus className="mb-3 h-5 w-5 text-primary"/><p className="text-3xl font-bold">{approved.length}</p><p className="mt-1 text-sm text-muted-foreground">Approved for intake</p></div>
        </section>

        <section id="owner-surrender-queue" className="mb-8 scroll-mt-36 rounded-3xl border bg-white p-6 shadow-sm md:p-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div><h2 className="text-2xl font-bold">Owner Surrender Queue</h2><p className="mt-2 text-sm text-muted-foreground">Requests entered through the surrender-request process appear here. Review and approve a request before recording intake.</p></div>
            <form className="grid w-full gap-3 md:w-auto md:grid-cols-[minmax(260px,1fr)_210px_auto]">
              <input name="q" defaultValue={query.q || ""} placeholder="Search owner, animal, contact, or breed" className="rounded-xl border px-3 py-2.5" />
              <select name="status" defaultValue={query.status || ""} className="rounded-xl border bg-white px-3 py-2.5"><option value="">All statuses</option>{["New", "Under Review", "Contacted", "Waitlist", "Approved for Intake", "Declined", "Withdrawn", "Completed"].map((status) => <option key={status}>{status}</option>)}</select>
              <button className="rounded-xl border px-5 py-2.5 font-semibold">Filter</button>
              <label className="flex items-center gap-2 text-sm font-medium md:col-span-3"><input type="checkbox" name="urgent" value="1" defaultChecked={query.urgent === "1"} className="h-4 w-4 accent-orange-500" />Urgent requests only</label>
            </form>
          </div>
          <div className="mt-5 space-y-3">
            {filteredRequests.map((record) => {
              const isApproved = asText(record.fields.Status) === "Approved for Intake" && asStrings(record.fields["Animal Intakes"]).length === 0;
              const alreadyIntaken = asStrings(record.fields["Animal Intakes"]).length > 0;
              const email = asText(record.fields.Email);
              const phone = asText(record.fields.Phone);
              const address = [asText(record.fields["Street Address"]), [asText(record.fields.City), asText(record.fields.State), asText(record.fields.ZIP)].filter(Boolean).join(", ")].filter(Boolean).join(" · ");
              const animalFacts = [asText(record.fields.Species), asText(record.fields.Sex), asText(record.fields["Approximate Age"]), asText(record.fields["Breed / Mix"])].filter(Boolean).join(" · ");
              const reviewNotes = splitReviewHistory(record.fields["Staff Notes"]);
              const reviewerLabel = lastReviewer(record.fields["Staff Notes"]);
              const requestStatus = alreadyIntaken ? "Completed" : asText(record.fields.Status);
              return <details key={record.id} name="owner-surrender-requests" className="group rounded-2xl border p-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
                  <div className="flex min-w-0 flex-1 flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="font-bold">{asText(record.fields["Animal Name"]) || "Unnamed animal"}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">{[asText(record.fields["Owner First Name"]), asText(record.fields["Owner Last Name"])].filter(Boolean).join(" ") || "Owner name not provided"} · Submitted {formatDate(record.fields["Submitted At"]) || "date not recorded"}</p>
                      <p className="mt-2 text-sm">{animalFacts || "Animal details not provided"}</p>
                    </div>
                    <div className="flex flex-col items-start gap-2 sm:items-end">
                      <div className="flex flex-wrap gap-2">
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold">{alreadyIntaken ? "Intake recorded" : requestStatus || "No status"}</span>
                        {asText(record.fields.Urgency) === "Urgent" && <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900">Urgent</span>}
                      </div>
                      {reviewerLabel && <span className="text-xs text-muted-foreground">{reviewerLabel}</span>}
                    </div>
                  </div>
                  <span className="flex shrink-0 items-center gap-2 text-xs font-semibold text-primary sm:text-sm">Details<ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" /></span>
                </summary>
                <div className="mt-5 grid gap-5 border-t pt-5 xl:grid-cols-[minmax(0,1fr)_360px]">
                  <div className="space-y-4">
                    <section className="rounded-2xl bg-slate-50 p-4">
                      <h4 className="font-semibold">Owner contact</h4>
                      <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                        <p><span className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Email</span>{email ? <a className="font-medium text-primary hover:underline" href={`mailto:${email}`}>{email}</a> : "Not provided"}</p>
                        <p><span className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Phone</span>{phone ? <a className="font-medium text-primary hover:underline" href={`tel:${phone.replace(/[^+\d]/g, "")}`}>{phone}</a> : "Not provided"}</p>
                        <p className="sm:col-span-2"><span className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Address</span>{address || "Not provided"}</p>
                      </div>
                    </section>
                    <section className="rounded-2xl border p-4">
                      <h4 className="font-semibold">Animal details</h4>
                      <div className="mt-4 grid gap-x-4 gap-y-5 text-sm sm:grid-cols-2">
                        <p><span className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Species</span>{asText(record.fields.Species) || "Not provided"}</p>
                        <p><span className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Sex</span>{asText(record.fields.Sex) || "Not provided"}</p>
                        <p><span className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Approximate age</span>{asText(record.fields["Approximate Age"]) || "Not provided"}</p>
                        <p><span className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Breed or mix</span>{asText(record.fields["Breed / Mix"]) || "Not provided"}</p>
                        <p><span className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Spayed or neutered</span>{asText(record.fields["Spay / Neuter Status"]) || "Not provided"}</p>
                        <p><span className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Microchip</span>{asText(record.fields["Microchip Known"]) || "Not provided"}</p>
                        <p><span className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Microchip number</span>{asText(record.fields["Microchip Number"]) || "Not provided"}</p>
                        <p><span className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Microchip manufacturer</span>{asText(record.fields["Microchip Manufacturer"]) || "Not provided"}</p>
                        <p className="sm:col-span-2"><span className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Current veterinarian or clinic</span>{asText(record.fields["Current Veterinarian"]) || "Not provided"}</p>
                        <p><span className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Veterinarian phone</span>{asText(record.fields["Veterinarian Phone"]) || "Not provided"}</p>
                        <p><span className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Veterinarian address</span>{asText(record.fields["Veterinarian Address"]) || "Not provided"}</p>
                      </div>
                    </section>
                    <section className="rounded-2xl border p-4">
                      <h4 className="font-semibold">Animal compatibility</h4>
                      <div className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
                        <p><span className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Children</span>{asText(record.fields["Good with Children"]) || "Unknown / not assessed"}</p>
                        <p><span className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Other dogs</span>{asText(record.fields["Good with Dogs"]) || "Unknown / not assessed"}</p>
                        <p><span className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Cats</span>{asText(record.fields["Good with Cats"]) || "Unknown / not assessed"}</p>
                      </div>
                    </section>
                    <section className="space-y-3 rounded-2xl border p-4">
                      <h4 className="font-semibold">Reason and care information</h4>
                      <div className="space-y-5 text-sm">
                        <p><span className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Reason for surrender</span><span className="whitespace-pre-line">{asText(record.fields["Reason for Surrender"]) || "Not provided"}</span></p>
                        <p><span className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Behavior or safety</span><span className="whitespace-pre-line">{asText(record.fields["Behavior / Safety Notes"]) || "No notes provided"}</span></p>
                        <p><span className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Medical conditions or medications</span><span className="whitespace-pre-line">{asText(record.fields["Medical Conditions / Medications"]) || "No notes provided"}</span></p>
                      </div>
                    </section>
                  </div>
                  <div className="space-y-3">
                    <form action={saveRequest} className="space-y-3 rounded-2xl bg-slate-50 p-4">
                      <div><h4 className="font-semibold">Review and next steps</h4><p className="mt-1 text-xs text-muted-foreground">Update the request, set its priority, and record staff-only notes.</p></div>
                      <input type="hidden" name="requestId" value={record.id}/>
                      <label className="block text-xs font-semibold">Request status<select key={`${record.id}-${requestStatus}`} name="status" defaultValue={requestStatus} className="mt-1 w-full rounded-xl border bg-white px-3 py-2.5" disabled={alreadyIntaken}>{["New", "Under Review", "Contacted", "Waitlist", "Approved for Intake", "Declined", "Withdrawn", "Completed"].map((status) => <option key={status}>{status}</option>)}</select></label>
                      <label className="block text-xs font-semibold">Urgency<select name="urgency" defaultValue={asText(record.fields.Urgency) || "Routine"} className="mt-1 w-full rounded-xl border bg-white px-3 py-2.5" disabled={alreadyIntaken}>{["Routine", "Soon", "Urgent"].map((status) => <option key={status}>{status}</option>)}</select></label>
                      <div className="grid gap-2 sm:grid-cols-2"><label className="block text-xs font-semibold">Preferred surrender date<input name="requestedDate" type="date" defaultValue={asText(record.fields["Requested Surrender Date"]).slice(0, 10)} className="mt-1 w-full rounded-xl border bg-white px-3 py-2.5" disabled={alreadyIntaken}/></label><label className="block text-xs font-semibold">Last day owner can keep animal<input name="canKeepUntil" type="date" defaultValue={asText(record.fields["Can Keep Animal Until"]).slice(0, 10)} className="mt-1 w-full rounded-xl border bg-white px-3 py-2.5" disabled={alreadyIntaken}/></label></div>
                      <label className="block text-xs font-semibold">Staff notes<textarea name="staffNotes" rows={2} defaultValue={reviewNotes.notes} className="mt-1 w-full rounded-xl border bg-white px-3 py-2.5" disabled={alreadyIntaken}/></label>
                      {!alreadyIntaken && <button className="rounded-full border border-primary px-4 py-2 text-sm font-semibold text-primary">Save review</button>}
                    </form>
                    {isApproved && <Link href={`/portal/staff/intake?surrenderRequest=${record.id}#record-intake`} className="inline-flex w-full items-center justify-center rounded-full bg-primary px-4 py-3 text-sm font-semibold text-white hover:opacity-90">Start intake with request details</Link>}
                  </div>
                </div>
              </details>;
            })}
            {!filteredRequests.length && <p className="rounded-xl bg-slate-50 p-5 text-sm text-muted-foreground">No surrender requests match this search.</p>}
          </div>
        </section>

        <section id="record-intake" className="mb-8 rounded-3xl border bg-white shadow-sm">
          <details open={query.new === "1" || Boolean(selectedRequest)}>
            <summary className="group flex cursor-pointer list-none items-center justify-between gap-4 rounded-3xl p-6 transition hover:bg-orange-50/60 hover:shadow-[0_0_0_2px_rgba(249,115,22,0.18)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary md:p-8">
              <div><h2 className="text-2xl font-bold">Record an Intake</h2><p className="mt-2 text-sm text-muted-foreground">{selectedRequest ? `Approved surrender request for ${asText(selectedRequest.fields["Animal Name"]) || "this animal"}. Request details have been carried into the form.` : "Use this form for approved owner surrenders and other accepted entry types."}</p></div>
              <span className="inline-flex shrink-0 items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white shadow-sm transition group-hover:bg-orange-600">Record intake<ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" /></span>
            </summary>
            {selectedRequest && <div className="mt-4 rounded-2xl bg-primary/5 p-4 text-sm"><strong>Request context:</strong> {ownerName || "Owner name not provided"} · {[asText(selectedRequest.fields.Species), asText(selectedRequest.fields.Sex), asText(selectedRequest.fields["Breed / Mix"])].filter(Boolean).join(" · ") || "Animal details incomplete"}<p className="mt-2 whitespace-pre-line text-muted-foreground">{requestNotes || "No surrender reason, behavior, or medical details were provided."}</p></div>}
            <div className="px-6 pb-6 md:px-8 md:pb-8">
              <IntakeRecordForm
                action={recordIntake}
                animals={animals.map((record) => ({
                  id: record.id,
                  label: `${asText(record.fields["Pet Name"]) || "Unnamed animal"} · ${asText(record.fields["Animal ID"])}`,
                  species: asText(record.fields.Species),
                  details: [
                    asText(record.fields["Animal ID"]), asText(record.fields.Species), asText(record.fields.Sex),
                    asText(record.fields.Breed), asText(record.fields["Adoption Status"]),
                    asText(record.fields["Housing Type"]),
                  ].filter(Boolean).join(" · "),
                }))}
                fosters={approvedFosters.map((record) => ({ id: record.id, label: `${asText(record.fields["First Name"])} ${asText(record.fields["Last Name"])}`.trim() }))}
                locations={activeLocations.map((record) => {
                  const occupants = animals
                    .filter((animal) => asText(animal.fields["Adoption Status"]) !== "Adopted" && asStrings(animal.fields["Current Housing Location"]).includes(record.id))
                    .map((animal) => asText(animal.fields["Pet Name"]))
                    .filter(Boolean);
                  const type = asText(record.fields["Location Type"]);
                  const occupancy = ["Cat Room", "Cat Condo"].includes(type)
                    ? ` · Cats: ${occupants.length ? occupants.join(", ") : "none assigned"}`
                    : "";
                  return { id: record.id, type, label: `${asText(record.fields["Location Name"])}${type ? ` · ${type}` : ""}${occupancy}` };
                })}
                defaults={selectedRequest ? {
                  requestId: selectedRequest.id,
                  petName: asText(selectedRequest.fields["Animal Name"]),
                  species: asText(selectedRequest.fields.Species),
                  sex: asText(selectedRequest.fields.Sex) || "Unknown",
                  breed: asText(selectedRequest.fields["Breed / Mix"]),
                  microchipNumber: asText(selectedRequest.fields["Microchip Number"]),
                  source: ownerName,
                  sourcePhone: asText(selectedRequest.fields.Phone),
                  sourceEmail: asText(selectedRequest.fields.Email),
                  intakeDate: todayChicago(),
                } : { intakeDate: todayChicago() }}
              />
            </div>
          </details>
        </section>

      </div>
    </main>
  );
}
