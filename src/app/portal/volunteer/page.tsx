import Link from "next/link";
import { revalidatePath } from "next/cache";
import { CalendarDays, Clock3, Megaphone, Wrench, ArrowLeft } from "lucide-react";
import { requirePortalRole, getVolunteerPortalData, airtableCreate, TABLES } from "@/lib/portal";

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

export default async function VolunteerPortalPage() {
  const context = await requirePortalRole("Volunteer");
  const data = await getVolunteerPortalData(context.email);

  async function logHours(formData: FormData) {
    "use server";
    const current = await requirePortalRole("Volunteer");
    const latest = await getVolunteerPortalData(current.email);
    if (!latest.volunteer) return;

    const date = String(formData.get("date") || "");
    const hours = Number(formData.get("hours") || 0);
    const activity = String(formData.get("activity") || "");
    const notes = String(formData.get("notes") || "");

    if (!date || !Number.isFinite(hours) || hours <= 0 || !activity) return;

    await airtableCreate(TABLES.volunteerHours, {
      Date: date,
      Volunteer: [latest.volunteer.id],
      Hours: hours,
      "Volunteer Activity": activity,
      Notes: notes,
    });

    revalidatePath("/portal/volunteer");
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
              Your schedule, service hours, announcements, current needs, and volunteer resources in one place.
            </p>
          </div>

          {!data.volunteer ? (
            <div className="rounded-3xl border bg-white p-8 shadow-sm">
              <h2 className="text-2xl font-bold">We could not match this sign-in to an active volunteer record.</h2>
              <p className="mt-3 text-muted-foreground">
                The email on your Clerk account needs to match the email on your active Safe Haven volunteer record.
              </p>
            </div>
          ) : (
            <div className="space-y-8">
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
                    <label className="block text-sm font-medium">
                      Notes
                      <textarea name="notes" rows={3} className="mt-2 w-full rounded-xl border bg-white px-3 py-2" />
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

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <section className="rounded-3xl border bg-white p-7 shadow-sm">
                  <div className="mb-5 flex items-center gap-3">
                    <Megaphone className="h-6 w-6 text-primary" />
                    <h2 className="text-2xl font-bold">Announcements & Resources</h2>
                  </div>
                  {data.announcements.length ? (
                    <div className="space-y-4">
                      {data.announcements.map((item) => (
                        <div key={item.id} className="rounded-2xl bg-slate-50 p-4">
                          <div className="flex items-center justify-between gap-3">
                            <h3 className="font-semibold">{item.title}</h3>
                            {item.priority !== "Normal" && (
                              <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">{item.priority}</span>
                            )}
                          </div>
                          <p className="mt-2 text-sm text-muted-foreground whitespace-pre-line">{item.message}</p>
                          {item.ctaUrl && (
                            <a href={item.ctaUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-sm font-semibold text-primary hover:underline">
                              {item.ctaLabel || "Open resource"}
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No current volunteer announcements.</p>
                  )}
                </section>

                <section className="rounded-3xl border bg-white p-7 shadow-sm">
                  <div className="mb-5 flex items-center gap-3">
                    <Wrench className="h-6 w-6 text-primary" />
                    <h2 className="text-2xl font-bold">Current Needs & Tools</h2>
                  </div>
                  {data.needs.length ? (
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
                  ) : (
                    <p className="text-muted-foreground">There are no volunteer needs posted right now.</p>
                  )}
                  <div className="mt-6 flex flex-wrap gap-3">
                    <a href="https://www.calendarwiz.com/calendars/calendar.php?crd=safehavenil&nolog=0&cid[]=all" target="_blank" rel="noopener noreferrer" className="rounded-full border px-4 py-2 text-sm font-semibold hover:bg-slate-50">
                      Volunteer Calendar
                    </a>
                    <Link href="/volunteer" className="rounded-full border px-4 py-2 text-sm font-semibold hover:bg-slate-50">
                      Volunteer Resources
                    </Link>
                  </div>
                </section>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
