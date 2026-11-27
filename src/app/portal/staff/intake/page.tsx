import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ArrowLeft, ClipboardPlus, Inbox, PawPrint, Search } from "lucide-react";
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

const REQUEST_FIELDS = [
  "Submitted At", "Status", "Owner First Name", "Owner Last Name", "Email", "Phone",
  "Street Address", "City", "State", "ZIP",
  "Animal Name", "Species", "Sex", "Approximate Age", "Breed / Mix", "Spay / Neuter Status",
  "Microchip Known", "Microchip Number", "Microchip Manufacturer", "Current Veterinarian",
  "Veterinarian Phone", "Veterinarian Address", "Reason for Surrender", "Behavior / Safety Notes",
  "Medical Conditions / Medications", "Urgency", "Requested Surrender Date", "Can Keep Animal Until",
  "Decision Date", "Staff Notes", "Follow-Up Status", "Animal Intakes",
];

export default async function IntakeManagementPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; new?: string; surrenderRequest?: string }>;
}) {
  await requirePortalRole("Staff");
  const query = await searchParams;
  const [requests, intakes, animals, fosterApplications, housingLocations] = await Promise.all([
    airtableList(TABLES.surrenderRequests, REQUEST_FIELDS, { sort: [{ field: "Submitted At", direction: "desc" }] }),
    airtableList(TABLES.animalIntakes, [
      "Animal", "Intake Date", "Intake Type", "Related Surrender Request", "Source Person / Organization",
      "Source Phone", "Source Email", "Found / Origin Location", "Condition at Intake", "Weight at Intake (lb)",
      "Intake Notes", "Pet Name", "Species", "Animal Creation Status",
    ], { sort: [{ field: "Intake Date", direction: "desc" }] }),
    airtableList(TABLES.animals, [
      "Animal ID", "Pet Name", "Species", "Sex", "Breed", "Color / Markings", "Date of Birth",
      "Estimated Date of Birth", "Microchip Number", "Adoption Status", "Housing Type", "Current Housing Location",
    ], { sort: [{ field: "Pet Name", direction: "asc" }] }),
    airtableList(TABLES.fosterApplications, ["First Name", "Last Name", "Status"], { sort: [{ field: "Last Name", direction: "asc" }] }),
    airtableList(TABLES.housingLocations, ["Location Name", "Location Type", "Active"], { sort: [{ field: "Location Name", direction: "asc" }] }),
  ]);

  const animalById = new Map(animals.map((record) => [record.id, record]));
  const approvedFosters = fosterApplications.filter((record) => asText(record.fields.Status) === "Approved");
  const activeLocations = housingLocations.filter((record) => Boolean(record.fields.Active));
  const q = (query.q || "").trim().toLowerCase();
  const filteredRequests = requests.filter((record) => {
    const haystack = [
      asText(record.fields["Owner First Name"]), asText(record.fields["Owner Last Name"]),
      asText(record.fields.Email), asText(record.fields.Phone), asText(record.fields["Animal Name"]),
      asText(record.fields.Species), asText(record.fields["Breed / Mix"]), asText(record.fields.Urgency),
    ].join(" ").toLowerCase();
    return (!q || haystack.includes(q)) && (!query.status || asText(record.fields.Status) === query.status);
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
  ].filter(Boolean).join("\n\n") : "";

  async function saveRequest(formData: FormData) {
    "use server";
    await requirePortalRole("Staff", "write");
    const requestId = value(formData, "requestId");
    const latest = await airtableList(TABLES.surrenderRequests, ["Status"]);
    if (!latest.some((record) => record.id === requestId)) return;
    const status = value(formData, "status");
    await airtableUpdate(TABLES.surrenderRequests, requestId, {
      Status: status,
      Urgency: value(formData, "urgency"),
      "Staff Notes": value(formData, "staffNotes"),
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
    const microchipNumber = value(formData, "microchipNumber");
    if (request) {
      species = asText(request.fields.Species);
      petName = asText(request.fields["Animal Name"]) || petName;
      sex = asText(request.fields.Sex) || sex;
      breed = asText(request.fields["Breed / Mix"]) || breed;
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
          {[["Requests to review", pending.length, Inbox], ["Urgent requests", urgent.length, Search], ["Approved for intake", approved.length, ClipboardPlus]].map(([label, count, Icon]) => {
            const MetricIcon = Icon as typeof PawPrint;
            return <div key={String(label)} className="rounded-2xl border bg-white p-5 shadow-sm"><MetricIcon className="mb-3 h-5 w-5 text-primary"/><p className="text-3xl font-bold">{String(count)}</p><p className="mt-1 text-sm text-muted-foreground">{String(label)}</p></div>;
          })}
        </section>

        <section className="mb-8 rounded-3xl border bg-white p-6 shadow-sm md:p-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div><h2 className="text-2xl font-bold">Owner Surrender Queue</h2><p className="mt-2 text-sm text-muted-foreground">Requests entered through the surrender-request process appear here. Review and approve a request before recording intake.</p></div>
            <form className="grid w-full gap-3 md:w-auto md:grid-cols-[minmax(260px,1fr)_210px_auto]">
              <input name="q" defaultValue={query.q || ""} placeholder="Search owner, animal, contact, or breed" className="rounded-xl border px-3 py-2.5" />
              <select name="status" defaultValue={query.status || ""} className="rounded-xl border bg-white px-3 py-2.5"><option value="">All statuses</option>{["New", "Under Review", "Contacted", "Waitlist", "Approved for Intake", "Declined", "Withdrawn", "Completed"].map((status) => <option key={status}>{status}</option>)}</select>
              <button className="rounded-xl border px-5 py-2.5 font-semibold">Filter</button>
            </form>
          </div>
          <div className="mt-5 space-y-3">
            {filteredRequests.map((record) => {
              const isApproved = asText(record.fields.Status) === "Approved for Intake" && asStrings(record.fields["Animal Intakes"]).length === 0;
              const alreadyIntaken = asStrings(record.fields["Animal Intakes"]).length > 0;
              return <details key={record.id} className="rounded-2xl border p-5">
                <summary className="cursor-pointer list-none">
                  <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-bold">{asText(record.fields["Animal Name"]) || "Unnamed animal"}</h3><p className="mt-1 text-sm text-muted-foreground">{[asText(record.fields["Owner First Name"]), asText(record.fields["Owner Last Name"])].filter(Boolean).join(" ")} · Submitted {formatDate(record.fields["Submitted At"]) || "date not recorded"}</p><p className="mt-2 text-sm">{[asText(record.fields.Species), asText(record.fields.Sex), asText(record.fields["Approximate Age"]), asText(record.fields["Breed / Mix"])].filter(Boolean).join(" · ")}</p></div><div className="flex flex-wrap gap-2"><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold">{alreadyIntaken ? "Intake recorded" : asText(record.fields.Status) || "No status"}</span>{asText(record.fields.Urgency) === "Urgent" && <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900">Urgent</span>}</div></div>
                </summary>
                <div className="mt-5 grid gap-5 border-t pt-5 lg:grid-cols-[1fr_auto]">
                  <div className="grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
                    <p><strong>Owner contact:</strong> {[asText(record.fields.Email), asText(record.fields.Phone)].filter(Boolean).join(" · ") || "Not provided"}</p>
                    <p><strong>Address:</strong> {[asText(record.fields["Street Address"]), asText(record.fields.City), [asText(record.fields.State), asText(record.fields.ZIP)].filter(Boolean).join(" ")].filter(Boolean).join(", ") || "Not provided"}</p>
                    <p><strong>Spayed / neutered:</strong> {asText(record.fields["Spay / Neuter Status"]) || "Not provided"}</p>
                    <p><strong>Microchip known:</strong> {asText(record.fields["Microchip Known"]) || "Not provided"}</p>
                    <p><strong>Microchip number:</strong> {asText(record.fields["Microchip Number"]) || "Not provided"}</p>
                    <p><strong>Microchip manufacturer:</strong> {asText(record.fields["Microchip Manufacturer"]) || "Not provided"}</p>
                    <p><strong>Current veterinarian:</strong> {asText(record.fields["Current Veterinarian"]) || "Not provided"}</p>
                    <p><strong>Veterinarian phone:</strong> {asText(record.fields["Veterinarian Phone"]) || "Not provided"}</p>
                    <p><strong>Veterinarian address:</strong> {asText(record.fields["Veterinarian Address"]) || "Not provided"}</p>
                    <p><strong>Requested date:</strong> {formatDate(record.fields["Requested Surrender Date"]) || "Not specified"}</p>
                    <p><strong>Can keep until:</strong> {formatDate(record.fields["Can Keep Animal Until"]) || "Not specified"}</p>
                    <p className="sm:col-span-2"><strong>Reason:</strong> {asText(record.fields["Reason for Surrender"]) || "Not provided"}</p>
                    <p className="sm:col-span-2"><strong>Behavior / safety:</strong> {asText(record.fields["Behavior / Safety Notes"]) || "No notes"}</p>
                    <p className="sm:col-span-2"><strong>Medical:</strong> {asText(record.fields["Medical Conditions / Medications"]) || "No notes"}</p>
                  </div>
                  <div className="space-y-3 lg:min-w-64">
                    <form action={saveRequest} className="space-y-3 rounded-2xl bg-slate-50 p-4">
                      <input type="hidden" name="requestId" value={record.id}/>
                      <label className="block text-xs font-semibold">Request status<select name="status" defaultValue={alreadyIntaken ? "Completed" : asText(record.fields.Status)} className="mt-1 w-full rounded-xl border bg-white px-3 py-2.5" disabled={alreadyIntaken}>{["New", "Under Review", "Contacted", "Waitlist", "Approved for Intake", "Declined", "Withdrawn", "Completed"].map((status) => <option key={status}>{status}</option>)}</select></label>
                      <label className="block text-xs font-semibold">Urgency<select name="urgency" defaultValue={asText(record.fields.Urgency) || "Routine"} className="mt-1 w-full rounded-xl border bg-white px-3 py-2.5" disabled={alreadyIntaken}>{["Routine", "Soon", "Urgent"].map((status) => <option key={status}>{status}</option>)}</select></label>
                      <div className="grid gap-2 sm:grid-cols-2"><label className="block text-xs font-semibold">Requested date<input name="requestedDate" type="date" defaultValue={asText(record.fields["Requested Surrender Date"]).slice(0, 10)} className="mt-1 w-full rounded-xl border bg-white px-3 py-2.5" disabled={alreadyIntaken}/></label><label className="block text-xs font-semibold">Can keep until<input name="canKeepUntil" type="date" defaultValue={asText(record.fields["Can Keep Animal Until"]).slice(0, 10)} className="mt-1 w-full rounded-xl border bg-white px-3 py-2.5" disabled={alreadyIntaken}/></label></div>
                      <label className="block text-xs font-semibold">Staff notes<textarea name="staffNotes" rows={2} defaultValue={asText(record.fields["Staff Notes"])} className="mt-1 w-full rounded-xl border bg-white px-3 py-2.5" disabled={alreadyIntaken}/></label>
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

        <section id="record-intake" className="mb-8 rounded-3xl border bg-white p-6 shadow-sm md:p-8">
          <details open={query.new === "1" || Boolean(selectedRequest)}>
            <summary className="cursor-pointer list-none"><div><h2 className="text-2xl font-bold">Record an Intake</h2><p className="mt-2 text-sm text-muted-foreground">{selectedRequest ? `Approved surrender request for ${asText(selectedRequest.fields["Animal Name"]) || "this animal"}. Request details have been carried into the form.` : "Use this form for approved owner surrenders and other accepted entry types."}</p></div></summary>
            {selectedRequest && <div className="mt-4 rounded-2xl bg-primary/5 p-4 text-sm">
              <strong>Approved request:</strong> {ownerName || "Owner name not provided"} · {[asText(selectedRequest.fields.Species), asText(selectedRequest.fields.Sex), asText(selectedRequest.fields["Approximate Age"]), asText(selectedRequest.fields["Breed / Mix"])].filter(Boolean).join(" · ") || "Animal details incomplete"}
              <p className="mt-2 text-muted-foreground">Spay / neuter status: {asText(selectedRequest.fields["Spay / Neuter Status"]) || "Not provided"} · Microchip: {[asText(selectedRequest.fields["Microchip Known"]), asText(selectedRequest.fields["Microchip Number"]), asText(selectedRequest.fields["Microchip Manufacturer"])].filter(Boolean).join(" · ") || "Not provided"} · Veterinarian: {[asText(selectedRequest.fields["Current Veterinarian"]), asText(selectedRequest.fields["Veterinarian Phone"]), asText(selectedRequest.fields["Veterinarian Address"])].filter(Boolean).join(" · ") || "Not provided"}</p>
              <p className="mt-2 whitespace-pre-line text-muted-foreground">{requestNotes || "No surrender reason, behavior, or medical details were provided."}</p>
            </div>}
            <div className="mt-6">
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
                  source: ownerName,
                  sourcePhone: asText(selectedRequest.fields.Phone),
                  sourceEmail: asText(selectedRequest.fields.Email),
                  intakeDate: todayChicago(),
                } : { intakeDate: todayChicago() }}
              />
            </div>
          </details>
        </section>

        <section className="rounded-3xl border bg-white p-6 shadow-sm md:p-8">
          <h2 className="text-2xl font-bold">Recent Intakes</h2>
          <div className="mt-4 divide-y">
            {intakes.slice(0, 12).map((record) => {
              const animalId = asStrings(record.fields.Animal)[0];
              const animal = animalById.get(animalId);
              return <Link key={record.id} href={animal ? `/portal/staff/animals/${animal.id}` : "/portal/staff/animals"} className="flex flex-wrap items-center justify-between gap-2 py-4 hover:text-primary"><span><strong>{asText(animal?.fields["Pet Name"]) || asText(record.fields["Pet Name"]) || "Animal"}</strong><span className="ml-2 text-sm text-muted-foreground">{asText(animal?.fields["Animal ID"])}</span></span><span className="text-sm text-muted-foreground">{asText(record.fields["Intake Type"])} · {formatDate(record.fields["Intake Date"])}</span></Link>;
            })}
            {!intakes.length && <p className="py-4 text-sm text-muted-foreground">No intakes have been recorded yet.</p>}
          </div>
        </section>
      </div>
    </main>
  );
}
