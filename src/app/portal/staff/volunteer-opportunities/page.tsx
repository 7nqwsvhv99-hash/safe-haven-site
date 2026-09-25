import Link from "next/link";
import { revalidatePath } from "next/cache";
import { ArrowLeft, HeartHandshake } from "lucide-react";
import {
  airtableCreate,
  airtableList,
  airtableUpdate,
  asStrings,
  asText,
  normalizeEmail,
  requirePortalRole,
  TABLES,
} from "@/lib/portal";
import {
  isVolunteerOpportunity,
  volunteerOpportunityMeta,
  volunteerOpportunityNames,
  type VolunteerOpportunity,
} from "@/lib/volunteer-opportunities";

const decisionStatuses = ["Pending Review", "Training / Verification Required", "Approved", "Declined"] as const;

function fmt(value: unknown) {
  const text = asText(value);
  if (!text) return "";
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

async function applyApprovedOpportunity(
  volunteerId: string,
  opportunity: VolunteerOpportunity,
  volunteers: Awaited<ReturnType<typeof airtableList>>
) {
  const volunteer = volunteers.find((record) => record.id === volunteerId);
  if (!volunteer) throw new Error("Volunteer record not found.");

  const meta = volunteerOpportunityMeta[opportunity];
  const nextAreas = Array.from(new Set([...asStrings(volunteer.fields["Volunteer Areas"]), ...meta.volunteerAreas]));
  await airtableUpdate(TABLES.volunteers, volunteer.id, { "Volunteer Areas": nextAreas }, true);

  if (!meta.clinicRole && !meta.clinicSkill) return;

  const members = await airtableList(TABLES.clinicMembers, [
    "Team Member Name",
    "Email",
    "Phone",
    "Role",
    "Active",
    "Receive Scheduling Emails",
    "Volunteer Record",
    "Volunteer Skills",
  ]);
  const email = normalizeEmail(asText(volunteer.fields.Email));
  const matching = members.filter((member) =>
    asStrings(member.fields["Volunteer Record"]).includes(volunteer.id) ||
    (email && normalizeEmail(asText(member.fields.Email)) === email)
  );
  if (matching.length > 1) throw new Error("Multiple Clinic Team records match this volunteer. Reconcile them before approving this request.");

  const existing = matching[0];
  const role = meta.clinicRole || asText(existing?.fields.Role) || "Clinic Volunteer";
  const skills = Array.from(new Set([
    ...asStrings(existing?.fields["Volunteer Skills"]),
    ...(meta.clinicSkill ? [meta.clinicSkill] : []),
  ]));
  const fields = {
    "Team Member Name": asText(volunteer.fields["Volunteer Name"]),
    Email: asText(volunteer.fields.Email),
    Phone: asText(volunteer.fields["Cell Phone"]),
    Role: role,
    Active: true,
    "Receive Scheduling Emails": true,
    "Volunteer Record": [volunteer.id],
    "Volunteer Skills": skills,
  };

  if (existing) await airtableUpdate(TABLES.clinicMembers, existing.id, fields, true);
  else await airtableCreate(TABLES.clinicMembers, fields, true);
}

export default async function VolunteerOpportunityRequestsPage() {
  await requirePortalRole("Staff");

  const [requests, volunteers] = await Promise.all([
    airtableList(TABLES.volunteerOpportunityRequests, [
      "Volunteer",
      "Opportunity",
      "Request Status",
      "Submitted At",
      "Volunteer Note",
      "Staff Note",
      "Reviewed At",
      "Reviewed By",
    ], { sort: [{ field: "Submitted At", direction: "desc" }] }),
    airtableList(TABLES.volunteers, [
      "Volunteer Name",
      "Email",
      "Cell Phone",
      "Status",
      "Volunteer Areas",
    ]),
  ]);

  const activeVolunteers = volunteers
    .filter((record) => asText(record.fields.Status) === "Active")
    .sort((a, b) => asText(a.fields["Volunteer Name"]).localeCompare(asText(b.fields["Volunteer Name"])));
  const volunteerById = new Map(volunteers.map((record) => [record.id, record]));
  const pending = requests.filter((record) => ["Pending Review", "Training / Verification Required"].includes(asText(record.fields["Request Status"])));
  const history = requests.filter((record) => !["Pending Review", "Training / Verification Required"].includes(asText(record.fields["Request Status"])));

  async function createRequest(formData: FormData) {
    "use server";
    await requirePortalRole("Staff", "write");
    const volunteerId = String(formData.get("volunteerId") || "");
    const opportunity = String(formData.get("opportunity") || "");
    const note = String(formData.get("note") || "").trim();
    if (!isVolunteerOpportunity(opportunity)) return;

    const latestVolunteers = await airtableList(TABLES.volunteers, ["Status"]);
    if (!latestVolunteers.some((record) => record.id === volunteerId && asText(record.fields.Status) === "Active")) return;

    const latestRequests = await airtableList(TABLES.volunteerOpportunityRequests, ["Volunteer", "Opportunity", "Request Status"]);
    const duplicate = latestRequests.some((record) =>
      asStrings(record.fields.Volunteer).includes(volunteerId) &&
      asText(record.fields.Opportunity) === opportunity &&
      ["Pending Review", "Training / Verification Required", "Approved"].includes(asText(record.fields["Request Status"]))
    );
    if (duplicate) return;

    await airtableCreate(TABLES.volunteerOpportunityRequests, {
      Volunteer: [volunteerId],
      Opportunity: opportunity,
      "Request Status": "Pending Review",
      "Submitted At": new Date().toISOString(),
      "Volunteer Note": note,
    }, true);

    revalidatePath("/portal/staff/volunteer-opportunities");
    revalidatePath("/portal/volunteer");
  }

  async function reviewRequest(formData: FormData) {
    "use server";
    const current = await requirePortalRole("Staff", "write");
    const requestId = String(formData.get("requestId") || "");
    const nextStatus = String(formData.get("status") || "");
    const staffNote = String(formData.get("staffNote") || "").trim();
    if (!(decisionStatuses as readonly string[]).includes(nextStatus)) return;

    const [latestRequests, latestVolunteers] = await Promise.all([
      airtableList(TABLES.volunteerOpportunityRequests, ["Volunteer", "Opportunity", "Request Status"]),
      airtableList(TABLES.volunteers, ["Volunteer Name", "Email", "Cell Phone", "Status", "Volunteer Areas"]),
    ]);
    const request = latestRequests.find((record) => record.id === requestId);
    if (!request || asText(request.fields["Request Status"]) === "Approved") return;

    const opportunity = asText(request.fields.Opportunity);
    if (!isVolunteerOpportunity(opportunity)) return;
    const volunteerId = asStrings(request.fields.Volunteer)[0];
    if (!volunteerId) return;

    if (nextStatus === "Approved") {
      await applyApprovedOpportunity(volunteerId, opportunity, latestVolunteers);
    }

    await airtableUpdate(TABLES.volunteerOpportunityRequests, request.id, {
      "Request Status": nextStatus,
      "Staff Note": staffNote,
      "Reviewed At": new Date().toISOString(),
      "Reviewed By": current.displayName || current.email,
    }, true);

    revalidatePath("/portal/staff/volunteer-opportunities");
    revalidatePath("/portal/volunteer");
    revalidatePath("/portal/clinic");
  }

  return <main className="min-h-screen bg-slate-50"><div className="container-custom py-10 md:py-12">
    <Link href="/portal/staff" className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"><ArrowLeft className="h-4 w-4"/> Staff Portal</Link>

    <header className="mb-8"><p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-primary">Volunteer Management</p><h1 className="text-4xl font-bold tracking-tight md:text-5xl">Volunteer Opportunity Requests</h1><p className="mt-4 max-w-3xl text-muted-foreground">A volunteer application is for joining Safe Haven. Current volunteers use an opportunity request to expand where they help. Clinic specialties stay in training or verification until the volunteer is ready and staff explicitly approves them.</p></header>

    <section className="mb-8 rounded-3xl border bg-white p-6 shadow-sm md:p-8">
      <div className="mb-5 flex items-center gap-3"><HeartHandshake className="h-6 w-6 text-primary"/><div><h2 className="text-2xl font-bold">Record a Request for a Volunteer</h2><p className="text-sm text-muted-foreground">Use this when a current volunteer contacts staff directly instead of submitting through the Volunteer Portal.</p></div></div>
      <form action={createRequest} className="grid gap-4 lg:grid-cols-[1fr_1fr_1.2fr_auto] lg:items-end">
        <label className="text-sm font-medium">Volunteer<select name="volunteerId" required defaultValue="" className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5"><option value="" disabled>Select volunteer</option>{activeVolunteers.map((volunteer)=><option key={volunteer.id} value={volunteer.id}>{asText(volunteer.fields["Volunteer Name"])} · {asText(volunteer.fields.Email)}</option>)}</select></label>
        <label className="text-sm font-medium">Opportunity<select name="opportunity" required defaultValue="" className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5"><option value="" disabled>Select opportunity</option>{volunteerOpportunityNames.map((opportunity)=><option key={opportunity}>{opportunity}</option>)}</select></label>
        <label className="text-sm font-medium">Volunteer note <span className="font-normal text-muted-foreground">(optional)</span><input name="note" className="mt-2 w-full rounded-xl border px-3 py-2.5"/></label>
        <button className="rounded-full bg-primary px-5 py-2.5 font-semibold text-white">Record Request</button>
      </form>
    </section>

    <section className="mb-8">
      <div className="mb-4 flex items-center justify-between gap-4"><h2 className="text-2xl font-bold">Needs Review</h2><span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">{pending.length}</span></div>
      <div className="space-y-4">
        {pending.map((request)=>{
          const volunteer=volunteerById.get(asStrings(request.fields.Volunteer)[0]);
          const opportunity=asText(request.fields.Opportunity);
          const meta=isVolunteerOpportunity(opportunity)?volunteerOpportunityMeta[opportunity]:null;
          return <article key={request.id} className="rounded-3xl border bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4"><div><h3 className="text-xl font-bold">{asText(volunteer?.fields["Volunteer Name"])||"Volunteer"}</h3><p className="mt-1 text-sm text-muted-foreground">{asText(volunteer?.fields.Email)}</p><p className="mt-3 font-semibold">{opportunity}</p><p className="mt-1 text-xs text-muted-foreground">Requested {fmt(request.fields["Submitted At"])}</p></div><span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">{asText(request.fields["Request Status"])}</span></div>
            {asText(request.fields["Volunteer Note"])&&<p className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm">{asText(request.fields["Volunteer Note"])}</p>}
            {meta?.requiresTrainingOrVerification&&<p className="mt-4 text-sm font-medium text-amber-700">This opportunity requires training or professional credential verification before it should be marked Approved.</p>}
            <form action={reviewRequest} className="mt-5 grid gap-4 border-t pt-5 md:grid-cols-[0.9fr_1.4fr_auto] md:items-end">
              <input type="hidden" name="requestId" value={request.id}/>
              <label className="text-sm font-medium">Decision<select name="status" defaultValue={asText(request.fields["Request Status"])} className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5">{decisionStatuses.map((status)=><option key={status}>{status}</option>)}</select></label>
              <label className="text-sm font-medium">Staff note<textarea name="staffNote" rows={2} defaultValue={asText(request.fields["Staff Note"])} className="mt-2 w-full rounded-xl border px-3 py-2.5"/></label>
              <button className="rounded-full bg-primary px-5 py-2.5 font-semibold text-white">Save Decision</button>
            </form>
          </article>;
        })}
        {!pending.length&&<div className="rounded-3xl border bg-white p-7 text-sm text-muted-foreground shadow-sm">No volunteer opportunity requests need review.</div>}
      </div>
    </section>

    <section><h2 className="mb-4 text-2xl font-bold">Recent Decisions</h2><div className="grid gap-4 lg:grid-cols-2">{history.slice(0,20).map((request)=>{const volunteer=volunteerById.get(asStrings(request.fields.Volunteer)[0]);return <article key={request.id} className="rounded-2xl border bg-white p-5"><div className="flex items-start justify-between gap-3"><div><p className="font-bold">{asText(volunteer?.fields["Volunteer Name"])||"Volunteer"}</p><p className="mt-1 text-sm">{asText(request.fields.Opportunity)}</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold">{asText(request.fields["Request Status"])}</span></div>{asText(request.fields["Staff Note"])&&<p className="mt-3 text-sm text-muted-foreground">{asText(request.fields["Staff Note"])}</p>}<p className="mt-3 text-xs text-muted-foreground">{asText(request.fields["Reviewed By"])}{asText(request.fields["Reviewed At"])? " · "+fmt(request.fields["Reviewed At"]):""}</p></article>})}{!history.length&&<p className="text-sm text-muted-foreground">No completed opportunity decisions yet.</p>}</div></section>
  </div></main>;
}
