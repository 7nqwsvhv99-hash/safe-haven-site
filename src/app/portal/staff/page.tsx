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
import { requirePortalRole, getPortalContext, getStaffPortalData, airtableCreate, airtableUpdate, airtableList, airtableDelete, TABLES } from "@/lib/portal";

function formText(formData: FormData, name: string) {
  return String(formData.get(name) || "").trim();
}

function optionalNumber(formData: FormData, name: string) {
  const value = formText(formData, name);
  if (!value) return undefined;
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
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

export default async function StaffPortalPage() {
  const context = await getPortalContext();
  if (!context.canStaff) redirect(context.canOnboard ? "/portal/staff/onboarding" : "/portal");
  const data = await getStaffPortalData();
  const canWriteStaff = context.isAdministrator || context.roles.includes("Staff") || context.roles.includes("Staff Manager");

  async function addShelterInventoryItem(formData: FormData) {
    "use server";
    await requirePortalRole("Staff", "write");
    const itemName = formText(formData, "itemName");
    if (!itemName) return;
    await airtableCreate(TABLES.inventory, {
      "Item Name": itemName,
      Area: "Shelter",
      Category: formText(formData, "category") || "Other",
      "Unit of Measure": formText(formData, "unit"),
      ...(optionalNumber(formData, "reorderPoint") !== undefined ? { "Reorder Point": optionalNumber(formData, "reorderPoint") } : {}),
      ...(optionalNumber(formData, "targetQuantity") !== undefined ? { "Target Quantity": optionalNumber(formData, "targetQuantity") } : {}),
      "Preferred Vendor": formText(formData, "vendor"),
      "Purchase URL": formText(formData, "purchaseUrl"),
      ...(optionalNumber(formData, "unitCost") !== undefined ? { "Typical Unit Cost": optionalNumber(formData, "unitCost") } : {}),
      "Responsible Person": formText(formData, "responsiblePerson") || "Sam Smith",
      "Responsible Email": formText(formData, "responsibleEmail") || "sa7smith@msn.com",
      "Track Lot / Expiration": formData.get("trackLot") === "on",
      Notes: formText(formData, "notes"),
      Active: true,
    }, true);
    revalidatePath("/portal/staff");
    revalidatePath("/portal/staff/inventory");
  }

  async function updateShelterInventoryItem(formData: FormData) {
    "use server";
    await requirePortalRole("Staff", "write");
    const itemId = formText(formData, "itemId");
    const latest = await airtableList(TABLES.inventory, ["Area"]);
    if (!latest.some((record) => record.id === itemId && String(record.fields.Area || "") === "Shelter")) return;
    await airtableUpdate(TABLES.inventory, itemId, {
      "Item Name": formText(formData, "itemName"),
      Category: formText(formData, "category"),
      "Unit of Measure": formText(formData, "unit"),
      "Reorder Point": optionalNumber(formData, "reorderPoint") ?? null,
      "Target Quantity": optionalNumber(formData, "targetQuantity") ?? null,
      "Preferred Vendor": formText(formData, "vendor"),
      "Purchase URL": formText(formData, "purchaseUrl"),
      "Typical Unit Cost": optionalNumber(formData, "unitCost") ?? null,
      "Responsible Person": formText(formData, "responsiblePerson"),
      "Responsible Email": formText(formData, "responsibleEmail"),
      "Track Lot / Expiration": formData.get("trackLot") === "on",
      Notes: formText(formData, "notes"),
      Active: formData.get("active") === "on",
    }, true);
    revalidatePath("/portal/staff");
    revalidatePath("/portal/staff/inventory");
  }

  async function saveShelterInventoryCount(formData: FormData) {
    "use server";
    const current = await requirePortalRole("Staff", "write");
    const itemId = formText(formData, "itemId");
    const newCount = optionalNumber(formData, "count");
    if (!itemId || newCount === undefined || newCount < 0) return;
    const latest = await airtableList(TABLES.inventory, ["Area", "Current Quantity", "Inventory Status"]);
    const item = latest.find((record) => record.id === itemId && String(record.fields.Area || "") === "Shelter");
    if (!item) return;
    const existingCount = typeof item.fields["Current Quantity"] === "number" ? item.fields["Current Quantity"] : 0;
    const delta = newCount - existingCount;
    if (delta !== 0 || String(item.fields["Inventory Status"] || "") === "Not Counted") {
      await airtableCreate(TABLES.inventoryTransactions, {
        Item: [itemId],
        "Date / Time": new Date().toISOString(),
        "Transaction Type": delta >= 0 ? "Adjustment +" : "Adjustment -",
        "Quantity Change": Math.abs(delta),
        "Entered By": current.displayName || current.email,
        Notes: String(item.fields["Inventory Status"] || "") === "Not Counted" ? "Opening physical count entered from Staff Portal." : "Physical count adjustment entered from Staff Portal.",
      }, true);
    }
    revalidatePath("/portal/staff");
    revalidatePath("/portal/staff/inventory");
  }

  async function requestShelterInventoryReorder(formData: FormData) {
    "use server";
    const current = await requirePortalRole("Staff", "write");
    const itemId = formText(formData, "itemId");
    const latest = await airtableList(TABLES.inventory, ["Area", "Current Quantity", "Reorder Point", "Suggested Reorder Quantity", "Unit of Measure", "Reorder Request Status"]);
    const item = latest.find((record) => record.id === itemId && String(record.fields.Area || "") === "Shelter");
    if (!item) return;
    const status = String(item.fields["Reorder Request Status"] || "");
    if (status === "Requested" || status === "Ordered") return;
    await airtableUpdate(TABLES.inventory, itemId, {
      "Reorder Request Status": "Requested",
      "Reorder Requested At": new Date().toISOString(),
      "Reorder Requested By": current.displayName || current.email,
      "Reorder Reason": `Manual reorder request from Staff Portal. Suggested reorder: ${typeof item.fields["Suggested Reorder Quantity"] === "number" ? item.fields["Suggested Reorder Quantity"] : 0} ${String(item.fields["Unit of Measure"] || "")}.`,
      "Reorder Notification Sent": false,
    }, true);
    revalidatePath("/portal/staff");
    revalidatePath("/portal/staff/inventory");
  }

  async function deleteShelterInventoryItem(formData: FormData) {
    "use server";
    await requirePortalRole("Staff", "write");
    const itemId = formText(formData, "itemId");
    if (!itemId || formData.get("confirmDelete") !== "on") return;
    const [latest, transactions] = await Promise.all([
      airtableList(TABLES.inventory, ["Area"]),
      airtableList(TABLES.inventoryTransactions, ["Item"]),
    ]);
    const item = latest.find((record) => record.id === itemId && String(record.fields.Area || "") === "Shelter");
    if (!item) return;
    const hasHistory = transactions.some((record) => Array.isArray(record.fields.Item) && record.fields.Item.includes(itemId));
    if (hasHistory) {
      await airtableUpdate(TABLES.inventory, itemId, { Active: false, "Reorder Request Status": "Resolved" }, true);
    } else {
      await airtableDelete(TABLES.inventory, itemId);
    }
    revalidatePath("/portal/staff");
    revalidatePath("/portal/staff/inventory");
  }

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
    const current = await requirePortalRole("Staff", "write");

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
    await requirePortalRole("Staff", "write");
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
            <h1 className="text-4xl font-bold tracking-tight md:text-5xl">Animal Care First</h1>
            <p className="mt-4 max-w-3xl text-muted-foreground">
              Start with animal care, medical needs, housing, intake, foster, and adoption. Supporting operations remain available below when needed.
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

          <div className="mb-4"><p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">Animal Care & Placement</p></div>
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

          <section className="mb-8 rounded-3xl border bg-white p-7 shadow-sm">
            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div className="flex items-start gap-4">
                <div className="rounded-2xl bg-primary/10 p-3 text-primary"><ClipboardList className="h-6 w-6" /></div>
                <div>
                  <h2 className="text-2xl font-bold">Volunteer Opportunity Requests</h2>
                  <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                    Review requests from current volunteers who want to expand into another area, record requests received directly by staff, and confirm training or approval when appropriate.
                  </p>
                </div>
              </div>
              <Link href="/portal/staff/volunteer-opportunities" className="inline-flex shrink-0 items-center justify-center rounded-full border border-primary px-5 py-2.5 font-semibold text-primary hover:bg-primary/5">
                Open Opportunity Requests
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
                <div className="mb-2 flex items-center gap-3">
                  <Boxes className="h-6 w-6 text-primary" />
                  <h2 className="text-2xl font-bold">Shelter Inventory</h2>
                </div>
                <p className="mb-5 text-sm text-muted-foreground">Update counts, add supplies, edit item details, and request reorders directly from the Staff Portal.</p>

                {canWriteStaff && (
                  <details className="mb-5 rounded-2xl border border-primary/20 bg-primary/5 p-4">
                    <summary className="cursor-pointer font-semibold text-primary">+ Add a supply</summary>
                    <form action={addShelterInventoryItem} className="mt-4 grid gap-3 sm:grid-cols-2">
                      <label className="text-xs font-medium">Supply name<input name="itemName" required placeholder="e.g. Kitten wet food" className="mt-1 w-full rounded-xl border bg-white px-3 py-2.5" /></label>
                      <label className="text-xs font-medium">Category<select name="category" defaultValue="Other" className="mt-1 w-full rounded-xl border bg-white px-3 py-2.5">{["Animal Food","Litter","Cleaning","PPE","Office","Laundry","Animal Care","Other"].map((category)=><option key={category}>{category}</option>)}</select></label>
                      <label className="text-xs font-medium">Unit of measure<input name="unit" placeholder="e.g. case, bag, each" className="mt-1 w-full rounded-xl border bg-white px-3 py-2.5" /></label>
                      <div className="grid grid-cols-2 gap-3">
                        <label className="text-xs font-medium">Reorder point<input name="reorderPoint" type="number" min="0" step="0.01" className="mt-1 w-full rounded-xl border bg-white px-3 py-2.5" /></label>
                        <label className="text-xs font-medium">Target quantity<input name="targetQuantity" type="number" min="0" step="0.01" className="mt-1 w-full rounded-xl border bg-white px-3 py-2.5" /></label>
                      </div>
                      <label className="text-xs font-medium">Preferred vendor<input name="vendor" placeholder="Optional" className="mt-1 w-full rounded-xl border bg-white px-3 py-2.5" /></label>
                      <label className="text-xs font-medium">Purchase URL<input name="purchaseUrl" type="url" placeholder="Optional" className="mt-1 w-full rounded-xl border bg-white px-3 py-2.5" /></label>
                      <label className="text-xs font-medium">Typical unit cost<input name="unitCost" type="number" min="0" step="0.01" placeholder="Optional" className="mt-1 w-full rounded-xl border bg-white px-3 py-2.5" /></label>
                      <label className="text-xs font-medium">Responsible person<input name="responsiblePerson" defaultValue="Sam Smith" className="mt-1 w-full rounded-xl border bg-white px-3 py-2.5" /></label>
                      <label className="text-xs font-medium">Responsible email<input name="responsibleEmail" type="email" defaultValue="sa7smith@msn.com" className="mt-1 w-full rounded-xl border bg-white px-3 py-2.5" /></label>
                      <label className="flex items-center gap-2 text-sm"><input name="trackLot" type="checkbox" /> Track lot / expiration</label>
                      <label className="text-xs font-medium sm:col-span-2">Notes<textarea name="notes" rows={2} placeholder="Optional notes about this supply" className="mt-1 w-full rounded-xl border bg-white px-3 py-2.5" /></label>
                      <button className="w-fit rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white sm:col-span-2">Add supply</button>
                    </form>
                  </details>
                )}

                <div className="space-y-3">
                  {data.inventory.filter((item) => item.area === "Shelter").map((item) => {
                    const lowStock = ["Low Stock", "Out of Stock"].includes(item.status);
                    const reorderActive = ["Requested", "Ordered"].includes(item.reorderStatus);
                    return (
                      <div key={item.id} className={`rounded-2xl border p-4 ${lowStock || reorderActive ? "border-orange-300 bg-orange-50/60" : "border-transparent bg-slate-50"}`}>
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="font-semibold">{item.name}</p>
                            {item.unit && <p className="text-xs text-muted-foreground">Unit: {item.unit}</p>}
                            <p className={`mt-1 text-xs font-semibold ${lowStock || reorderActive ? "text-primary" : "text-muted-foreground"}`}>
                              {reorderActive ? `Reorder ${item.reorderStatus.toLowerCase()}` : (item.status || "No status")}
                            </p>
                          </div>
                          <div className="text-left sm:text-right">
                            <p className="text-lg font-bold">{item.current ?? "—"}</p>
                            <p className="text-xs text-muted-foreground">Reorder at {item.reorderPoint ?? "—"} · Target {item.target ?? "—"}</p>
                          </div>
                        </div>

                        {canWriteStaff && (
                          <>
                            <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]">
                              <form action={saveShelterInventoryCount} className="flex flex-wrap items-end gap-2">
                                <input type="hidden" name="itemId" value={item.id} />
                                <label className="text-xs font-medium">Current count<input name="count" type="number" min="0" step="1" defaultValue={item.current ?? ""} placeholder="Enter count" className="mt-1 w-28 rounded-lg border bg-white px-3 py-2 text-sm" /></label>
                                <button className="rounded-full border border-primary px-4 py-2 text-sm font-semibold text-primary">Save count</button>
                              </form>
                              <form action={requestShelterInventoryReorder} className="flex items-end">
                                <input type="hidden" name="itemId" value={item.id} />
                                <button disabled={reorderActive} className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-45">
                                  {reorderActive ? (item.reorderStatus === "Ordered" ? "Order in progress" : "Reorder requested") : "Request reorder"}
                                </button>
                              </form>
                            </div>

                            <details className="mt-4 border-t pt-4">
                              <summary className="cursor-pointer text-sm font-semibold text-primary">Modify item</summary>
                              <form action={updateShelterInventoryItem} className="mt-4 grid gap-3 sm:grid-cols-2">
                                <input type="hidden" name="itemId" value={item.id} />
                                <label className="text-xs font-medium">Supply name<input name="itemName" required defaultValue={item.name} className="mt-1 w-full rounded-xl border bg-white px-3 py-2.5" /></label>
                                <label className="text-xs font-medium">Category<select name="category" defaultValue={item.category || "Other"} className="mt-1 w-full rounded-xl border bg-white px-3 py-2.5">{["Animal Food","Litter","Cleaning","PPE","Office","Laundry","Animal Care","Other"].map((category)=><option key={category}>{category}</option>)}</select></label>
                                <label className="text-xs font-medium">Unit of measure<input name="unit" defaultValue={item.unit} className="mt-1 w-full rounded-xl border bg-white px-3 py-2.5" /></label>
                                <div className="grid grid-cols-2 gap-3">
                                  <label className="text-xs font-medium">Reorder point<input name="reorderPoint" type="number" min="0" step="0.01" defaultValue={item.reorderPoint ?? ""} className="mt-1 w-full rounded-xl border bg-white px-3 py-2.5" /></label>
                                  <label className="text-xs font-medium">Target quantity<input name="targetQuantity" type="number" min="0" step="0.01" defaultValue={item.target ?? ""} className="mt-1 w-full rounded-xl border bg-white px-3 py-2.5" /></label>
                                </div>
                                <label className="text-xs font-medium">Preferred vendor<input name="vendor" defaultValue={item.vendor} placeholder="Optional" className="mt-1 w-full rounded-xl border bg-white px-3 py-2.5" /></label>
                                <label className="text-xs font-medium">Purchase URL<input name="purchaseUrl" type="url" defaultValue={item.purchaseUrl} placeholder="Optional" className="mt-1 w-full rounded-xl border bg-white px-3 py-2.5" /></label>
                                <label className="text-xs font-medium">Typical unit cost<input name="unitCost" type="number" min="0" step="0.01" defaultValue={item.unitCost ?? ""} placeholder="Optional" className="mt-1 w-full rounded-xl border bg-white px-3 py-2.5" /></label>
                                <label className="text-xs font-medium">Responsible person<input name="responsiblePerson" defaultValue={item.responsiblePerson || "Sam Smith"} className="mt-1 w-full rounded-xl border bg-white px-3 py-2.5" /></label>
                                <label className="text-xs font-medium">Responsible email<input name="responsibleEmail" type="email" defaultValue={item.responsibleEmail || "sa7smith@msn.com"} className="mt-1 w-full rounded-xl border bg-white px-3 py-2.5" /></label>
                                <label className="flex items-center gap-2 text-sm"><input name="trackLot" type="checkbox" defaultChecked={item.trackLotExpiration} /> Track lot / expiration</label>
                                <label className="flex items-center gap-2 text-sm"><input name="active" type="checkbox" defaultChecked /> Active</label>
                                <label className="text-xs font-medium sm:col-span-2">Notes<textarea name="notes" rows={2} defaultValue={item.notes} className="mt-1 w-full rounded-xl border bg-white px-3 py-2.5" /></label>
                                <button className="w-fit rounded-full border border-primary px-5 py-2 text-sm font-semibold text-primary sm:col-span-2">Save item changes</button>
                              </form>
                              <form action={deleteShelterInventoryItem} className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4">
                                <input type="hidden" name="itemId" value={item.id} />
                                <p className="text-sm font-semibold text-red-800">Delete item</p>
                                <p className="mt-1 text-xs text-red-700">If this item has transaction history, it will be archived instead of permanently removed so inventory history remains intact.</p>
                                <label className="mt-3 flex items-start gap-2 text-xs text-red-800"><input required name="confirmDelete" type="checkbox" className="mt-0.5" /> I confirm that I want to remove this item from active inventory.</label>
                                <button className="mt-3 rounded-full border border-red-500 px-4 py-2 text-sm font-semibold text-red-700">Delete item</button>
                              </form>
                            </details>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
                <Link href="/portal/staff/inventory" className="mt-5 inline-block text-sm font-semibold text-primary hover:underline">Open full inventory history & transactions</Link>
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
                  {context.canViewOnboarding && <Link href="/portal/staff/onboarding" className="rounded-xl border p-4 hover:bg-slate-50"><div className="flex items-center gap-3"><Users className="h-5 w-5 text-primary" /><span className="font-semibold">Volunteer Onboarding</span></div><p className="mt-2 text-sm text-muted-foreground">Applications, credentials, trained roles, waivers, roster links, and volunteer portal access.</p></Link>}
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
