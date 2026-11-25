import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { randomUUID } from "node:crypto";
import { ArrowLeft, CalendarDays } from "lucide-react";
import { chicagoLocalToIso } from "@/lib/event-dates";
import {
  airtableCreate, airtableList, airtableUpdate, asNumber, asStrings, asText,
  getPortalContext, TABLES,
} from "@/lib/portal";
import { markEventCapacitySaved, releaseEventCapacity, reserveEventCapacity, updateCapacityLimit } from "@/lib/event-capacity";

function when(value: unknown) {
  const raw = asText(value);
  if (!raw) return "Time not set";
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return "Time not set";
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/Chicago",
  }).format(date);
}

function localInput(value: unknown) {
  const date = new Date(asText(value));
  if (Number.isNaN(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Chicago", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value || "";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

export default async function EventVolunteerManagementPage() {
  const context = await getPortalContext();
  if (!context.hasAccess) redirect("/portal");
  const authorized = context.isAdministrator || context.roles.some((role) => ["Volunteer Coordinator", "Shelter Manager", "Executive Director"].includes(role));
  if (!authorized) return <main className="container-custom py-10"><Link href="/portal/staff">Staff Portal</Link><h1 className="mt-4 text-2xl font-bold">Event Volunteer Shifts</h1><p className="mt-2">This area is available to Volunteer Coordinators and shelter leadership.</p></main>;

  const [events, shifts, volunteers, invitations] = await Promise.all([
    airtableList(TABLES.events, ["Event Name", "Event Status", "Start Date & Time", "Location Name", "Volunteers Needed"], { sort: [{ field: "Start Date & Time", direction: "asc" }] }),
    airtableList(TABLES.volunteerShifts, ["Shift", "Event", "Start Date & Time", "End Date & Time", "Status", "Location", "Capacity"]),
    airtableList(TABLES.volunteers, ["Volunteer Name", "Email", "Status", "Volunteer Areas", "Application Interests / Experience"] , { sort: [{ field: "Volunteer Name", direction: "asc" }] }),
    airtableList(TABLES.eventVolunteerInvitations, ["Invitation ID", "Event", "Shift", "Volunteer", "Status", "Invited At", "Responded At", "Invited By", "Notes"]),
  ]);
  const eventById = new Map(events.map((event) => [event.id, event]));
  const volunteerById = new Map(volunteers.map((volunteer) => [volunteer.id, volunteer]));
  const activeEvents = events.filter((event) => asText(event.fields["Event Status"]) === "Published" && Boolean(event.fields["Volunteers Needed"]));

  async function inviteVolunteer(formData: FormData) {
    "use server";
    const current = await getPortalContext();
    if (!current.isAdministrator && !current.roles.some((role) => ["Volunteer Coordinator", "Shelter Manager", "Executive Director"].includes(role))) throw new Error("Not authorized to invite event volunteers.");
    const shiftId = String(formData.get("shiftId") || "");
    const volunteerId = String(formData.get("volunteerId") || "");
    const requestKey = `event-invite-${randomUUID()}`;
    const baselineAt = Date.now();
    let capacityReserved = false;
    const [latestEvents, latestShifts, latestVolunteers, latestInvitations] = await Promise.all([
      airtableList(TABLES.events, ["Event Name", "Event Status", "Volunteers Needed"]),
      airtableList(TABLES.volunteerShifts, ["Event", "Status", "Capacity"]),
      airtableList(TABLES.volunteers, ["Status"]),
      airtableList(TABLES.eventVolunteerInvitations, ["Shift", "Volunteer", "Status"]),
    ]);
    const shift = latestShifts.find((item) => item.id === shiftId);
    const eventId = asStrings(shift?.fields.Event)[0];
    const event = latestEvents.find((item) => item.id === eventId);
    const volunteer = latestVolunteers.find((item) => item.id === volunteerId);
    if (!shift || asText(shift.fields.Status) === "Cancelled" || !event || asText(event.fields["Event Status"]) !== "Published" || !Boolean(event.fields["Volunteers Needed"]) || !volunteer || asText(volunteer.fields.Status) !== "Active") throw new Error("That event shift or volunteer is no longer available.");
    const cap = Math.max(1, Math.floor(asNumber(shift.fields.Capacity) || 3));
    const currentHolds = latestInvitations.filter((item) => asStrings(item.fields.Shift).includes(shiftId) && ["Invited", "Accepted", "Reconfirmation Required"].includes(asText(item.fields.Status)));
    if (currentHolds.length >= cap) throw new Error("This shift is full. Refresh the page and choose another shift.");
    if (currentHolds.some((item) => asStrings(item.fields.Volunteer).includes(volunteerId))) throw new Error("This volunteer already has an active invitation for the shift.");
    try {
      await reserveEventCapacity(requestKey, [{ optionId: `event-shift:${shiftId}`, capacity: cap, used: currentHolds.length, quantity: 1, baselineAt }]);
      capacityReserved = true;
      await airtableCreate(TABLES.eventVolunteerInvitations, {
        "Invitation ID": requestKey,
        Event: [eventId], Shift: [shiftId], Volunteer: [volunteerId], Status: "Invited",
        "Invited At": new Date().toISOString(), "Invited By": current.email,
        Notes: "Portal invitation. No email was sent.", "Volunteer Notice": "",
      }, true);
      await markEventCapacitySaved(requestKey);
    } catch (error) {
      if (capacityReserved) await releaseEventCapacity(requestKey).catch((releaseError) => console.error("Could not release shift invitation hold", releaseError));
      throw error;
    }
    revalidatePath("/portal/staff/event-volunteers");
    revalidatePath("/portal/volunteer");
  }

  async function releaseInvitation(formData: FormData) {
    "use server";
    const current = await getPortalContext();
    if (!current.isAdministrator && !current.roles.some((role) => ["Volunteer Coordinator", "Shelter Manager", "Executive Director"].includes(role))) throw new Error("Not authorized to change event volunteers.");
    const id = String(formData.get("invitationId") || "");
    const rows = await airtableList(TABLES.eventVolunteerInvitations, ["Status", "Invitation ID"]);
    const row = rows.find((item) => item.id === id);
    if (!row || !["Invited", "Accepted", "Reconfirmation Required"].includes(asText(row.fields.Status))) return;
    await airtableUpdate(TABLES.eventVolunteerInvitations, id, { Status: "Released", "Responded At": new Date().toISOString(), "Volunteer Notice": "Your event shift place was released by the coordinator." }, true);
    const requestKey = asText(row.fields["Invitation ID"]);
    if (requestKey) await releaseEventCapacity(requestKey).catch((error) => console.error("Could not release event volunteer place hold", error));
    revalidatePath("/portal/staff/event-volunteers");
    revalidatePath("/portal/volunteer");
  }

  async function saveShift(formData: FormData) {
    "use server";
    const current = await getPortalContext();
    if (!current.isAdministrator && !current.roles.some((role) => ["Volunteer Coordinator", "Shelter Manager", "Executive Director"].includes(role))) throw new Error("Not authorized to change event shifts.");
    const shiftId = String(formData.get("shiftId") || "");
    const startIso = chicagoLocalToIso(String(formData.get("start") || ""));
    const endIso = chicagoLocalToIso(String(formData.get("end") || ""));
    const location = String(formData.get("location") || "").trim();
    const capacity = Number(formData.get("capacity"));
    if (Date.parse(endIso) <= Date.parse(startIso)) throw new Error("Shift end must be after its start.");
    if (!Number.isInteger(capacity) || capacity < 1 || capacity > 100) throw new Error("Capacity must be between 1 and 100.");
    const baselineAt = Date.now();
    const [latestShifts, latestInvitations] = await Promise.all([
      airtableList(TABLES.volunteerShifts, ["Event", "Status", "Start Date & Time", "End Date & Time", "Location", "Capacity"]),
      airtableList(TABLES.eventVolunteerInvitations, ["Shift", "Status"]),
    ]);
    const shift = latestShifts.find((item) => item.id === shiftId);
    if (!shift || asText(shift.fields.Status) === "Cancelled") throw new Error("That shift is no longer available.");
    const active = latestInvitations.filter((item) => asStrings(item.fields.Shift).includes(shiftId) && ["Invited", "Accepted", "Reconfirmation Required"].includes(asText(item.fields.Status)));
    const existingStart = asText(shift.fields["Start Date & Time"]);
    const existingEnd = asText(shift.fields["End Date & Time"]);
    const existingLocation = asText(shift.fields.Location);
    const timingChanged = Date.parse(existingStart) !== Date.parse(startIso) || Date.parse(existingEnd) !== Date.parse(endIso) || existingLocation !== location;
    await updateCapacityLimit(`event-shift:${shiftId}`, capacity, active.length, baselineAt, async () => {
      await airtableUpdate(TABLES.volunteerShifts, shiftId, { "Start Date & Time": startIso, "End Date & Time": endIso, Location: location, Capacity: capacity }, true);
    });
    if (timingChanged) {
      const date = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "America/Chicago" }).format(new Date(startIso));
      const hours = `${new Intl.DateTimeFormat("en-US", { timeStyle: "short", timeZone: "America/Chicago" }).format(new Date(startIso))}–${new Intl.DateTimeFormat("en-US", { timeStyle: "short", timeZone: "America/Chicago" }).format(new Date(endIso))}`;
      for (const invitation of active) await airtableUpdate(TABLES.eventVolunteerInvitations, invitation.id, { Status: "Reconfirmation Required", "Volunteer Notice": `This shift changed to ${date}, ${hours} at ${location}. Please reconfirm or release your place.` }, true);
    }
    revalidatePath("/portal/staff/event-volunteers");
    revalidatePath("/portal/volunteer");
  }

  const eventShifts = shifts.filter((shift) => asStrings(shift.fields.Event).some((id) => eventById.has(id)));
  return <main className="min-h-screen bg-slate-50"><div className="container-custom py-10 md:py-12">
    <Link href="/portal/staff" className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"><ArrowLeft className="h-4 w-4"/> Staff Portal</Link>
    <header className="mb-8"><p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-primary">Events</p><h1 className="text-4xl font-bold tracking-tight md:text-5xl">Volunteer Shifts</h1><p className="mt-3 max-w-3xl text-muted-foreground">Assign active volunteers to event shifts. Invitations appear in each volunteer’s portal. This page does not send email.</p></header>
    {activeEvents.length === 0 ? <section className="rounded-3xl border bg-white p-7 shadow-sm">No published events currently need volunteers.</section> : <div className="space-y-6">{activeEvents.map((event) => {
      const linkedShifts = eventShifts.filter((shift) => asStrings(shift.fields.Event).includes(event.id) && asText(shift.fields.Status) !== "Cancelled");
      const eventInvitations = invitations.filter((row) => asStrings(row.fields.Event).includes(event.id));
      return <section key={event.id} className="rounded-3xl border bg-white p-6 shadow-sm md:p-8"><div className="mb-5 flex items-start gap-3"><CalendarDays className="mt-1 h-6 w-6 text-primary"/><div><h2 className="text-2xl font-bold">{asText(event.fields["Event Name"])}</h2><p className="mt-1 text-sm text-muted-foreground">{when(event.fields["Start Date & Time"])} · {asText(event.fields["Location Name"])}</p></div></div>
        {linkedShifts.length === 0 ? <p className="rounded-xl bg-amber-50 p-4 text-sm">No volunteer shifts are linked to this event yet. Update the event with “Volunteers needed” enabled and save it to generate shifts.</p> : <div className="space-y-4">{linkedShifts.map((shift) => {
          const shiftInvitations = eventInvitations.filter((row) => asStrings(row.fields.Shift).includes(shift.id));
          const held = shiftInvitations.filter((row) => ["Invited", "Accepted", "Reconfirmation Required"].includes(asText(row.fields.Status))).length;
          const capacity = Math.max(1, Math.floor(asNumber(shift.fields.Capacity) || 3));
          const candidates = volunteers.filter((person) => asText(person.fields.Status) === "Active" && !shiftInvitations.some((row) => asStrings(row.fields.Volunteer).includes(person.id) && ["Invited", "Accepted", "Reconfirmation Required"].includes(asText(row.fields.Status))));
          return <article key={shift.id} className="rounded-2xl bg-slate-50 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-semibold">{asText(shift.fields.Shift)}</h3><p className="mt-1 text-sm text-muted-foreground">{when(shift.fields["Start Date & Time"])} to {when(shift.fields["End Date & Time"])} · {asText(shift.fields.Location)}</p></div><span className="rounded-full bg-white px-3 py-1 text-xs font-semibold">{held} of {capacity} places held</span></div>
            <form action={saveShift} className="mt-4 grid gap-3 rounded-xl border bg-white p-3 sm:grid-cols-2 xl:grid-cols-5"><input type="hidden" name="shiftId" value={shift.id}/><label className="text-xs font-semibold">Start (Central)<input name="start" type="datetime-local" required defaultValue={localInput(shift.fields["Start Date & Time"])} className="mt-1 w-full rounded-lg border px-2 py-2 text-sm"/></label><label className="text-xs font-semibold">End (Central)<input name="end" type="datetime-local" required defaultValue={localInput(shift.fields["End Date & Time"])} className="mt-1 w-full rounded-lg border px-2 py-2 text-sm"/></label><label className="text-xs font-semibold">Location<input name="location" required defaultValue={asText(shift.fields.Location)} className="mt-1 w-full rounded-lg border px-2 py-2 text-sm"/></label><label className="text-xs font-semibold">Capacity<input name="capacity" type="number" min="1" max="100" step="1" required defaultValue={capacity} className="mt-1 w-full rounded-lg border px-2 py-2 text-sm"/></label><button className="self-end rounded-full border border-primary px-4 py-2 text-sm font-semibold text-primary">Save shift</button></form>
            {held < capacity && candidates.length > 0 && <form action={inviteVolunteer} className="mt-4 flex flex-col gap-3 sm:flex-row"><input type="hidden" name="shiftId" value={shift.id}/><select required name="volunteerId" defaultValue="" className="min-w-0 flex-1 rounded-xl border bg-white px-3 py-2.5"><option value="" disabled>Select an active volunteer</option>{candidates.map((person)=>{const areas=asStrings(person.fields["Volunteer Areas"]);const interests=asText(person.fields["Application Interests / Experience"]).split(/\r?\n/).find(line=>line.startsWith("Volunteer Interests:"))?.replace("Volunteer Interests:","").trim();const skills=[...areas,...(interests?[interests]:[])].filter(Boolean).join(" · ");return <option key={person.id} value={person.id}>{asText(person.fields["Volunteer Name"]) || "Volunteer"}{skills?` · ${skills}`:""}</option>})}</select><button className="rounded-full bg-primary px-5 py-2.5 font-semibold text-white">Invite in portal</button></form>}
            {held >= capacity && <p className="mt-4 text-sm text-muted-foreground">All places are currently held by invitations or accepted volunteers.</p>}
            <div className="mt-4 space-y-2">{shiftInvitations.map((invitation) => {const volunteer = volunteerById.get(asStrings(invitation.fields.Volunteer)[0]); return <div key={invitation.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-white px-3 py-2 text-sm"><span><strong>{asText(volunteer?.fields["Volunteer Name"]) || "Volunteer"}</strong> · {asText(invitation.fields.Status)}</span>{["Invited", "Accepted", "Reconfirmation Required"].includes(asText(invitation.fields.Status)) && <form action={releaseInvitation}><input type="hidden" name="invitationId" value={invitation.id}/><button className="text-sm font-semibold text-primary underline">Release place</button></form>}</div>;})}</div>
          </article>;
        })}</div>}
      </section>;
    })}</div>}
  </div></main>;
}
