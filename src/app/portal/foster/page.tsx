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
  airtableCreate,
  airtableUploadAttachment,
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
    const placement = latest.placements.find((item) => item.id === placementId);
    if (!placement) return;

    const updateType = String(formData.get("updateType") || "Routine Check-In");
    const generalProgress = String(formData.get("generalProgress") || "").trim();
    const appetite = String(formData.get("appetite") || "").trim();
    const behavior = String(formData.get("behavior") || "").trim();
    const medication = String(formData.get("medication") || "").trim();
    const supplyNeed = String(formData.get("supplyNeed") || "").trim();
    const healthConcern = String(formData.get("healthConcern") || "").trim();
    const behaviorConcern = String(formData.get("behaviorConcern") || "").trim();
    const unableToContinue = formData.get("unableToContinue") === "on";
    const needsAttention = formData.get("needsAttention") === "on";
    const priority = String(formData.get("priority") || "Normal");
    const photos = formData
      .getAll("photos")
      .filter((item): item is File => item instanceof File && item.size > 0)
      .slice(0, 4);
    const invalidPhoto = photos.some(
      (photo) => !photo.type.startsWith("image/") || photo.size > 5 * 1024 * 1024
    );
    if (invalidPhoto) return;

    if (
      !generalProgress &&
      !behavior &&
      !medication &&
      !supplyNeed &&
      !healthConcern &&
      !behaviorConcern &&
      !unableToContinue &&
      photos.length === 0
    ) {
      return;
    }

    const submittedAt = new Date().toISOString();
    const attentionRequired =
      needsAttention ||
      unableToContinue ||
      Boolean(healthConcern) ||
      Boolean(behaviorConcern) ||
      ["High", "Urgent"].includes(priority);

    const createdUpdate = await airtableCreate(TABLES.fosterUpdates, {
      "Update ID": `FU-${Date.now()}`,
      "Foster Placement": [placementId],
      Animal: placement.animals.map((animal) => animal.id),
      "Submitted By": current.email,
      "Submitted At": submittedAt,
      "Update Type": updateType,
      "General Progress": generalProgress,
      "Appetite / Eating": appetite || "Not Applicable",
      Behavior: behavior,
      "Medication / Treatment Update": medication,
      "Supply Need": supplyNeed,
      "Health Concern": healthConcern,
      "Behavior Concern": behaviorConcern,
      "Unable to Continue Placement": unableToContinue,
      "Needs Staff Attention": attentionRequired,
      Priority: priority,
      "Resolution Status": attentionRequired ? "New" : "Closed",
    });

    const photos = formData
      .getAll("photos")
      .filter((item): item is File => item instanceof File && item.size > 0)
      .slice(0, 4);

    if (createdUpdate?.id && photos.length) {
      for (const photo of photos) {
        await airtableUploadAttachment(createdUpdate.id, "fldv9ACtVoYX6KBRy", photo);
      }
    }

    await airtableUpdate(TABLES.fosterPlacements, placementId, {
      "Check-In Status": attentionRequired ? "Needs Attention" : "Check-In Completed",
      ...(attentionRequired ? { "Placement Status": "Needs Attention" } : {}),
    });

    revalidatePath("/portal/foster");
    revalidatePath("/portal/staff");
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

          <div className="space-y-8">
            {!data.foster && (
              <div className="rounded-3xl border border-primary/15 bg-primary/5 p-6">
                <p className="font-semibold">
                  You can access the Foster Portal, but this account is not linked to an approved foster application.
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  You can still view foster resources and support information. Personalized foster placement details will appear only when this sign-in email matches an approved foster application.
                </p>
              </div>
            )}
              <section className="rounded-3xl border bg-white p-7 shadow-sm">
                <div className="mb-5 flex items-center gap-3">
                  <HeartHandshake className="h-6 w-6 text-primary" />
                  <h2 className="text-2xl font-bold">My Foster</h2>
                </div>

                {!data.foster ? (
                  <div className="rounded-2xl bg-slate-50 p-5">
                    <p className="font-semibold">No foster placement is linked to this account.</p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Administrators can still review the portal experience and foster resources from this page.
                    </p>
                  </div>
                ) : data.placements.length ? (
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
                            Routine updates stay in the placement history. Concerns or urgent needs are automatically surfaced to staff.
                          </p>

                          <div className="mt-4 grid gap-4 md:grid-cols-2">
                            <label className="text-sm font-medium">
                              Update type
                              <select name="updateType" className="mt-1 w-full rounded-xl border bg-white px-3 py-2">
                                <option>Routine Check-In</option>
                                <option>Progress Update</option>
                                <option>Health / Medical</option>
                                <option>Behavior</option>
                                <option>Medication / Treatment</option>
                                <option>Supplies</option>
                                <option>Placement Support</option>
                                <option>Other</option>
                              </select>
                            </label>
                            <label className="text-sm font-medium">
                              Appetite / eating
                              <select name="appetite" className="mt-1 w-full rounded-xl border bg-white px-3 py-2">
                                <option>Normal</option>
                                <option>Reduced</option>
                                <option>Not Eating</option>
                                <option>Increased</option>
                                <option>Variable</option>
                                <option>Not Applicable</option>
                              </select>
                            </label>
                          </div>

                          <label className="mt-4 block text-sm font-medium">
                            General progress
                            <textarea
                              name="generalProgress"
                              rows={3}
                              className="mt-1 w-full rounded-xl border bg-white px-3 py-2"
                              placeholder="How is your foster doing overall?"
                            />
                          </label>

                          <div className="mt-4 grid gap-4 md:grid-cols-2">
                            <label className="text-sm font-medium">
                              Behavior
                              <textarea name="behavior" rows={3} className="mt-1 w-full rounded-xl border bg-white px-3 py-2" placeholder="Behavior, comfort, routines, changes..." />
                            </label>
                            <label className="text-sm font-medium">
                              Medication / treatment update
                              <textarea name="medication" rows={3} className="mt-1 w-full rounded-xl border bg-white px-3 py-2" placeholder="Medication given, recovery progress, treatment notes..." />
                            </label>
                            <label className="text-sm font-medium">
                              Supply need
                              <textarea name="supplyNeed" rows={3} className="mt-1 w-full rounded-xl border bg-white px-3 py-2" placeholder="Food, litter, medication, bedding, crate, or other supplies..." />
                            </label>
                            <label className="text-sm font-medium">
                              Health concern
                              <textarea name="healthConcern" rows={3} className="mt-1 w-full rounded-xl border bg-white px-3 py-2" placeholder="Describe any health concern that Safe Haven should review." />
                            </label>
                            <label className="text-sm font-medium md:col-span-2">
                              Behavior concern
                              <textarea name="behaviorConcern" rows={3} className="mt-1 w-full rounded-xl border bg-white px-3 py-2" placeholder="Describe any behavior concern that needs support." />
                            </label>
                          </div>

                          <div className="mt-4 grid gap-4 md:grid-cols-2">
                            <label className="text-sm font-medium">
                              Priority
                              <select name="priority" className="mt-1 w-full rounded-xl border bg-white px-3 py-2">
                                <option>Normal</option>
                                <option>High</option>
                                <option>Urgent</option>
                              </select>
                            </label>
                            <label className="rounded-xl bg-slate-50 p-4 text-sm font-medium">
                              Add photos (optional)
                              <input
                                type="file"
                                name="photos"
                                accept="image/*"
                                multiple
                                className="mt-2 block w-full text-sm font-normal text-muted-foreground"
                              />
                              <span className="mt-2 block text-xs font-normal text-muted-foreground">
                                Up to 4 images per update. Each image must be 5 MB or smaller.
                              </span>
                            </label>
                          </div>

                          <div className="mt-4 space-y-3">
                            <label className="flex items-start gap-2 text-sm">
                              <input className="mt-1" type="checkbox" name="needsAttention" />
                              <span>This needs staff attention.</span>
                            </label>
                            <label className="flex items-start gap-2 text-sm">
                              <input className="mt-1" type="checkbox" name="unableToContinue" />
                              <span>I may be unable to continue this foster placement.</span>
                            </label>
                          </div>

                          <button
                            type="submit"
                            className="mt-5 rounded-full bg-primary px-5 py-2.5 font-semibold text-white shadow-sm hover:opacity-90"
                          >
                            Send Update
                          </button>
                        </form>

                        {placement.updates.length > 0 && (
                          <div className="mt-5 rounded-2xl border bg-white p-5">
                            <h3 className="font-semibold">Recent Foster Updates</h3>
                            <div className="mt-4 space-y-3">
                              {placement.updates.map((update) => (
                                <div key={update.id} className="rounded-xl bg-slate-50 p-4 text-sm">
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <p className="font-medium">{update.updateType || "Foster Update"}</p>
                                    <div className="flex items-center gap-2 text-xs">
                                      {update.priority && <span className="font-semibold text-primary">{update.priority}</span>}
                                      {update.submittedAt && <span className="text-muted-foreground">{formatDate(update.submittedAt)}</span>}
                                    </div>
                                  </div>
                                  {update.generalProgress && <p className="mt-2 text-muted-foreground">{update.generalProgress}</p>}
                                  {update.healthConcern && <p className="mt-2"><span className="font-semibold">Health:</span> {update.healthConcern}</p>}
                                  {update.behaviorConcern && <p className="mt-2"><span className="font-semibold">Behavior concern:</span> {update.behaviorConcern}</p>}
                                  {update.supplyNeed && <p className="mt-2"><span className="font-semibold">Supply need:</span> {update.supplyNeed}</p>}
                                  {update.photos?.length > 0 && (
                                    <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                                      {update.photos.map((photo) => (
                                        <a key={photo.url} href={photo.url} target="_blank" rel="noopener noreferrer">
                                          <img
                                            src={photo.url}
                                            alt={photo.filename}
                                            className="h-24 w-full rounded-lg object-cover"
                                          />
                                        </a>
                                      ))}
                                    </div>
                                  )}
                                  {update.staffResponse && (
                                    <div className="mt-3 rounded-lg border border-primary/15 bg-primary/5 p-3">
                                      <p className="font-semibold">Safe Haven response</p>
                                      <p className="mt-1 text-muted-foreground">{update.staffResponse}</p>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
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
        </div>
      </section>
    </div>
  );
}
