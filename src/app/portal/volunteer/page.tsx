import Link from "next/link";
import { revalidatePath } from "next/cache";
import { markEventCapacitySaved, releaseEventCapacity, reserveEventCapacity } from "@/lib/event-capacity";
import { CalendarDays, Clock3, Megaphone, Wrench, ArrowLeft, HeartHandshake } from "lucide-react";
import { requirePortalRole, getVolunteerPortalData, airtableCreate, airtableList, airtableUpdate, asNumber, asStrings, asText, TABLES } from "@/lib/portal";
import { isVolunteerOpportunity, volunteerOpportunityNames } from "@/lib/volunteer-opportunities";

function formatDateTime(value: string) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Chicago",
  }).format(new Date(value));
}

function formatDate(value: string) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "America/Chicago",
  }).format(new Date(value));
}

function applicationOpportunityNames(value: string) {
  const line = value.split(/\r?\n/).find((entry) => entry.startsWith("Volunteer Interests:"));
  if (!line) return [];
  return line
    .slice("Volunteer Interests:".length)
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => (volunteerOpportunityNames as readonly string[]).includes(entry));
}

export default async function VolunteerPortalPage() {
  const context = await requirePortalRole("Volunteer");
  const data = await getVolunteerPortalData(context.email);
  const canWriteVolunteer = context.isAdministrator || context.roles.includes("Volunteer");
  const currentOpportunities = new Set<string>([
    ...applicationOpportunityNames(data.volunteer?.applicationInterests || ""),
    ...data.opportunityRequests
      .filter((request) => request.status === "Approved")
      .map((request) => request.opportunity),
  ]);
  const unavailableOpportunities = new Set<string>([
    ...currentOpportunities,
    ...data.opportunityRequests
      .filter((request) => ["Pending Review", "Training / Verification Required"].includes(request.status))
      .map((request) => request.opportunity),
  ]);
  const availableOpportunities = volunteerOpportunityNames.filter(
    (opportunity) => !unavailableOpportunities.has(opportunity)
  );

  async function logHours(formData: FormData) {
    "use server";
    const current = await requirePortalRole("Volunteer", "write");
    const latest = await getVolunteerPortalData(current.email);
    if (!latest.volunteer) return;

    const date = String(formData.get("date") || "");
    const hours = Number(formData.get("hours") || 0);
    const activity = String(formData.get("activity") || "");
    if (!date || !Number.isFinite(hours) || hours <= 0 || !activity) return;

    await airtableCreate(TABLES.volunteerHours, {
      Date: date,
      Volunteer: [latest.volunteer.id],
      Hours: hours,
      "Volunteer Activity": activity,
    });

    revalidatePath("/portal/volunteer");
  }

  async function requestOpportunity(formData: FormData) {
    "use server";
    const current = await requirePortalRole("Volunteer", "write");
    const latest = await getVolunteerPortalData(current.email);
    if (!latest.volunteer) return;

    const opportunity = String(formData.get("opportunity") || "");
    if (!isVolunteerOpportunity(opportunity)) return;

    const alreadyOpen = latest.opportunityRequests.some(
      (request) =>
        request.opportunity === opportunity &&
        ["Pending Review", "Training / Verification Required", "Approved"].includes(request.status)
    );
    if (alreadyOpen) return;

    await airtableCreate(TABLES.volunteerOpportunityRequests, {
      Volunteer: [latest.volunteer.id],
      Opportunity: opportunity,
      "Request Status": "Pending Review",
      "Submitted At": new Date().toISOString(),
    }, true);

    revalidatePath("/portal/volunteer");
    revalidatePath("/portal/staff/volunteer-opportunities");
  }

  async function respondToEventInvitation(formData: FormData) {
    "use server";
    const current = await requirePortalRole("Volunteer", "write");
    const latest = await getVolunteerPortalData(current.email);
    if (!latest.volunteer) return;
    const invitationId = String(formData.get("invitationId") || "");
    const response = String(formData.get("response") || "");
    const invitation = latest.eventInvitations.find((item) => item.id === invitationId);
    if (!invitation || !["Accept", "Decline", "Release", "Dismiss"].includes(response)) return;
    if (response === "Dismiss") {
      if (!invitation.notice) return;
      await airtableUpdate(TABLES.eventVolunteerInvitations, invitation.id, { "Volunteer Notice": "" }, true);
      revalidatePath("/portal/volunteer");
      return;
    }
    if (response === "Release" && invitation.status !== "Accepted") return;
    if (response !== "Release" && !["Invited", "Reconfirmation Required"].includes(invitation.status)) return;
    const status = response === "Accept" ? "Accepted" : response === "Decline" ? "Declined" : "Released";
    await airtableUpdate(TABLES.eventVolunteerInvitations, invitation.id, {
      Status: status,
      "Responded At": new Date().toISOString(),
      "Volunteer Notice": "",
    }, true);
    if (status === "Declined" || status === "Released") await releaseEventCapacity(invitation.invitationKey).catch((error) => console.error("Could not release volunteer shift hold", error));
    revalidatePath("/portal/volunteer");
    revalidatePath("/portal/staff/event-volunteers");
  }

  async function signUpForEventShift(formData: FormData) {
    "use server";
    const current = await requirePortalRole("Volunteer", "write");
    const latest = await getVolunteerPortalData(current.email);
    if (!latest.volunteer) return;
    const shiftId = String(formData.get("shiftId") || "");
    const offered = latest.openEventShifts.find((shift) => shift.id === shiftId);
    if (!offered) return;
    const baselineAt = Date.now();
    const requestKey = `event-signup:${latest.volunteer.id}:${shiftId}`;
    const [shifts, invitations, events] = await Promise.all([
      airtableList(TABLES.volunteerShifts,["Event","Status","Capacity","Start Date & Time","End Date & Time"]),
      airtableList(TABLES.eventVolunteerInvitations,["Shift","Volunteer","Status"]),
      airtableList(TABLES.events,["Event Status","Publish on Website","Volunteers Needed"]),
    ]);
    const shift=shifts.find((row)=>row.id===shiftId);
    const eventId=asStrings(shift?.fields.Event)[0];
    const event=events.find((row)=>row.id===eventId);
    if(!shift||asText(shift.fields.Status)==="Cancelled"||!event||asText(event.fields["Event Status"])!=="Published"||event.fields["Publish on Website"]!==true||event.fields["Volunteers Needed"]!==true) return;
    const end=Date.parse(asText(shift.fields["End Date & Time"]));
    if(Number.isFinite(end)&&end<Date.now()) return;
    const capacity=Math.max(1,Math.floor(asNumber(shift.fields.Capacity)||3));
    const active=invitations.filter((row)=>asStrings(row.fields.Shift).includes(shiftId)&&["Invited","Accepted","Reconfirmation Required"].includes(asText(row.fields.Status)));
    if(active.some((row)=>asStrings(row.fields.Volunteer).includes(latest.volunteer!.id))) return;
    if(active.length>=capacity) return;
    let reserved=false;
    try {
      await reserveEventCapacity(requestKey,[{optionId:`event-shift:${shiftId}`,capacity,used:active.length,quantity:1,baselineAt}]);
      reserved=true;
      await airtableCreate(TABLES.eventVolunteerInvitations,{
        "Invitation ID":requestKey,Event:[eventId],Shift:[shiftId],Volunteer:[latest.volunteer.id],Status:"Accepted",
        "Invited At":new Date().toISOString(),"Responded At":new Date().toISOString(),"Invited By":"Volunteer Portal",
        Notes:"Volunteer signed up in the portal.","Volunteer Notice":"",
      },true);
      await markEventCapacitySaved(requestKey);
    } catch(error) {
      if(reserved) await releaseEventCapacity(requestKey).catch((releaseError)=>console.error("Could not release self-signup capacity hold",releaseError));
      throw error;
    }
    revalidatePath("/portal/volunteer");
    revalidatePath("/portal/staff/event-volunteers");
    revalidatePath("/portal/staff/reports");
  }

  return (
    <div className="min-h-[calc(100vh-5rem)] bg-slate-50">
      <section className="container-custom py-10 md:py-12">
        <div className="mx-auto max-w-6xl">
          <Link href="/portal" className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline">
            <ArrowLeft className="h-4 w-4" /> Team Portal
          </Link>

          <div className="mb-10">
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-primary">Volunteer Portal</p>
            <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
              {data.volunteer ? `Welcome, ${data.volunteer.name || context.displayName}` : "Volunteer Portal"}
            </h1>
            <p className="mt-4 max-w-3xl text-muted-foreground">
              Your schedule, service hours, announcements, current needs, and volunteer opportunities in one place.
            </p>
          </div>

          {!data.volunteer && !context.isBoard ? (
            <div className="rounded-3xl border bg-white p-8 shadow-sm">
              <h2 className="text-2xl font-bold">We could not match this sign-in to an active volunteer record.</h2>
              <p className="mt-3 text-muted-foreground">
                The email on your Clerk account needs to match the email on your active Safe Haven volunteer record.
              </p>
            </div>
          ) : (
            <div className="space-y-8">
              {context.isBoard && !data.volunteer && <div className="rounded-2xl border border-primary/15 bg-primary/5 p-5 text-sm"><strong>Board View:</strong> This account is not linked to a volunteer profile. Shared announcements, current needs, and the volunteer interface are available below. Personalized schedules and hour history appear only for an active volunteer.</div>}

              <details className="rounded-2xl border bg-white p-5 shadow-sm"><summary className="cursor-pointer font-semibold text-primary">Quick guide for event volunteers</summary><div className="mt-4 space-y-2 text-sm text-slate-700"><p>Review the event, shift time, location, and open places before signing up.</p><p>Respond to invitations in this portal. If you can no longer attend an accepted shift, release it as soon as possible so another volunteer can take the place.</p><p>If an event is rescheduled, review the updated time and location and reconfirm only if you can still attend. Contact the Volunteer Coordinator if you need help.</p></div></details>

              {data.announcements.length > 0 && (
                <section className="rounded-3xl border bg-white p-7 shadow-sm">
                  <div className="mb-5 flex items-center gap-3">
                    <Megaphone className="h-6 w-6 text-primary" />
                    <h2 className="text-2xl font-bold">Announcements</h2>
                  </div>
                  <div className="space-y-4">
                    {data.announcements.map((item) => (
                      <div key={item.id} className="rounded-2xl bg-slate-50 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <h3 className="font-semibold">{item.title}</h3>
                          {item.priority !== "Normal" && (
                            <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">{item.priority}</span>
                          )}
                        </div>
                        <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">{item.message}</p>
                        {item.ctaUrl && (
                          <a href={item.ctaUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-sm font-semibold text-primary hover:underline">
                            {item.ctaLabel || "Open"}
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              <Link href="/portal/volunteer/attendance" className="inline-flex rounded-full bg-primary px-6 py-3 font-semibold text-white">Check In / Check Out</Link>
              {data.volunteer && data.eventInvitations.length > 0 && <section className="rounded-3xl border bg-white p-7 shadow-sm">
                <div className="mb-5 flex items-center gap-3"><CalendarDays className="h-6 w-6 text-primary"/><h2 className="text-2xl font-bold">Event Volunteer Shifts</h2></div>
                <div className="grid gap-4 md:grid-cols-2">{data.eventInvitations.map((invitation) => <article key={invitation.id} className="rounded-2xl bg-slate-50 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-semibold">{invitation.shift?.title || "Event shift"}</h3><p className="mt-1 text-sm text-muted-foreground">{invitation.shift?.start ? formatDateTime(invitation.shift.start) : "Time to be confirmed"}{invitation.shift?.end ? ` – ${new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/Chicago" }).format(new Date(invitation.shift.end))}` : ""}</p>{invitation.shift?.location && <p className="mt-1 text-sm text-muted-foreground">{invitation.shift.location}</p>}{invitation.notes && <p className="mt-2 text-sm">{invitation.notes}</p>}</div><span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">{invitation.status}</span></div>
                  {invitation.notice && <p role="status" className="mt-3 rounded-xl border border-orange-300 bg-orange-50 p-3 text-sm font-medium text-orange-950">{invitation.notice}</p>}
                  <div className="mt-4 flex flex-wrap gap-2">{["Invited", "Reconfirmation Required"].includes(invitation.status) ? <><form action={respondToEventInvitation}><input type="hidden" name="invitationId" value={invitation.id}/><input type="hidden" name="response" value="Accept"/><button className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white">{invitation.status === "Reconfirmation Required" ? "Confirm new time" : "Accept shift"}</button></form><form action={respondToEventInvitation}><input type="hidden" name="invitationId" value={invitation.id}/><input type="hidden" name="response" value="Decline"/><button className="rounded-full border px-4 py-2 text-sm font-semibold">Decline</button></form></> : invitation.status === "Accepted" ? <form action={respondToEventInvitation}><input type="hidden" name="invitationId" value={invitation.id}/><input type="hidden" name="response" value="Release"/><button className="rounded-full border px-4 py-2 text-sm font-semibold">Release my place</button></form> : null}{invitation.notice&&!["Invited","Accepted","Reconfirmation Required"].includes(invitation.status)&&<form action={respondToEventInvitation}><input type="hidden" name="invitationId" value={invitation.id}/><input type="hidden" name="response" value="Dismiss"/><button className="rounded-full border px-4 py-2 text-sm font-semibold">Dismiss update</button></form>}</div>
                </article>)}</div>
              </section>}
              {data.volunteer && <section className="rounded-3xl border bg-white p-7 shadow-sm">
                <div className="mb-5 flex items-center gap-3"><CalendarDays className="h-6 w-6 text-primary"/><h2 className="text-2xl font-bold">Open Event Shifts</h2></div>
                {data.openEventShifts.length ? <div className="grid gap-4 md:grid-cols-2">{data.openEventShifts.map((shift)=><article key={shift.id} className="rounded-2xl bg-slate-50 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wide text-primary">{shift.eventName}</p><h3 className="mt-1 font-semibold">{shift.title}</h3><p className="mt-1 text-sm text-muted-foreground">{shift.start ? formatDateTime(shift.start) : "Time to be confirmed"}{shift.end ? ` – ${new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/Chicago" }).format(new Date(shift.end))}` : ""}</p>{shift.location&&<p className="mt-1 text-sm text-muted-foreground">{shift.location}</p>}</div><span className="rounded-full bg-white px-3 py-1 text-xs font-semibold">{shift.available} {shift.available===1?"place":"places"} open</span></div><form action={signUpForEventShift} className="mt-4"><input type="hidden" name="shiftId" value={shift.id}/><button className="rounded-full bg-primary px-5 py-2.5 font-semibold text-white">Sign up</button></form></article>)}</div> : <p className="text-muted-foreground">There are no open event shifts at the moment. Check back for new opportunities.</p>}
              </section>}
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <section className="rounded-3xl border bg-white p-7 shadow-sm">
                  <div className="mb-5 flex items-center gap-3">
                    <CalendarDays className="h-6 w-6 text-primary" />
                    <h2 className="text-2xl font-bold">My Schedule</h2>
                  </div>
                  {data.shifts.length ? (
                    <div className="space-y-4">
                      {data.shifts.map((shift) => (
                        <div key={shift.id} className="rounded-2xl bg-slate-50 p-4">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <p className="font-semibold">{shift.shift || shift.area || "Volunteer Shift"}</p>
                              <p className="mt-1 text-sm text-muted-foreground">{formatDateTime(shift.start)}</p>
                              {shift.location && <p className="mt-1 text-sm text-muted-foreground">{shift.location}</p>}
                            </div>
                            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">{shift.status}</span>
                          </div>
                          {shift.notes && <p className="mt-3 text-sm text-muted-foreground">{shift.notes}</p>}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No upcoming volunteer shifts are currently assigned to you.</p>
                  )}
                </section>

                <section className="rounded-3xl border bg-white p-7 shadow-sm">
                  <div className="mb-5 flex items-center gap-3">
                    <Clock3 className="h-6 w-6 text-primary" />
                    <h2 className="text-2xl font-bold">Log Hours</h2>
                  </div>
                  <form action={logHours} className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <label className="text-sm font-medium">
                        Date
                        <input required name="date" type="date" className="mt-2 w-full rounded-xl border bg-white px-3 py-2" />
                      </label>
                      <label className="text-sm font-medium">
                        Hours
                        <input required min="0.25" step="0.25" name="hours" type="number" className="mt-2 w-full rounded-xl border bg-white px-3 py-2" />
                      </label>
                    </div>
                    <label className="block text-sm font-medium">
                      Activity
                      <select required name="activity" className="mt-2 w-full rounded-xl border bg-white px-3 py-2">
                        <option value="">Select an activity</option>
                        <option>Clinic</option>
                        <option>Adoption & Community Events</option>
                        <option>Host an Event or Fundraiser</option>
                        <option>Transportation</option>
                        <option>Gardening & Grounds</option>
                        <option>Dog Socializing & Exercise</option>
                        <option>Cat Socializing & Enrichment</option>
                        <option>Pet Food Pantry</option>
                        <option>Building Maintenance</option>
                        <option>Photography</option>
                        <option>Social Media & Content</option>
                        <option>Administrative Support</option>
                        <option>Fundraising & Event Support</option>
                        <option>Other</option>
                      </select>
                    </label>
                    <button className="rounded-full bg-primary px-5 py-2.5 font-semibold text-white shadow-sm hover:opacity-90" type="submit">
                      Save Hours
                    </button>
                  </form>

                  {data.hours.length > 0 && (
                    <div className="mt-7 border-t pt-5">
                      <h3 className="font-semibold">Recent entries</h3>
                      <div className="mt-3 space-y-2">
                        {data.hours.slice(0, 5).map((entry) => (
                          <div key={entry.id} className="flex items-center justify-between gap-4 text-sm">
                            <span>{formatDate(entry.date)} · {entry.activity}</span>
                            <strong>{entry.hours ?? 0} hr</strong>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </section>
              </div>

              {data.needs.length > 0 && (
                <section className="rounded-3xl border bg-white p-7 shadow-sm">
                  <div className="mb-5 flex items-center gap-3">
                    <Wrench className="h-6 w-6 text-primary" />
                    <h2 className="text-2xl font-bold">Current Needs</h2>
                  </div>
                  <div className="space-y-4">
                    {data.needs.map((need) => (
                      <div key={need.id} className="rounded-2xl bg-slate-50 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="font-semibold">{need.need}</h3>
                            <p className="mt-1 text-sm text-muted-foreground">{need.details}</p>
                            {need.goal && <p className="mt-1 text-xs font-medium text-muted-foreground">{need.goal}</p>}
                          </div>
                          {need.priority !== "Normal" && <span className="text-xs font-semibold text-primary">{need.priority}</span>}
                        </div>
                        {need.ctaUrl && (
                          <a href={need.ctaUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-sm font-semibold text-primary hover:underline">
                            {need.ctaLabel || "Help with this need"}
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              <section className="rounded-3xl border bg-white p-7 shadow-sm">
                <div className="mb-4 flex items-center gap-3">
                  <CalendarDays className="h-6 w-6 text-primary" />
                  <h2 className="text-2xl font-bold">Volunteer Calendar</h2>
                </div>
                <p className="mb-5 text-sm text-muted-foreground">
                  View upcoming Safe Haven volunteer opportunities and scheduled activities.
                </p>
                <a href="https://www.calendarwiz.com/calendars/calendar.php?crd=safehavenil&nolog=0&cid[]=all" target="_blank" rel="noopener noreferrer" className="inline-flex rounded-full border border-primary px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/5">
                  Open Volunteer Calendar
                </a>
              </section>

              {data.volunteer && canWriteVolunteer && (
                <section className="rounded-3xl border bg-white p-7 shadow-sm">
                  <div className="mb-5 flex items-center gap-3">
                    <HeartHandshake className="h-6 w-6 text-primary" />
                    <div>
                      <h2 className="text-2xl font-bold">Interested in Another Volunteer Opportunity?</h2>
                      <p className="mt-1 text-sm text-muted-foreground">You do not need to complete another volunteer application. Send a request here and staff will review it. Clinic specialties remain pending until required training or credential verification is complete.</p>
                    </div>
                  </div>
                  <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
                    <form action={requestOpportunity} className="space-y-4 rounded-2xl bg-slate-50 p-5">
                      <label className="block text-sm font-medium">Volunteer opportunity
                        <select name="opportunity" required defaultValue="" className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5">
                          <option value="" disabled>Select an opportunity</option>
                          {availableOpportunities.map((opportunity) => <option key={opportunity}>{opportunity}</option>)}
                        </select>
                      </label>
                      {availableOpportunities.length ? (
                        <button className="rounded-full bg-primary px-5 py-2.5 font-semibold text-white">Send Opportunity Request</button>
                      ) : (
                        <p className="text-sm text-muted-foreground">You are already participating in, or have a pending request for, every available opportunity.</p>
                      )}
                    </form>
                    <div>
                      <h3 className="font-semibold">Your requests</h3>
                      <div className="mt-3 space-y-3">
                        {data.opportunityRequests.length ? data.opportunityRequests.slice(0,8).map((request) => (
                          <div key={request.id} className="rounded-2xl border p-4">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div><p className="font-semibold">{request.opportunity}</p><p className="mt-1 text-xs text-muted-foreground">{formatDate(request.submittedAt)}</p></div>
                              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">{request.status}</span>
                            </div>
                            {request.staffNote && <p className="mt-3 text-sm text-muted-foreground">{request.staffNote}</p>}
                          </div>
                        )) : <p className="text-sm text-muted-foreground">You have not submitted any additional opportunity requests yet.</p>}
                      </div>
                    </div>
                  </div>
                </section>
              )}

            </div>
          )}
        </div>
      </section>
    </div>
  );
}
