import Link from "next/link";
import { revalidatePath } from "next/cache";
import { ArrowLeft, CalendarCheck, ClipboardCheck, Boxes, Megaphone } from "lucide-react";
import { requirePortalRole, getClinicPortalData, airtableUpdate, TABLES } from "@/lib/portal";

function formatDate(value: string) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "America/Chicago",
  }).format(new Date(value));
}

export default async function ClinicPortalPage() {
  const context = await requirePortalRole("Clinic Team");
  const data = await getClinicPortalData(context.email);

  async function saveAvailability(formData: FormData) {
    "use server";
    const current = await requirePortalRole("Clinic Team");
    const latest = await getClinicPortalData(current.email);
    const responseId = String(formData.get("responseId") || "");
    const value = String(formData.get("availability") || "");
    const requestedAssignment = String(formData.get("assignment") || "");
    if (!responseId || !["Yes", "No"].includes(value) || !latest.dates.some((item) => item.responseId === responseId)) return;

    let assignment = "";
    if (value === "Yes") {
      if (latest.member?.role === "Veterinarian") assignment = "Veterinarian";
      else if (["Vet Tech", "Veterinary Technician"].includes(latest.member?.role || "")) assignment = "Veterinary Technician";
      else {
        const allowed = new Set<string>();
        latest.member?.skills.forEach((skill) => {
          if (["Front Room System", "Back Room System", "Autoclave"].includes(skill)) allowed.add(skill);
          if (skill === "General Support") {
            allowed.add("Front Room Support");
            allowed.add("Surgery/Recovery Floater");
          }
        });
        if (!allowed.has(requestedAssignment)) return;
        assignment = requestedAssignment;
      }
    }

    await airtableUpdate(TABLES.clinicResponses, responseId, {
      "Initial Response": value,
      "Initial Response Date": new Date().toISOString(),
      "Final Attendance Plan": value === "Yes" ? "Attending" : "Not Attending",
      "Clinic Assignment": assignment || null,
    });
    revalidatePath("/portal/clinic");
  }

  async function saveReconfirmation(formData: FormData) {
    "use server";
    await requirePortalRole("Clinic Team");
    const responseId = String(formData.get("responseId") || "");
    const value = String(formData.get("reconfirmation") || "");
    if (!responseId || !["Yes, still attending", "No, can no longer attend"].includes(value)) return;

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

          {!data.member ? (
            <div className="rounded-3xl border bg-white p-8 shadow-sm">
              <h2 className="text-2xl font-bold">We could not match this sign-in to an active clinic team record.</h2>
              <p className="mt-3 text-muted-foreground">
                The email on your Clerk account needs to match the email on your active Clinic Team Members record.
              </p>
            </div>
          ) : (
            <div className="space-y-8">
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
                            <form action={saveAvailability} className="rounded-xl border bg-white p-4">
                              <input type="hidden" name="responseId" value={item.responseId} />
                              <p className="mb-2 text-sm font-semibold">My availability</p>
                              {data.member.role === "Clinic Volunteer" && (
                                <select name="assignment" defaultValue={item.assignment} className="mb-3 w-full rounded-lg border bg-white px-3 py-2 text-sm" required>
                                  <option value="" disabled>Select your clinic role</option>
                                  {data.member.skills.includes("Front Room System") && <option>Front Room System</option>}
                                  {data.member.skills.includes("Back Room System") && <option>Back Room System</option>}
                                  {data.member.skills.includes("Autoclave") && <option>Autoclave</option>}
                                  {data.member.skills.includes("General Support") && <option>Front Room Support</option>}
                                  {data.member.skills.includes("General Support") && <option>Surgery/Recovery Floater</option>}
                                </select>
                              )}
                              <div className="flex gap-2">
                                <button name="availability" value="Yes" className="rounded-full border px-3 py-1.5 text-sm font-medium hover:bg-primary/5">Yes</button>
                                <button name="availability" value="No" className="rounded-full border px-3 py-1.5 text-sm font-medium hover:bg-primary/5">No</button>
                              </div>
                              <p className="mt-2 text-xs text-muted-foreground">Current: {item.initialResponse || "No response"}</p>
                            </form>

                            <form action={saveReconfirmation} className="rounded-xl border bg-white p-4">
                              <input type="hidden" name="responseId" value={item.responseId} />
                              <p className="mb-2 text-sm font-semibold">Reconfirm attendance</p>
                              <div className="flex flex-wrap gap-2">
                                <button name="reconfirmation" value="Yes, still attending" className="rounded-full border px-3 py-1.5 text-sm font-medium hover:bg-primary/5">Still attending</button>
                                <button name="reconfirmation" value="No, can no longer attend" className="rounded-full border px-3 py-1.5 text-sm font-medium hover:bg-primary/5">Can’t attend</button>
                              </div>
                              <p className="mt-2 text-xs text-muted-foreground">Current: {item.reconfirmation || "Awaiting response"}</p>
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
                          <div className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
                            <div><span className="block text-xs text-muted-foreground">Veterinarian</span><strong>{date.veterinarianNames.length ? date.veterinarianNames.join(", ") : "Unfilled"}</strong></div>
                            <div><span className="block text-xs text-muted-foreground">Vet Tech</span><strong>{date.vetTechNames.length ? date.vetTechNames.join(", ") : "Unfilled"}</strong></div>
                            <div><span className="block text-xs text-muted-foreground">Volunteers</span><strong>{date.volunteers ?? 0}{date.volunteerTarget ? ` / ${date.volunteerTarget}` : ""}</strong></div>
                            {(["Front Room System", "Back Room System", "Autoclave", "Front Room Support"] as const).map((role) => (
                              <div key={role}><span className="block text-xs text-muted-foreground">{role}</span><strong>{date.volunteerAssignments[role]?.join(", ") || "Unfilled"}</strong></div>
                            ))}
                            <div><span className="block text-xs text-muted-foreground">Surgery/Recovery Floaters</span><strong>{date.volunteerAssignments["Surgery/Recovery Floater"]?.length || 0} / 2</strong></div>
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
