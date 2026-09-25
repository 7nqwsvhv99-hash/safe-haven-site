import Link from "next/link";
import { revalidatePath } from "next/cache";
import { ArrowLeft, CalendarCheck, CalendarPlus, ClipboardCheck, Boxes, Megaphone } from "lucide-react";
import { requirePortalRole, getClinicPortalData, airtableCreate, airtableUpdate, TABLES } from "@/lib/portal";


function formatDate(value: string) {
  if (!value) return "";
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
  const date = new Date(dateOnly ? `${value}T12:00:00` : value);
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "America/Chicago",
  }).format(date);
}

export default async function ClinicPortalPage() {
  const context = await requirePortalRole("Clinic Team");
  const data = await getClinicPortalData(context.email);

  async function submitVeterinarianPreference(formData: FormData) {
    "use server";
    const current = await requirePortalRole("Clinic Team", "write");
    const latest = await getClinicPortalData(current.email);
    if (!latest.member || latest.member.role !== "Veterinarian") return;

    const preferredDate = String(formData.get("preferredDate") || "").trim();
    const preferredClinicType = String(formData.get("preferredClinicType") || "Full Day");
    const notes = String(formData.get("notes") || "").trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(preferredDate) || !["Full Day", "Half Day"].includes(preferredClinicType)) return;

    const date = new Date(`${preferredDate}T12:00:00`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (Number.isNaN(date.getTime()) || date < today || ![3, 6].includes(date.getDay())) return;

    const duplicate = latest.vetPreferences.some(
      (item) => item.preferredDate === preferredDate && item.status !== "Withdrawn"
    );
    if (duplicate) return;

    await airtableCreate(TABLES.vetClinicPreferences, {
      Veterinarian: [latest.member.id],
      "Preferred Clinic Date": preferredDate,
      "Preferred Clinic Type": preferredClinicType,
      "Preference Status": "Submitted",
      Notes: notes,
      "Submitted At": new Date().toISOString(),
    });

    revalidatePath("/portal/clinic");
  }

  async function saveAvailability(formData: FormData) {
    "use server";
    const current = await requirePortalRole("Clinic Team", "write");
    const latest = await getClinicPortalData(current.email);
    const responseId = String(formData.get("responseId") || "");
    const value = String(formData.get("availability") || "");
    if (!responseId || !["Yes", "No"].includes(value) || !latest.dates.some((item) => item.responseId === responseId)) return;

    let assignment = "";
    if (value === "Yes") {
      if (latest.member?.role === "Veterinarian") assignment = "Veterinarian";
      else if (["Vet Tech", "Veterinary Technician"].includes(latest.member?.role || "")) assignment = "Veterinary Technician";
    }

    const matchedResponse = latest.dates.find((item) => item.responseId === responseId);
    await airtableUpdate(TABLES.clinicResponses, responseId, {
      "Availability Clinic Date": matchedResponse!.clinic!.date.slice(0, 10),
      "One-Week Reconfirmation": "Awaiting Response",
      "Reconfirmation Date": null,
      "Initial Response": value,
      "Initial Response Date": new Date().toISOString(),
      "Final Attendance Plan": value === "Yes" ? "Attending" : "Not Attending",
      ...(assignment ? { "Clinic Assignment": assignment } : {}),
      ...(value === "No" && latest.member?.role === "Clinic Volunteer" ? { "Clinic Assignment": null, "Clinic Assignments": [] } : {}),
    });

    revalidatePath("/portal/clinic");
  }

  async function saveClinicAssignments(formData: FormData) {
    "use server";
    const current = await requirePortalRole("Clinic Team", "write");
    const latest = await getClinicPortalData(current.email);
    if (!latest.member || latest.member.role !== "Clinic Volunteer") return;

    const responseId = String(formData.get("responseId") || "");
    const matched = latest.dates.find((item) => item.responseId === responseId);
    if (!matched || matched.initialResponse !== "Yes") return;

    const allowed = new Set<string>();
    latest.member.skills.forEach((skill) => {
      if (["Front Room System", "Back Room System", "Autoclave"].includes(skill)) allowed.add(skill);
      if (skill === "General Support") allowed.add("General Volunteer");
    });

    const assignments = formData.getAll("assignments").map(String).filter((value) => allowed.has(value));
    if (!assignments.length) return;

    const legacyAssignment = assignments[0] === "General Volunteer" ? "Front Room Support" : assignments[0];
    await airtableUpdate(TABLES.clinicResponses, responseId, {
      "Clinic Assignments": assignments,
      "Clinic Assignment": legacyAssignment,
    });

    revalidatePath("/portal/clinic");
  }

  async function saveReconfirmation(formData: FormData) {
    "use server";
    const current = await requirePortalRole("Clinic Team", "write");
    const latest = await getClinicPortalData(current.email);
    const responseId = String(formData.get("responseId") || "");
    const value = String(formData.get("reconfirmation") || "");
    if (
      !responseId ||
      !["Yes, still attending", "No, can no longer attend"].includes(value) ||
      !latest.dates.some((item) => item.responseId === responseId)
    ) return;

    const matched = latest.dates.find((item) => item.responseId === responseId);
    if (!matched?.clinic || matched.initialResponse !== "Yes" || (matched.responseClinicDate && matched.responseClinicDate !== matched.clinic.date.slice(0, 10))) return;
    await airtableUpdate(TABLES.clinicResponses, responseId, {
      "One-Week Reconfirmation": value,
      "Reconfirmation Date": new Date().toISOString(),
      "Final Attendance Plan": value === "Yes, still attending" ? "Attending" : "Not Attending",
    });
    revalidatePath("/portal/clinic");
  }

  return (
    <div className="min-h-[calc(100vh-5rem)] bg-slate-50">
      <section className="container-custom py-10 md:py-12">
        <div className="mx-auto max-w-6xl">
          <Link href="/portal" className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline">
            <ArrowLeft className="h-4 w-4" /> Team Portal
          </Link>

          <div className="mb-10">
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-primary">Clinic Team Portal</p>
            <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
              {data.member ? `Welcome, ${data.member.name || context.displayName}` : "Clinic Team Portal"}
            </h1>
            <p className="mt-4 max-w-3xl text-muted-foreground">
              Your clinic dates, availability, attendance confirmations, team staffing, inventory, and clinic resources.
            </p>
          </div>

          {!data.member && !context.isBoard ? (
            <div className="rounded-3xl border bg-white p-8 shadow-sm">
              <h2 className="text-2xl font-bold">We could not match this sign-in to an active clinic team record.</h2>
              <p className="mt-3 text-muted-foreground">
                The email on your Clerk account needs to match the email on your active Clinic Team Members record.
              </p>
            </div>
          ) : (
            <div className="space-y-8">
              {context.isBoard && !data.member && <div className="rounded-2xl border border-primary/15 bg-primary/5 p-5 text-sm"><strong>Board View:</strong> This account is not linked to a clinic-team profile. Team staffing, inventory, announcements, and the clinic interface are available below. Personalized availability and attendance responses appear only for clinic-team members.</div>}
              {data.member?.role === "Veterinarian" && (
                <section className="rounded-3xl border bg-white p-7 shadow-sm">
                  <div className="mb-5 flex items-center gap-3">
                    <CalendarPlus className="h-6 w-6 text-primary" />
                    <h2 className="text-2xl font-bold">Choose Clinic Dates</h2>
                  </div>
                  <p className="max-w-3xl text-sm text-muted-foreground">
                    Add the Wednesday or Saturday dates you are available to serve as the veterinarian. Submit dates as far ahead as your schedule allows. Once a date is submitted, the Vet Tech signup round begins.
                  </p>

                  <form action={submitVeterinarianPreference} className="mt-5 grid gap-4 rounded-2xl bg-slate-50 p-5 md:grid-cols-[220px_180px_1fr_auto] md:items-end">
                    <label className="text-sm font-medium">
                      Preferred clinic date
                      <input
                        type="date"
                        name="preferredDate"
                        required
                        className="mt-1 w-full rounded-xl border bg-white px-3 py-2"
                      />
                    </label>
                    <label className="text-sm font-medium">
                      Clinic type
                      <select
                        name="preferredClinicType"
                        required
                        defaultValue="Full Day"
                        className="mt-1 w-full rounded-xl border bg-white px-3 py-2"
                      >
                        <option>Full Day</option>
                        <option>Half Day</option>
                      </select>
                    </label>
                    <label className="text-sm font-medium">
                      Notes <span className="font-normal text-muted-foreground">(optional)</span>
                      <input
                        type="text"
                        name="notes"
                        placeholder="Anything the clinic team should know"
                        className="mt-1 w-full rounded-xl border bg-white px-3 py-2"
                      />
                    </label>
                    <button type="submit" className="rounded-full bg-primary px-5 py-2.5 font-semibold text-white shadow-sm hover:opacity-90">
                      Add Date
                    </button>
                  </form>

                  {data.vetPreferences.length > 0 && (
                    <div className="mt-5">
                      <h3 className="text-sm font-semibold">My submitted dates</h3>
                      <div className="mt-3 grid gap-3 md:grid-cols-2">
                        {data.vetPreferences.map((preference) => (
                          <div key={preference.id} className="rounded-2xl border bg-white p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="font-semibold">{formatDate(preference.preferredDate)}</p>
                                <p className="mt-1 text-sm text-muted-foreground">{preference.clinicType || "Full Day"}</p>
                                {preference.notes && <p className="mt-1 text-sm text-muted-foreground">{preference.notes}</p>}
                              </div>
                              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                                {preference.status}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </section>
              )}

              <section className="rounded-3xl border bg-white p-7 shadow-sm">
                <div className="mb-5 flex items-center gap-3">
                  <CalendarCheck className="h-6 w-6 text-primary" />
                  <h2 className="text-2xl font-bold">My Clinic Dates</h2>
                </div>
                {data.dates.length ? (
                  <div className="space-y-4">
                    {data.dates.map((item) => (
                      <div key={item.responseId} className="rounded-2xl bg-slate-50 p-5">
                        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
                          <div>
                            <p className="text-lg font-semibold">{formatDate(item.clinic?.date || "")}</p>
                            <p className="mt-1 text-sm text-muted-foreground">
                              {item.clinic?.type || "Clinic"} · {item.clinic?.stage || "Scheduling"}
                            </p>
                            {item.clinic?.alert && <p className="mt-2 text-sm font-medium text-primary">{item.clinic.alert}</p>}
                          </div>
                          <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[520px]">
                            <div className="rounded-xl border bg-white p-4">
                              <form action={saveAvailability}>
                                <input type="hidden" name="responseId" value={item.responseId} />
                                <p className="mb-2 text-sm font-semibold">My availability</p>
                                <div className="flex gap-2">
                                  <button name="availability" value="Yes" className="rounded-full border px-3 py-1.5 text-sm font-medium hover:bg-primary/5">Yes</button>
                                  <button name="availability" value="No" className="rounded-full border px-3 py-1.5 text-sm font-medium hover:bg-primary/5">No</button>
                                </div>
                                <p className={`mt-2 text-xs ${item.initialResponse && item.initialResponse !== "No Response" ? "font-semibold text-green-700" : "text-muted-foreground"}`}>
                                  Current: {item.responseClinicDate && item.responseClinicDate !== item.clinic?.date.slice(0, 10) ? "Date changed. Please respond again." : item.initialResponse || "No response"}
                                </p>
                              </form>

                              {data.member?.role === "Clinic Volunteer" && item.initialResponse === "Yes" && (
                                <form action={saveClinicAssignments} className="mt-4 border-t pt-4">
                                  <input type="hidden" name="responseId" value={item.responseId} />
                                  <p className="mb-2 text-sm font-semibold">Select your clinic role</p>
                                  <div className="space-y-2 text-sm">
                                    {data.member.skills.includes("Front Room System") && <label className="flex items-center gap-2"><input type="checkbox" name="assignments" value="Front Room System" defaultChecked={item.assignments.includes("Front Room System")} /> Front Room System</label>}
                                    {data.member.skills.includes("Back Room System") && <label className="flex items-center gap-2"><input type="checkbox" name="assignments" value="Back Room System" defaultChecked={item.assignments.includes("Back Room System")} /> Back Room System</label>}
                                    {data.member.skills.includes("Autoclave") && <label className="flex items-center gap-2"><input type="checkbox" name="assignments" value="Autoclave" defaultChecked={item.assignments.includes("Autoclave")} /> Autoclave</label>}
                                    {data.member.skills.includes("General Support") && <label className="flex items-center gap-2"><input type="checkbox" name="assignments" value="General Volunteer" defaultChecked={item.assignments.includes("General Volunteer")} /> General Volunteer</label>}
                                  </div>
                                  <button type="submit" className="mt-3 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white">Save role</button>
                                  {item.assignments.length > 0 && <p className="mt-2 text-xs font-semibold text-green-700">Current role: {item.assignments.join(", ")}</p>}
                                </form>
                              )}
                            </div>

                            <form action={saveReconfirmation} className="rounded-xl border bg-white p-4">
                              <fieldset disabled={item.initialResponse !== "Yes" || Boolean(item.responseClinicDate && item.responseClinicDate !== item.clinic?.date.slice(0, 10))} className="disabled:opacity-50">
                              <input type="hidden" name="responseId" value={item.responseId} />
                              <p className="mb-2 text-sm font-semibold">Reconfirm attendance</p>
                              <div className="flex flex-wrap gap-2">
                                <button name="reconfirmation" value="Yes, still attending" className="rounded-full border px-3 py-1.5 text-sm font-medium hover:bg-primary/5">Still attending</button>
                                <button name="reconfirmation" value="No, can no longer attend" className="rounded-full border px-3 py-1.5 text-sm font-medium hover:bg-primary/5">Can’t attend</button>
                              </div>
                              <p className="mt-2 text-xs text-muted-foreground">Current: {item.reconfirmation || "Awaiting response"}</p>
                              </fieldset>
                            </form>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No upcoming clinic dates are currently assigned to you.</p>
                )}
              </section>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <section className="rounded-3xl border bg-white p-7 shadow-sm">
                  <div className="mb-5 flex items-center gap-3">
                    <ClipboardCheck className="h-6 w-6 text-primary" />
                    <h2 className="text-2xl font-bold">Team Staffing Calendar</h2>
                  </div>
                  {data.teamDates.length ? (
                    <div className="space-y-3">
                      {data.teamDates.map((date) => (
                        <div key={date.id} className="rounded-2xl bg-slate-50 p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className="font-semibold">{formatDate(date.date)}</p>
                              <p className="text-sm text-muted-foreground">{date.type || "Clinic"} · {date.stage || "Scheduling"}</p>
                            </div>
                            {date.alert && <span className="text-xs font-semibold text-primary">{date.alert}</span>}
                          </div>
                          <div className="mt-3 grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
                            <div><span className="block text-xs text-muted-foreground">Veterinarian</span><strong>{date.veterinarianNames.length ? date.veterinarianNames.join(", ") : "Unfilled"}</strong></div>
                            <div><span className="block text-xs text-muted-foreground">Vet Tech</span><strong>{date.vetTechNames.length ? date.vetTechNames.join(", ") : "Unfilled"}</strong></div>
                            <div className="hidden sm:block" aria-hidden="true" />
                            {(["Front Room System", "Back Room System", "Autoclave"] as const).map((role) => (
                              <div key={role}><span className="block whitespace-nowrap text-xs text-muted-foreground">{role}</span><strong>{date.volunteerAssignments[role]?.join(", ") || "Unfilled"}</strong></div>
                            ))}
                            <div className="sm:col-span-3"><span className="block text-xs text-muted-foreground">General Volunteers</span><strong>{[
                              ...(date.volunteerAssignments["Front Room Support"] || []),
                              ...(date.volunteerAssignments["Surgery/Recovery Floater"] || []),
                              ...(date.volunteerAssignments["General Volunteer"] || []),
                            ].join(", ") || "None confirmed"}</strong></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No upcoming clinic dates are currently posted.</p>
                  )}
                </section>

                <section className="rounded-3xl border bg-white p-7 shadow-sm">
                  <div className="mb-5 flex items-center gap-3">
                    <Boxes className="h-6 w-6 text-primary" />
                    <h2 className="text-2xl font-bold">Clinic Inventory</h2>
                  </div>
                  {data.inventory.length ? (
                    <div className="space-y-3">
                      {data.inventory.map((item) => (
                        <div key={item.id} className="flex items-center justify-between gap-4 rounded-2xl bg-slate-50 p-4">
                          <div>
                            <p className="font-semibold">{item.name}</p>
                            <p className="text-xs text-muted-foreground">{item.category}{item.unit ? ` · ${item.unit}` : ""}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">{item.current ?? "—"}</p>
                            <p className="text-xs text-muted-foreground">{item.status || "No status"}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No active clinic inventory items are available yet.</p>
                  )}
                </section>
              </div>

              <section className="rounded-3xl border bg-white p-7 shadow-sm">
                <div className="mb-5 flex items-center gap-3">
                  <Megaphone className="h-6 w-6 text-primary" />
                  <h2 className="text-2xl font-bold">Clinic Announcements & Resources</h2>
                </div>
                {data.announcements.length ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    {data.announcements.map((item) => (
                      <div key={item.id} className="rounded-2xl bg-slate-50 p-4">
                        <h3 className="font-semibold">{item.title}</h3>
                        <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">{item.message}</p>
                        {item.ctaUrl && (
                          <a href={item.ctaUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-sm font-semibold text-primary hover:underline">
                            {item.ctaLabel || "Open resource"}
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No current clinic announcements.</p>
                )}
              </section>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
