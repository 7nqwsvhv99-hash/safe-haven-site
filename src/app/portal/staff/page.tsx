import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  AlertTriangle,
  ArrowLeft,
  Boxes,
  CalendarDays,
  ClipboardList,
  Globe2,
  Users,
  BarChart3,
  Megaphone,
  HeartHandshake,
  Activity,
  PawPrint,
  BedDouble,
  UserCheck,
  ClipboardPlus,
  FileText,
  UsersRound,
} from "lucide-react";
import { requirePortalRole, getPortalContext, getStaffPortalData, airtableCreate, airtableUpdate, TABLES } from "@/lib/portal";

function formatDate(value: string) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "America/Chicago",
  }).format(new Date(value));
}

export default async function StaffPortalPage() {
  const context = await getPortalContext();
  if (!context.canStaff) redirect(context.canOnboard ? "/portal/staff/onboarding" : "/portal");
  const data = await getStaffPortalData();

  async function addCurrentNeed(formData: FormData) {
    "use server";
    await requirePortalRole("Staff");

    const need = String(formData.get("need") || "").trim();
    const area = String(formData.get("area") || "General");
    const priority = String(formData.get("priority") || "Normal");
    const details = String(formData.get("details") || "").trim();
    const goal = String(formData.get("goal") || "").trim();
    const showToVolunteers = formData.get("showToVolunteers") === "on";
    const publishOnWebsite = formData.get("publishOnWebsite") === "on";

    if (!need) return;

    await airtableCreate(TABLES.currentNeeds, {
      Need: need,
      Area: area,
      Status: "Active",
      Priority: priority,
      Details: details,
      "Quantity / Goal": goal,
      "Show to Volunteers": showToVolunteers,
      "Publish on Website": publishOnWebsite,
    });

    revalidatePath("/portal/staff");
  }


  async function resolveFosterAlert(formData: FormData) {
    "use server";
    const current = await requirePortalRole("Staff");

    const updateId = String(formData.get("updateId") || "");
    const response = String(formData.get("response") || "").trim();
    const resolutionStatus = String(formData.get("resolutionStatus") || "In Review");

    if (!updateId) return;

    const resolved = ["Resolved", "Closed"].includes(resolutionStatus);

    await airtableUpdate(TABLES.fosterUpdates, updateId, {
      "Staff Response": response,
      "Resolution Status": resolutionStatus,
      ...(resolved
        ? {
            "Resolved By": current.displayName,
            "Resolved At": new Date().toISOString(),
          }
        : {}),
    });

    revalidatePath("/portal/staff");
    revalidatePath("/portal/foster");
  }

  async function addStaffMedicalEntry(formData: FormData) {
    "use server";
    await requirePortalRole("Staff");
    const latest = await getStaffPortalData();
    const animalId = String(formData.get("animalId") || "");
    const recordType = String(formData.get("recordType") || "Other");
    const concern = String(formData.get("concern") || "").trim();
    const treatment = String(formData.get("treatment") || "").trim();
    const needsReview = formData.get("needsReview") === "on";

    if (!latest.medical.animals.some((animal) => animal.id === animalId)) return;
    if (!concern && !treatment) return;

    await airtableCreate(TABLES.medicalRecords, {
      Animal: [animalId],
      "Date / Time": new Date().toISOString(),
      "Record Type": recordType,
      Source: "Safe Haven",
      ...(concern ? { "Reason / Complaint": concern } : {}),
      ...(treatment ? { "Treatment / Procedure": treatment } : {}),
      "Needs Veterinarian Review": needsReview,
      ...(needsReview ? { "Veterinary Review Status": "Pending Review" } : {}),
      "Entered By Role": "Shelter Staff",
    });

    revalidatePath("/portal/staff");
    revalidatePath("/portal/medical");
  }

  return (
    <div className="min-h-[calc(100vh-5rem)] bg-slate-50">
      <section className="container-custom py-10 md:py-12">
        <div className="mx-auto max-w-7xl">
          <Link href="/portal" className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline">
            <ArrowLeft className="h-4 w-4" /> Team Portal
          </Link>

          <div className="mb-10">
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-primary">Staff Portal</p>
            <h1 className="text-4xl font-bold tracking-tight md:text-5xl">Operations at a Glance</h1>
            <p className="mt-4 max-w-3xl text-muted-foreground">
              Action Required, medical care, shelter inventory, events, current needs, volunteer administration, and reporting.
            </p>
          </div>

          <section className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[
              ["Action Required", data.actionRequiredCount, AlertTriangle],
              ["Inventory Attention", data.inventoryAttentionCount, Boxes],
              ["Foster Alerts", data.fosterAlertCount, HeartHandshake],
              ["Medical Review", data.medical.pendingReviewCount, Activity],
            ].map(([label, value, Icon]) => {
              const MetricIcon = Icon as typeof AlertTriangle;
              return (
                <div key={String(label)} className="rounded-2xl border bg-white p-5 shadow-sm">
                  <MetricIcon className="mb-3 h-5 w-5 text-primary" />
                  <p className="text-3xl font-bold">{String(value)}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{String(label)}</p>
                </div>
              );
            })}
          </section>

          <section className="mb-8 grid gap-4 lg:grid-cols-2">
            <div className="rounded-3xl border bg-white p-7 shadow-sm">
              <div className="flex h-full flex-col gap-5">
                <div className="flex items-start gap-4">
                  <div className="rounded-2xl bg-primary/10 p-3 text-primary"><PawPrint className="h-6 w-6" /></div>
                  <div>
                    <h2 className="text-2xl font-bold">Animal Management</h2>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Add animals, update shelter records, and open the unified animal profile.
                    </p>
                  </div>
                </div>
                <Link href="/portal/staff/animals" className="mt-auto inline-flex w-fit items-center justify-center rounded-full bg-primary px-5 py-2.5 font-semibold text-white shadow-sm hover:opacity-90">
                  Open Animal Management
                </Link>
              </div>
            </div>

            <div className="rounded-3xl border bg-white p-7 shadow-sm">
              <div className="flex h-full flex-col gap-5">
                <div className="flex items-start gap-4">
                  <div className="rounded-2xl bg-primary/10 p-3 text-primary"><BedDouble className="h-6 w-6" /></div>
                  <div>
                    <h2 className="text-2xl font-bold">Kennel, Daily Care & Housing</h2>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Manage housing locations and capacity, move animals, record daily care, and resolve care follow-ups.
                    </p>
                  </div>
                </div>
                <Link href="/portal/staff/care" className="mt-auto inline-flex w-fit items-center justify-center rounded-full border border-primary px-5 py-2.5 font-semibold text-primary hover:bg-primary/5">
                  Open Daily Care
                </Link>
              </div>
            </div>
          </section>

          <section className="mb-8 rounded-3xl border bg-white p-7 shadow-sm">
            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div className="flex items-start gap-4">
                <div className="rounded-2xl bg-primary/10 p-3 text-primary"><UserCheck className="h-6 w-6" /></div>
                <div>
                  <h2 className="text-2xl font-bold">Adoption Management</h2>
                  <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                    Review adoption applications, document reference and veterinary checks, approve adopters, complete placements, and manage post-adoption follow-up.
                  </p>
                </div>
              </div>
              <Link href="/portal/staff/adoptions" className="inline-flex shrink-0 items-center justify-center rounded-full border border-primary px-5 py-2.5 font-semibold text-primary hover:bg-primary/5">
                Open Adoption Management
              </Link>
            </div>
          </section>

          <section className="mb-8 rounded-3xl border bg-white p-7 shadow-sm">
            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div className="flex items-start gap-4">
                <div className="rounded-2xl bg-primary/10 p-3 text-primary"><HeartHandshake className="h-6 w-6" /></div>
                <div>
                  <h2 className="text-2xl font-bold">Foster Management</h2>
                  <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                    Review foster applications, create and transfer placements, oversee check-ins, and resolve foster concerns.
                  </p>
                </div>
              </div>
              <Link href="/portal/staff/fosters" className="inline-flex shrink-0 items-center justify-center rounded-full border border-primary px-5 py-2.5 font-semibold text-primary hover:bg-primary/5">
                Open Foster Management
              </Link>
            </div>
          </section>

          <section className="mb-8 grid gap-4 lg:grid-cols-2">
            <div className="rounded-3xl border bg-white p-7 shadow-sm">
              <div className="flex h-full flex-col gap-5">
                <div className="flex items-start gap-4">
                  <div className="rounded-2xl bg-primary/10 p-3 text-primary"><ClipboardPlus className="h-6 w-6" /></div>
                  <div>
                    <h2 className="text-2xl font-bold">Intake & Owner Surrender</h2>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Review surrender requests, accept animals into care, and record direct intakes.
                    </p>
                  </div>
                </div>
                <Link href="/portal/staff/intake" className="mt-auto inline-flex w-fit items-center justify-center rounded-full border border-primary px-5 py-2.5 font-semibold text-primary hover:bg-primary/5">
                  Open Intake Management
                </Link>
              </div>
            </div>

            <div className="rounded-3xl border bg-white p-7 shadow-sm">
              <div className="flex h-full flex-col gap-5">
                <div className="flex items-start gap-4">
                  <div className="rounded-2xl bg-primary/10 p-3 text-primary"><FileText className="h-6 w-6" /></div>
                  <div>
                    <h2 className="text-2xl font-bold">Documents & Agreements</h2>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Manage contracts, surrender agreements, foster agreements, medical releases, waivers, receipts, and signed files.
                    </p>
                  </div>
                </div>
                <Link href="/portal/staff/documents" className="mt-auto inline-flex w-fit items-center justify-center rounded-full border border-primary px-5 py-2.5 font-semibold text-primary hover:bg-primary/5">
                  Open Documents
                </Link>
              </div>
            </div>
          </section>

          <section className="mb-8 rounded-3xl border bg-white p-7 shadow-sm">
            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div className="flex items-start gap-4">
                <div className="rounded-2xl bg-primary/10 p-3 text-primary"><UsersRound className="h-6 w-6" /></div>
                <div>
                  <h2 className="text-2xl font-bold">People & Contacts</h2>
                  <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                    See each person&apos;s complete Safe Haven relationship across volunteering, fostering, adoption, donations, surrender requests, newsletter subscriptions, and contact history.
                  </p>
                </div>
              </div>
              <Link href="/portal/staff/people" className="inline-flex shrink-0 items-center justify-center rounded-full border border-primary px-5 py-2.5 font-semibold text-primary hover:bg-primary/5">
                Open People & Contacts
              </Link>
            </div>
          </section>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-6">
              <section className="rounded-3xl border bg-white p-7 shadow-sm">
                <div className="mb-5 flex items-center gap-3">
                  <Activity className="h-6 w-6 text-primary" />
                  <h2 className="text-2xl font-bold">Medical Care</h2>
                </div>
                <div className="mb-6 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl bg-slate-50 p-4">
                    <p className="text-2xl font-bold">{data.medical.pendingReviewCount}</p>
                    <p className="text-sm text-muted-foreground">Awaiting medical review</p>
                  </div>
                  <Link href="/portal/medical" className="rounded-xl border p-4 text-sm font-semibold hover:bg-slate-50">
                    View complete medical history
                    <span className="mt-1 block font-normal text-muted-foreground">Open the shared Medical Portal</span>
                  </Link>
                </div>

                {data.medical.recentRecords.length > 0 && (
                  <div className="mb-6 space-y-2">
                    <h3 className="font-semibold">Recent entries</h3>
                    {data.medical.recentRecords.map((record) => (
                      <div key={record.id} className="rounded-xl bg-slate-50 p-4 text-sm">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <p className="font-semibold">{record.animal?.name || "Animal not linked"} · {record.recordType || "Medical entry"}</p>
                          {record.needsVeterinarianReview && <span className="text-xs font-semibold text-primary">{record.veterinaryReviewStatus || "Pending Review"}</span>}
                        </div>
                        {(record.reason || record.treatment) && <p className="mt-2 text-muted-foreground">{record.reason || record.treatment}</p>}
                      </div>
                    ))}
                  </div>
                )}

                <form action={addStaffMedicalEntry} className="space-y-4 border-t pt-5">
                  <h3 className="font-semibold">Record a concern or treatment</h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <select name="animalId" required defaultValue="" className="rounded-xl border bg-white px-3 py-2">
                      <option value="" disabled>Select an animal</option>
                      {data.medical.animals.filter((animal) => animal.status !== "Adopted").map((animal) => (
                        <option key={animal.id} value={animal.id}>{animal.name}{animal.animalId ? ` · ${animal.animalId}` : ""}</option>
                      ))}
                    </select>
                    <select name="recordType" defaultValue="Other" className="rounded-xl border bg-white px-3 py-2">
                      {["Medication", "Treatment", "Injury / Illness", "Weight Check", "Other"].map((type) => <option key={type}>{type}</option>)}
                    </select>
                  </div>
                  <textarea name="concern" rows={2} placeholder="Concern or observation" className="w-full rounded-xl border px-3 py-2" />
                  <textarea name="treatment" rows={2} placeholder="Treatment or care provided" className="w-full rounded-xl border px-3 py-2" />
                  <label className="flex items-center gap-2 text-sm"><input name="needsReview" type="checkbox" /> Add to veterinarian review queue</label>
                  <button type="submit" className="rounded-full bg-primary px-5 py-2.5 font-semibold text-white shadow-sm hover:opacity-90">Save Medical Entry</button>
                </form>
              </section>

              <section className="rounded-3xl border bg-white p-7 shadow-sm">
                <div className="mb-5 flex items-center gap-3">
                  <AlertTriangle className="h-6 w-6 text-primary" />
                  <h2 className="text-2xl font-bold">Action Required</h2>
                </div>

                <div className="space-y-5">
                  <div>
                    <h3 className="font-semibold">High-priority current needs</h3>
                    <div className="mt-3 space-y-2">
                      {data.needs.filter((item) => ["High", "Urgent"].includes(item.priority)).length ? (
                        data.needs
                          .filter((item) => ["High", "Urgent"].includes(item.priority))
                          .map((item) => (
                            <div key={item.id} className="rounded-xl bg-slate-50 p-4">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="font-medium">{item.need}</p>
                                  <p className="mt-1 text-sm text-muted-foreground">{item.details}</p>
                                </div>
                                <span className="text-xs font-semibold text-primary">{item.priority}</span>
                              </div>
                            </div>
                          ))
                      ) : (
                        <p className="text-sm text-muted-foreground">No high-priority needs are currently posted.</p>
                      )}
                    </div>
                  </div>

                  <div className="border-t pt-5">
                    <h3 className="font-semibold">Foster alerts</h3>
                    <div className="mt-3 space-y-3">
                      {data.fosterAlerts.length ? (
                        data.fosterAlerts.map((item) => (
                          <form key={item.id} action={resolveFosterAlert} className="rounded-xl bg-slate-50 p-4">
                            <input type="hidden" name="updateId" value={item.id} />
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div>
                                <p className="font-medium">{item.updateType || "Foster Update"}</p>
                                <p className="mt-1 text-xs text-muted-foreground">
                                  {item.submittedBy || "Foster"}{item.submittedAt ? ` · ${formatDate(item.submittedAt)}` : ""}
                                </p>
                              </div>
                              <span className="text-xs font-semibold text-primary">{item.priority}</span>
                            </div>

                            <div className="mt-3 space-y-2 text-sm">
                              {item.healthConcern && <p><span className="font-semibold">Health:</span> {item.healthConcern}</p>}
                              {item.behaviorConcern && <p><span className="font-semibold">Behavior:</span> {item.behaviorConcern}</p>}
                              {item.supplyNeed && <p><span className="font-semibold">Supply:</span> {item.supplyNeed}</p>}
                              {item.progress && <p><span className="font-semibold">Progress:</span> {item.progress}</p>}
                              {item.unableToContinue && (
                                <p className="font-semibold text-primary">Foster reports they may be unable to continue the placement.</p>
                              )}
                            </div>

                            <textarea
                              name="response"
                              defaultValue={item.staffResponse}
                              rows={2}
                              placeholder="Response to foster"
                              className="mt-4 w-full rounded-xl border bg-white px-3 py-2 text-sm"
                            />
                            <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                              <select
                                name="resolutionStatus"
                                defaultValue={item.resolutionStatus || "New"}
                                className="rounded-xl border bg-white px-3 py-2 text-sm"
                              >
                                <option>New</option>
                                <option>In Review</option>
                                <option>Waiting on Foster</option>
                                <option>Resolved</option>
                                <option>Closed</option>
                              </select>
                              <button
                                type="submit"
                                className="rounded-full border border-primary px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/5"
                              >
                                Save Foster Follow-Up
                              </button>
                            </div>
                          </form>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground">No foster concerns need staff attention right now.</p>
                      )}
                    </div>
                  </div>
                </div>
              </section>

              <section className="rounded-3xl border bg-white p-7 shadow-sm">
                <div className="mb-5 flex items-center gap-3">
                  <Boxes className="h-6 w-6 text-primary" />
                  <h2 className="text-2xl font-bold">Shelter Inventory</h2>
                </div>
                <div className="space-y-3">
                  {data.inventory
                    .filter((item) => item.area === "Shelter")
                    .slice(0, 12)
                    .map((item) => (
                      <div key={item.id} className="flex items-center justify-between gap-4 rounded-xl bg-slate-50 p-4">
                        <div>
                          <p className="font-medium">{item.name}</p>
                          <p className="text-xs text-muted-foreground">{item.category}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{item.current ?? "—"}</p>
                          <p className="text-xs text-muted-foreground">{item.status || "No status"}</p>
                        </div>
                      </div>
                    ))}
                </div>
                <Link href="/portal/staff/inventory" className="mt-5 inline-block text-sm font-semibold text-primary hover:underline">
                  Manage shelter inventory
                </Link>
              </section>

              <section className="rounded-3xl border bg-white p-7 shadow-sm">
                <div className="mb-5 flex items-center gap-3">
                  <CalendarDays className="h-6 w-6 text-primary" />
                  <h2 className="text-2xl font-bold">Upcoming Events</h2>
                </div>
                {data.upcomingEvents.length ? (
                  <div className="space-y-3">
                    {data.upcomingEvents.map((event) => (
                      <div key={event.id} className="rounded-xl bg-slate-50 p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="font-medium">{event.name}</p>
                            <p className="mt-1 text-sm text-muted-foreground">{formatDate(event.start)}{event.location ? ` · ${event.location}` : ""}</p>
                          </div>
                          <span className="text-xs font-semibold text-muted-foreground">{event.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No upcoming events are currently scheduled.</p>
                )}
                <Link href="/portal/staff/content" className="mt-5 inline-block text-sm font-semibold text-primary hover:underline">
                  Manage events & website content
                </Link>
              </section>
            </div>

            <div className="space-y-6">
              <section className="rounded-3xl border bg-white p-7 shadow-sm">
                <div className="mb-5 flex items-center gap-3">
                  <ClipboardList className="h-6 w-6 text-primary" />
                  <h2 className="text-2xl font-bold">Current Needs</h2>
                </div>

                <p className="mb-5 text-sm leading-relaxed text-muted-foreground">Post supplies, volunteer help, or other resources your team needs. Include the item or task, quantity or goal, when it is needed, and how someone can help. Choose the audience below: volunteer and website posts should contain only information safe to share publicly.</p>
                <div className="mb-5 rounded-xl bg-slate-50 p-4 text-sm leading-relaxed text-muted-foreground">
                  <p className="mb-2 font-semibold text-foreground">Example entry</p>
                  <p><strong>What is needed?</strong> Laundry help</p>
                  <p><strong>Area:</strong> Shelter · <strong>Priority:</strong> Normal</p>
                  <p><strong>Quantity or goal:</strong> 2 volunteers</p>
                  <p><strong>Details:</strong> Help wash and fold animal bedding on Thursday from 1–3 p.m. Contact the volunteer coordinator to arrange your shift.</p>
                  <p className="mt-2"><strong>Audience:</strong> Check “Show to volunteers” to share this request in the Volunteer Portal.</p>
                </div>
                {data.needs.length > 0 && (
                  <div className="mb-6 space-y-3">
                    {data.needs.slice(0, 8).map((item) => (
                      <div key={item.id} className="rounded-xl bg-slate-50 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-medium">{item.need}</p>
                            <p className="text-xs text-muted-foreground">{item.area}{item.goal ? ` · ${item.goal}` : ""}</p>
                          </div>
                          <span className="text-xs font-semibold text-primary">{item.priority}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <form action={addCurrentNeed} className="space-y-4 border-t pt-5">
                  <h3 className="font-semibold">Add a need</h3>
                  <input name="need" required placeholder="What is needed?" className="w-full rounded-xl border bg-white px-3 py-2" />
                  <div className="grid grid-cols-2 gap-3">
                    <select name="area" className="rounded-xl border bg-white px-3 py-2">
                      <option>Shelter</option>
                      <option>Clinic</option>
                      <option>Volunteer</option>
                      <option>Fundraising</option>
                      <option>General</option>
                    </select>
                    <select name="priority" className="rounded-xl border bg-white px-3 py-2">
                      <option>Normal</option>
                      <option>High</option>
                      <option>Urgent</option>
                    </select>
                  </div>
                  <input name="goal" placeholder="Quantity or goal (optional)" className="w-full rounded-xl border bg-white px-3 py-2" />
                  <textarea name="details" rows={3} placeholder="Details" className="w-full rounded-xl border bg-white px-3 py-2" />
                  <label className="flex items-center gap-2 text-sm"><input name="showToVolunteers" type="checkbox" /> Show to volunteers</label>
                  <label className="flex items-center gap-2 text-sm"><input name="publishOnWebsite" type="checkbox" /> Mark for public website</label>
                  <button className="rounded-full bg-primary px-5 py-2.5 font-semibold text-white shadow-sm hover:opacity-90" type="submit">
                    Add Current Need
                  </button>
                </form>
              </section>

              <section className="rounded-3xl border bg-white p-7 shadow-sm">
                <div className="mb-5 flex items-center gap-3">
                  <Megaphone className="h-6 w-6 text-primary" />
                  <h2 className="text-2xl font-bold">Staff Announcements</h2>
                </div>
                {data.announcements.length ? (
                  <div className="space-y-3">
                    {data.announcements.map((item) => (
                      <div key={item.id} className="rounded-xl bg-slate-50 p-4">
                        <p className="font-medium">{item.title}</p>
                        <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">{item.message}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No current staff announcements.</p>
                )}
              </section>

              <section className="rounded-3xl border bg-white p-7 shadow-sm">
                <div className="mb-5 flex items-center gap-3">
                  <Globe2 className="h-6 w-6 text-primary" />
                  <h2 className="text-2xl font-bold">Website & Content Tools</h2>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Link href="/portal/staff/content" className="rounded-xl border p-4 text-sm font-semibold hover:bg-slate-50">Manage Events & Website Content</Link>
                  <Link href="/resources" className="rounded-xl border p-4 text-sm font-semibold hover:bg-slate-50">Review Resources</Link>
                  <Link href="/volunteer" className="rounded-xl border p-4 text-sm font-semibold hover:bg-slate-50">Review Volunteer Page</Link>
                  <Link href="/clinic" className="rounded-xl border p-4 text-sm font-semibold hover:bg-slate-50">Review Clinic Page</Link>
                </div>
              </section>

              <section className="rounded-3xl border bg-white p-7 shadow-sm">
                <h2 className="text-2xl font-bold">Administration & Reporting</h2>
                <div className="mt-5 grid gap-3">
                  <Link href="/portal/staff/training" className="rounded-xl border p-4 hover:bg-slate-50"><strong>Staff Onboarding</strong><p className="mt-2 text-sm text-muted-foreground">Training materials, assigned onboarding tasks, and completion reviews.</p></Link>
                  <Link href="/portal/staff/schedule" className="rounded-xl border p-4 hover:bg-slate-50"><strong>Staff Scheduling</strong><p className="mt-2 text-sm text-muted-foreground">Shift assignments, confirmations, and coverage.</p></Link>
                  {context.canOnboard && <Link href="/portal/staff/onboarding" className="rounded-xl border p-4 hover:bg-slate-50"><div className="flex items-center gap-3"><Users className="h-5 w-5 text-primary" /><span className="font-semibold">Volunteer Onboarding</span></div><p className="mt-2 text-sm text-muted-foreground">Applications, credentials, trained roles, waivers, roster links, and volunteer portal access.</p></Link>}
                  <Link href="/portal/staff/reports" className="rounded-xl border p-4 hover:bg-slate-50">
                    <div className="flex items-center gap-3"><BarChart3 className="h-5 w-5 text-primary" /><span className="font-semibold">Reports & Dashboards</span></div>
                  </Link>
                </div>
                {context.isAdministrator && (
                  <p className="mt-5 text-sm text-muted-foreground">
                    Administrator access is active on this account, so Volunteer, Clinic Team, and Staff areas are all available.
                  </p>
                )}
              </section>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
