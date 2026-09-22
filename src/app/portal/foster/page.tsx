import Link from "next/link";
import { revalidatePath } from "next/cache";
import {
  ArrowLeft,
  CalendarDays,
  HeartHandshake,
  Megaphone,
  Phone,
  Stethoscope,
  PackageOpen,
  ClipboardPenLine,
} from "lucide-react";
import {
  requirePortalRole,
  getFosterPortalData,
  airtableUpdate,
  TABLES,
} from "@/lib/portal";

function formatDate(value: string) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "America/Chicago",
  }).format(new Date(value));
}

export default async function FosterPortalPage() {
  const context = await requirePortalRole("Foster");
  const data = await getFosterPortalData(context.email);

  async function submitUpdate(formData: FormData) {
    "use server";

    const current = await requirePortalRole("Foster");
    const latest = await getFosterPortalData(current.email);
    const placementId = String(formData.get("placementId") || "");
    const message = String(formData.get("message") || "").trim();
    const needsAttention = formData.get("needsAttention") === "on";

    const placement = latest.placements.find((item) => item.id === placementId);
    if (!placement || !message) return;

    const timestamp = new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZone: "America/Chicago",
    }).format(new Date());

    const newEntry = `[${timestamp}] ${current.displayName}: ${message}`;
    const updateNotes = placement.updateNotes
      ? `${placement.updateNotes}\n\n${newEntry}`
      : newEntry;

    const fields: Record<string, unknown> = {
      "Foster Update Notes": updateNotes,
    };

    if (needsAttention) {
      fields["Placement Status"] = "Needs Attention";
      fields["Check-In Status"] = "Needs Attention";
    }

    await airtableUpdate(TABLES.fosterPlacements, placementId, fields);
    revalidatePath("/portal/foster");
  }

  return (
    <div className="min-h-[calc(100vh-5rem)] bg-slate-50">
      <section className="container-custom py-10 md:py-12">
        <div className="mx-auto max-w-6xl">
          <Link
            href="/portal"
            className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
          >
            <ArrowLeft className="h-4 w-4" /> Team Portal
          </Link>

          <div className="mb-10">
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-primary">
              Foster Portal
            </p>
            <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
              {data.foster
                ? `Welcome, ${data.foster.name || context.displayName}`
                : "Foster Portal"}
            </h1>
            <p className="mt-4 max-w-3xl text-muted-foreground">
              Your foster placements, care information, updates, support, and resources in one place.
            </p>
          </div>

          {!data.foster ? (
            <div className="rounded-3xl border bg-white p-8 shadow-sm">
              <h2 className="text-2xl font-bold">
                We could not match this sign-in to an approved foster application.
              </h2>
              <p className="mt-3 max-w-2xl text-muted-foreground">
                Foster access is normally recognized when the email on your sign-in matches an approved Safe Haven foster application. An administrator can also grant Foster access while records are being updated.
              </p>
            </div>
          ) : (
            <div className="space-y-8">
              <section className="rounded-3xl border bg-white p-7 shadow-sm">
                <div className="mb-5 flex items-center gap-3">
                  <HeartHandshake className="h-6 w-6 text-primary" />
                  <h2 className="text-2xl font-bold">My Foster</h2>
                </div>

                {data.placements.length ? (
                  <div className="space-y-6">
                    {data.placements.map((placement) => (
                      <div key={placement.id} className="rounded-2xl bg-slate-50 p-5 md:p-6">
                        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="text-lg font-semibold">
                              {placement.animals.map((animal) => animal.name).filter(Boolean).join(", ") || "Foster Placement"}
                            </p>
                            <p className="mt-1 text-sm text-muted-foreground">
                              {placement.type || "Foster care"}
                              {placement.startDate ? ` · Started ${formatDate(placement.startDate)}` : ""}
                            </p>
                          </div>
                          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                            {placement.status || "Active"}
                          </span>
                        </div>

                        <div className="grid gap-5 md:grid-cols-2">
                          {placement.animals.map((animal) => (
                            <div key={animal.id} className="rounded-2xl border bg-white p-4">
                              <div className="flex gap-4">
                                {animal.photoUrl ? (
                                  <img
                                    src={animal.photoUrl}
                                    alt={animal.name || "Safe Haven foster animal"}
                                    className="h-24 w-24 shrink-0 rounded-xl object-cover"
                                  />
                                ) : (
                                  <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-xl bg-primary/5 text-2xl">
                                    🐾
                                  </div>
                                )}
                                <div>
                                  <h3 className="text-lg font-bold">{animal.name || "Foster animal"}</h3>
                                  <p className="mt-1 text-sm text-muted-foreground">
                                    {[animal.age, animal.breed, animal.species].filter(Boolean).join(" · ")}
                                  </p>
                                  {animal.adoptionStatus && (
                                    <p className="mt-2 text-xs font-semibold text-primary">{animal.adoptionStatus}</p>
                                  )}
                                </div>
                              </div>
                              {animal.medicalSummary && (
                                <div className="mt-4 border-t pt-4">
                                  <p className="text-sm font-semibold">Medical summary</p>
                                  <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">
                                    {animal.medicalSummary}
                                  </p>
                                </div>
                              )}
                            </div>
                          ))}

                          <div className="rounded-2xl border bg-white p-4">
                            <div className="flex items-center gap-2">
                              <CalendarDays className="h-5 w-5 text-primary" />
                              <h3 className="font-semibold">Dates & Check-Ins</h3>
                            </div>
                            <dl className="mt-4 space-y-3 text-sm">
                              {placement.nextCheckInDate && (
                                <div>
                                  <dt className="text-muted-foreground">Next Safe Haven check-in</dt>
                                  <dd className="font-medium">{formatDate(placement.nextCheckInDate)}</dd>
                                </div>
                              )}
                              {placement.expectedEndDate && (
                                <div>
                                  <dt className="text-muted-foreground">Expected placement end</dt>
                                  <dd className="font-medium">{formatDate(placement.expectedEndDate)}</dd>
                                </div>
                              )}
                              {placement.checkInStatus && (
                                <div>
                                  <dt className="text-muted-foreground">Check-in status</dt>
                                  <dd className="font-medium">{placement.checkInStatus}</dd>
                                </div>
                              )}
                            </dl>
                          </div>

                          <div className="rounded-2xl border bg-white p-4 md:col-span-2">
                            <div className="flex items-center gap-2">
                              <Stethoscope className="h-5 w-5 text-primary" />
                              <h3 className="font-semibold">Care Instructions</h3>
                            </div>
                            <p className="mt-3 whitespace-pre-line text-sm text-muted-foreground">
                              {placement.careInstructions || "No placement-specific care instructions have been added yet."}
                            </p>
                          </div>
                        </div>

                        <form action={submitUpdate} className="mt-5 rounded-2xl border bg-white p-5">
                          <input type="hidden" name="placementId" value={placement.id} />
                          <div className="flex items-center gap-2">
                            <ClipboardPenLine className="h-5 w-5 text-primary" />
                            <h3 className="font-semibold">Send Safe Haven an Update</h3>
                          </div>
                          <p className="mt-2 text-sm text-muted-foreground">
                            Share progress, appetite, behavior, medication updates, supply needs, or anything else the Safe Haven team should know.
                          </p>
                          <textarea
                            required
                            name="message"
                            rows={4}
                            className="mt-4 w-full rounded-xl border bg-white px-3 py-2"
                            placeholder="How is your foster doing?"
                          />
                          <label className="mt-3 flex items-start gap-2 text-sm">
                            <input className="mt-1" type="checkbox" name="needsAttention" />
                            <span>
                              This needs staff attention. Use this for a health or behavior concern, urgent supply need, inability to continue the placement, or another unresolved issue.
                            </span>
                          </label>
                          <button
                            type="submit"
                            className="mt-4 rounded-full bg-primary px-5 py-2.5 font-semibold text-white shadow-sm hover:opacity-90"
                          >
                            Send Update
                          </button>
                        </form>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl bg-slate-50 p-5">
                    <p className="font-semibold">You do not have an active foster placement right now.</p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Your Foster Portal will remain available for resources and support between placements.
                    </p>
                  </div>
                )}
              </section>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <section className="rounded-3xl border bg-white p-7 shadow-sm">
                  <div className="mb-5 flex items-center gap-3">
                    <Megaphone className="h-6 w-6 text-primary" />
                    <h2 className="text-2xl font-bold">Foster Resources</h2>
                  </div>
                  {data.resources.length ? (
                    <div className="space-y-4">
                      {data.resources.map((resource) => (
                        <div key={resource.id} className="rounded-2xl bg-slate-50 p-4">
                          <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                            {resource.category}
                          </p>
                          <h3 className="mt-1 font-semibold">{resource.title}</h3>
                          <p className="mt-2 text-sm text-muted-foreground">{resource.description}</p>
                          {resource.linkUrl && (
                            <a
                              href={resource.linkUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-3 inline-block text-sm font-semibold text-primary hover:underline"
                            >
                              {resource.linkLabel || "Open resource"}
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">Foster resources are being added.</p>
                  )}
                </section>

                <section className="rounded-3xl border bg-white p-7 shadow-sm">
                  <div className="mb-5 flex items-center gap-3">
                    <Phone className="h-6 w-6 text-primary" />
                    <h2 className="text-2xl font-bold">Help & Contact</h2>
                  </div>
                  <div className="space-y-5 text-sm">
                    <div>
                      <p className="font-semibold">Safe Haven Humane Society</p>
                      <p className="mt-1 text-muted-foreground">
                        For routine questions, placement support, supplies, and coordination.
                      </p>
                      <div className="mt-3 flex flex-wrap gap-3">
                        <a href="tel:815-858-2265" className="font-semibold text-primary hover:underline">
                          (815) 858-2265
                        </a>
                        <a href="mailto:safehaven1471@gmail.com" className="font-semibold text-primary hover:underline">
                          safehaven1471@gmail.com
                        </a>
                      </div>
                    </div>

                    <div className="border-t pt-5">
                      <div className="flex items-center gap-2">
                        <PackageOpen className="h-5 w-5 text-primary" />
                        <p className="font-semibold">Supplies</p>
                      </div>
                      <p className="mt-2 text-muted-foreground">
                        Safe Haven provides the food, beds, blankets, medicine, toys, crates, and other supplies needed for foster placements. Contact the team when you need a refill or replacement.
                      </p>
                    </div>

                    <div className="border-t pt-5">
                      <p className="font-semibold">After-hours questions</p>
                      <p className="mt-2 text-muted-foreground">
                        Use the after-hours contact information provided when your foster placement began. Safe Haven will direct you to the appropriate emergency veterinary clinic when needed.
                      </p>
                    </div>

                    <div className="border-t pt-5">
                      <p className="font-semibold">Veterinary care</p>
                      <p className="mt-2 text-muted-foreground">
                        Veterinary care for Safe Haven foster animals is coordinated and covered by Safe Haven. Contact the Safe Haven team before arranging non-emergency veterinary care.
                      </p>
                    </div>
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
