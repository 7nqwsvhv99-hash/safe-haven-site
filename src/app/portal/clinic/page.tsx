import Link from "next/link";
import { revalidatePath } from "next/cache";
import { ArrowLeft, CalendarCheck, CalendarPlus, ClipboardCheck, Boxes, Megaphone, BookOpen, ExternalLink } from "lucide-react";
import { VeterinarianDateForm } from "./veterinarian-date-form";
import { TrainingResourceSections } from "./training-resource-sections";
import { InventorySearch } from "./inventory-search";
import { requirePortalRole, getClinicPortalData, airtableCreate, airtableUpdate, airtableList, airtableDelete, TABLES } from "@/lib/portal";


function formatClinicTime(value: string) {
  if (!value || !/^\d{2}:\d{2}$/.test(value)) return "";
  const [hours, minutes] = value.split(":").map(Number);
  const suffix = hours >= 12 ? "PM" : "AM";
  const hour = hours % 12 || 12;
  return `${hour}:${String(minutes).padStart(2, "0")} ${suffix}`;
}

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

function formText(formData: FormData, name: string) {
  return String(formData.get(name) || "").trim();
}

function optionalNumber(formData: FormData, name: string) {
  const value = formText(formData, name);
  if (!value) return undefined;
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function daysUntilClinic(value: string) {
  if (!value) return Number.POSITIVE_INFINITY;
  const clinic = new Date(`${value.slice(0, 10)}T12:00:00-05:00`);
  const todayText = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const today = new Date(`${todayText}T12:00:00-05:00`);
  return Math.round((clinic.getTime() - today.getTime()) / 86400000);
}

export default async function ClinicPortalPage({ searchParams }: { searchParams: Promise<{ section?: string }> }) {
  const context = await requirePortalRole("Clinic Team");
  const data = await getClinicPortalData(context.email);
  const canWriteClinic = context.isAdministrator || context.roles.includes("Clinic Team");
  const canManageClinicInventory = canWriteClinic;
  const canRequestClinicReorder = canWriteClinic;
  const showClinicInventory = Boolean(data.member) || context.isAdministrator;
  const requestedSection = (await searchParams).section || "dates";
  const allowedSections = new Set(["dates", "staffing", "inventory", "training"]);
  const section = !allowedSections.has(requestedSection) || (requestedSection === "inventory" && !showClinicInventory)
    ? "dates"
    : requestedSection;

  async function submitVeterinarianPreference(formData: FormData) {
    "use server";
    const current = await requirePortalRole("Clinic Team", "write");
    const latest = await getClinicPortalData(current.email);
    if (!latest.member || latest.member.role !== "Veterinarian") return;

    const preferredDate = String(formData.get("preferredDate") || "").trim();
    const preferredClinicType = String(formData.get("preferredClinicType") || "Full Day");
    const startTime = String(formData.get("startTime") || "").trim();
    const endTime = String(formData.get("endTime") || "").trim();
    const notes = String(formData.get("notes") || "").trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(preferredDate) || !["Full Day", "Half Day"].includes(preferredClinicType)) return;
    if (!/^\d{2}:\d{2}$/.test(startTime) || !/^\d{2}:\d{2}$/.test(endTime) || startTime >= endTime) return;

    const date = new Date(`${preferredDate}T12:00:00`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (Number.isNaN(date.getTime()) || date < today || ![3, 6].includes(date.getDay())) return;
    if (date.getDay() === 3 && preferredClinicType !== "Half Day") return;
    if (date.getDay() === 3) {
      const toMinutes = (value: string) => {
        const [hours, minutes] = value.split(":").map(Number);
        return hours * 60 + minutes;
      };
      if (toMinutes(endTime) - toMinutes(startTime) !== 300) return;
    }

    const duplicate = latest.vetPreferences.some(
      (item) => item.preferredDate === preferredDate && item.status !== "Withdrawn"
    );
    if (duplicate) return;

    await airtableCreate(TABLES.vetClinicPreferences, {
      Veterinarian: [latest.member.id],
      "Preferred Clinic Date": preferredDate,
      "Preferred Clinic Type": preferredClinicType,
      "Preferred Start Time": startTime,
      "Preferred End Time": endTime,
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
    let assignments: string[] | undefined;
    if (value === "Yes") {
      if (latest.member?.role === "Veterinarian") assignment = "Veterinarian";
      else if (["Vet Tech", "Veterinary Technician"].includes(latest.member?.role || "")) assignment = "Veterinary Technician";
      else if (latest.member?.role === "Clinic Volunteer") {
        assignment = "Front Room Support";
        assignments = ["General Volunteer"];
      }
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
      ...(assignments ? { "Clinic Assignments": assignments } : {}),
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

    const selectedAssignments = formData.getAll("assignments").map(String).filter((value) => allowed.has(value));
    const assignments = selectedAssignments.length ? selectedAssignments : ["General Volunteer"];

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


  async function saveClinicNote(formData: FormData) {
    "use server";
    const current = await requirePortalRole("Clinic Team", "write");
    const latest = await getClinicPortalData(current.email);
    if (latest.member?.role !== "Clinic Volunteer") return;
    const responseId = formText(formData, "responseId");
    if (!latest.dates.some((item) => item.responseId === responseId)) return;

    const note = formText(formData, "note");
    if (note.length > 1000) return;
    await airtableUpdate(TABLES.clinicResponses, responseId, { Notes: note });
    revalidatePath("/portal/clinic");
  }

  async function addClinicInventoryItem(formData: FormData) {
    "use server";
    const current = await requirePortalRole("Clinic Team", "write");
    const latest = await getClinicPortalData(current.email);
    if (!latest.member && !current.isAdministrator) return;

    const itemName = formText(formData, "itemName");
    if (!itemName) return;

    await airtableCreate(TABLES.inventory, {
      "Item Name": itemName,
      Area: "Clinic",
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

    revalidatePath("/portal/clinic");
  }

  async function updateClinicInventoryItem(formData: FormData) {
    "use server";
    const current = await requirePortalRole("Clinic Team", "write");
    const latest = await getClinicPortalData(current.email);
    if (!latest.member && !current.isAdministrator) return;
    const itemId = formText(formData, "itemId");
    const item = latest.inventory.find((entry) => entry.id === itemId);
    if (!item) return;

    const itemName = formText(formData, "itemName");
    if (!itemName) return;

    await airtableUpdate(TABLES.inventory, itemId, {
      "Item Name": itemName,
      Category: formText(formData, "category") || "Other",
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

    revalidatePath("/portal/clinic");
  }

  async function deleteClinicInventoryItem(formData: FormData) {
    "use server";
    const current = await requirePortalRole("Clinic Team", "write");
    const latest = await getClinicPortalData(current.email);
    if (!latest.member && !current.isAdministrator) return;
    const itemId = formText(formData, "itemId");
    if (!itemId || formData.get("confirmDelete") !== "on") return;
    const item = latest.inventory.find((entry) => entry.id === itemId);
    if (!item) return;

    const transactions = await airtableList(TABLES.inventoryTransactions, ["Item"]);
    const hasHistory = transactions.some((record) => {
      const links = Array.isArray(record.fields.Item) ? record.fields.Item : [];
      return links.includes(itemId);
    });

    if (hasHistory) {
      await airtableUpdate(TABLES.inventory, itemId, {
        Active: false,
        "Reorder Request Status": "Resolved",
      }, true);
    } else {
      await airtableDelete(TABLES.inventory, itemId);
    }

    revalidatePath("/portal/clinic");
  }

  async function saveInventoryCount(formData: FormData) {
    "use server";
    const current = await requirePortalRole("Clinic Team", "write");
    const latest = await getClinicPortalData(current.email);
    if (!latest.member && !current.isAdministrator) return;
    const itemId = String(formData.get("itemId") || "");
    const countRaw = String(formData.get("count") || "").trim();
    const item = latest.inventory.find((entry) => entry.id === itemId);
    if (!item || !countRaw) return;

    const newCount = Number(countRaw);
    if (!Number.isFinite(newCount) || newCount < 0) return;

    const existingCount = item.current ?? 0;
    const delta = newCount - existingCount;
    if (delta !== 0 || item.status === "Not Counted") {
      await airtableCreate(TABLES.inventoryTransactions, {
        Item: [itemId],
        "Date / Time": new Date().toISOString(),
        "Transaction Type": delta >= 0 ? "Adjustment +" : "Adjustment -",
        "Quantity Change": Math.abs(delta),
        "Entered By": current.displayName || current.email,
        Notes: item.status === "Not Counted" ? "Opening physical count entered from Clinic Team Portal." : "Physical count adjustment entered from Clinic Team Portal.",
      });
    }
    await airtableUpdate(TABLES.inventory, itemId, {
      "Last Counted At": new Date().toISOString(),
      "Last Counted By": current.displayName || current.email,
    }, true);

    revalidatePath("/portal/clinic");
  }

  async function requestInventoryReorder(formData: FormData) {
    "use server";
    const current = await requirePortalRole("Clinic Team", "write");
    const latest = await getClinicPortalData(current.email);
    if (!latest.member && !current.isAdministrator) return;
    const itemId = String(formData.get("itemId") || "");
    const item = latest.inventory.find((entry) => entry.id === itemId);
    if (!item) return;
    if (item.reorderStatus === "Requested" || item.reorderStatus === "Ordered") return;

    await airtableUpdate(TABLES.inventory, itemId, {
      "Reorder Request Status": "Requested",
      "Reorder Requested At": new Date().toISOString(),
      "Reorder Requested By": current.displayName || current.email,
      "Reorder Reason": `Manual reorder request from Clinic Team Portal. Current count: ${item.current ?? "not counted"} ${item.unit || ""}. Reorder point: ${item.reorderPoint ?? "not set"}. Suggested reorder: ${item.suggestedReorder ?? "not set"}.`,
      "Reorder Notification Sent": false,
    });

    revalidatePath("/portal/clinic");
  }

  async function receiveClinicInventory(formData: FormData) {
    "use server";
    const current = await requirePortalRole("Clinic Team", "write");
    const latest = await getClinicPortalData(current.email);
    if (!latest.member && !current.isAdministrator) return;
    const itemId = formText(formData, "itemId");
    const quantity = optionalNumber(formData, "quantity");
    const item = latest.inventory.find((entry) => entry.id === itemId);
    if (!item || quantity === undefined || quantity <= 0) return;

    await airtableCreate(TABLES.inventoryTransactions, {
      Item: [itemId],
      "Date / Time": new Date().toISOString(),
      "Transaction Type": "Received",
      "Quantity Change": quantity,
      "Entered By": current.displayName || current.email,
      Notes: "Inventory received through Clinic Team Portal.",
    }, true);

    await airtableUpdate(TABLES.inventory, itemId, {
      "Last Received": new Intl.DateTimeFormat("en-CA", { timeZone: "America/Chicago" }).format(new Date()),
    }, true);

    revalidatePath("/portal/clinic");
  }

  async function resolveClinicInventoryReorder(formData: FormData) {
    "use server";
    const current = await requirePortalRole("Clinic Team", "write");
    const latest = await getClinicPortalData(current.email);
    if (!latest.member && !current.isAdministrator) return;
    const itemId = formText(formData, "itemId");
    const item = latest.inventory.find((entry) => entry.id === itemId);
    if (!item || !["Requested", "Ordered"].includes(item.reorderStatus)) return;

    await airtableUpdate(TABLES.inventory, itemId, {
      "Reorder Request Status": "Resolved",
    }, true);

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
              {data.member?.role === "Veterinarian"
                ? "Your clinic dates, availability, attendance confirmations, team staffing, and clinic resources."
                : "Your clinic dates, availability, attendance confirmations, team staffing, inventory, and clinic resources."}
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              {section !== "dates" && (
                <Link href="/portal/clinic?section=dates" className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90">
                  <CalendarCheck className="h-5 w-5" />
                  My Clinic Dates
                </Link>
              )}
              {section !== "staffing" && (
                <Link href="/portal/clinic?section=staffing" className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90">
                  <ClipboardCheck className="h-5 w-5" />
                  Team Staffing Calendar
                </Link>
              )}
              {showClinicInventory && section !== "inventory" && (
                <Link href="/portal/clinic?section=inventory" className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90">
                  <Boxes className="h-5 w-5" />
                  Clinic Inventory
                </Link>
              )}
              {section !== "training" && (
                <Link href="/portal/clinic?section=training" className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90">
                  <BookOpen className="h-5 w-5" />
                  Training Resources
                </Link>
              )}
            </div>

            {section === "inventory" && showClinicInventory && (
              <section className="mt-4 rounded-3xl border bg-white p-7 shadow-sm">
                <p className="mb-5 text-sm text-muted-foreground">Update physical counts, add supplies, edit item details, and request reorders from the clinic portal.</p>
            
              {canManageClinicInventory && (
                <details className="mb-5 rounded-2xl border border-primary/20 bg-primary/5 p-4">
                  <summary className="cursor-pointer font-semibold text-primary">+ Add a supply</summary>
                  <form action={addClinicInventoryItem} className="mt-4 grid gap-3 sm:grid-cols-2">
                    <label className="text-xs font-medium">Supply name<input name="itemName" required placeholder="e.g. Sterile gauze sponges" className="mt-1 w-full rounded-xl border bg-white px-3 py-2.5" /></label>
                    <label className="text-xs font-medium">Category<select name="category" defaultValue="Other" className="mt-1 w-full rounded-xl border bg-white px-3 py-2.5">
                      {["Surgical Instruments","Surgery & Sterilization","Anesthesia, Medications & Airway","Vaccines, Testing & Preventive Care","Recovery & Patient Care","Cleaning, PPE & General Supplies","Other"].map((category)=><option key={category}>{category}</option>)}
                    </select></label>
                    <label className="text-xs font-medium">Unit of measure<input name="unit" placeholder="e.g. box, dose, each" className="mt-1 w-full rounded-xl border bg-white px-3 py-2.5" /></label>
                    <div className="grid grid-cols-2 gap-3">
                      <label className="text-xs font-medium">Reorder point<input name="reorderPoint" type="number" min="0" step="0.01" placeholder="0" className="mt-1 w-full rounded-xl border bg-white px-3 py-2.5" /></label>
                      <label className="text-xs font-medium">Target quantity<input name="targetQuantity" type="number" min="0" step="0.01" placeholder="0" className="mt-1 w-full rounded-xl border bg-white px-3 py-2.5" /></label>
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
              {data.inventory.length ? (
                <>
                  <InventorySearch />
                  {data.inventory.some((item) => ["Low Stock","Out of Stock","Not Counted"].includes(item.status) || ["Requested","Ordered"].includes(item.reorderStatus)) && (
                    <section className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                      <h3 className="font-bold text-amber-950">Needs Attention</h3>
                      <div className="mt-3 grid gap-2 md:grid-cols-2">
                        {data.inventory.filter((item) => ["Low Stock","Out of Stock","Not Counted"].includes(item.status) || ["Requested","Ordered"].includes(item.reorderStatus)).map((item) => {
                          const reorderActive = ["Requested","Ordered"].includes(item.reorderStatus);
                          return (
                            <div key={item.id} className="rounded-xl bg-white p-3">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="font-semibold">{item.name}</p>
                                  <p className="mt-1 text-xs text-muted-foreground">{item.status || "No status"}{item.reorderStatus ? ` · Reorder ${item.reorderStatus.toLowerCase()}` : ""}</p>
                                </div>
                                <span className="text-sm font-bold">{item.current ?? "—"}</span>
                              </div>
                              <p className="mt-2 text-xs text-muted-foreground">Recommended reorder: {item.suggestedReorder ?? 0} {item.unit || ""}</p>
                              <div className="mt-3 flex flex-wrap items-end gap-2 border-t pt-3">
                                <form action={saveInventoryCount} className="flex items-end gap-2">
                                  <input type="hidden" name="itemId" value={item.id} />
                                  <label className="text-xs font-medium">
                                    Current count
                                    <input name="count" type="number" min="0" step="1" defaultValue={item.current ?? ""} className="mt-1 w-24 rounded-lg border bg-white px-3 py-2 text-sm" />
                                  </label>
                                  <button className="rounded-full border border-primary px-3 py-2 text-xs font-semibold text-primary">Save</button>
                                </form>
                                {!reorderActive && (
                                  <form action={requestInventoryReorder} className="flex items-end">
                                    <input type="hidden" name="itemId" value={item.id} />
                                    <button className="rounded-full bg-primary px-3 py-2 text-xs font-semibold text-white">Request reorder</button>
                                  </form>
                                )}
                                {reorderActive && (
                                  <>
                                    <form action={receiveClinicInventory} className="flex items-end gap-2">
                                      <input type="hidden" name="itemId" value={item.id} />
                                      <input name="quantity" type="number" min="0.01" step="0.01" required placeholder="Qty received" className="w-24 rounded-lg border bg-white px-3 py-2 text-sm" />
                                      <button className="rounded-full border border-primary px-3 py-2 text-xs font-semibold text-primary">Receive</button>
                                    </form>
                                    <form action={resolveClinicInventoryReorder} className="flex items-end">
                                      <input type="hidden" name="itemId" value={item.id} />
                                      <button className="rounded-full border border-primary px-3 py-2 text-xs font-semibold text-primary">Resolved</button>
                                    </form>
                                  </>
                                )}
                              </div>
                              {reorderActive && (
                                <p className="mt-2 text-xs leading-5 text-muted-foreground">
                                  If an order arrives partially, record the quantity received and leave the reorder request unresolved until the remaining items arrive.
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </section>
                  )}
                  <details className="mb-5 rounded-2xl border bg-white">
                    <summary className="cursor-pointer px-4 py-4 font-semibold text-primary">Quick Count</summary>
                    <div className="border-t p-4">
                      <p className="mb-4 text-sm text-muted-foreground">Use this compact view for a physical count. Enter counts and save each item as you go.</p>
                      <div className="space-y-2">
                        {data.inventory.map((item) => (
                          <form key={item.id} action={saveInventoryCount} className="grid gap-2 rounded-xl bg-slate-50 p-3 sm:grid-cols-[1fr_auto_auto] sm:items-center">
                            <input type="hidden" name="itemId" value={item.id} />
                            <div>
                              <p className="font-medium">{item.name}</p>
                              <p className="text-xs text-muted-foreground">{item.category || "Other"}{item.lastCountedAt ? ` · Last counted ${formatDate(item.lastCountedAt)}` : ""}</p>
                            </div>
                            <input name="count" type="number" min="0" step="1" defaultValue={item.current ?? ""} className="w-28 rounded-lg border bg-white px-3 py-2 text-sm" />
                            <button className="rounded-full border border-primary px-4 py-2 text-sm font-semibold text-primary">Save</button>
                          </form>
                        ))}
                      </div>
                    </div>
                  </details>
                  <div className="space-y-3">
                  {["Surgical Instruments","Surgery & Sterilization","Anesthesia, Medications & Airway","Vaccines, Testing & Preventive Care","Recovery & Patient Care","Cleaning, PPE & General Supplies","Other"].map((category) => {
                    const categoryItems = data.inventory.filter((item) => (item.category || "Other") === category);
                    if (!categoryItems.length) return null;
                    return (
                      <details key={category} name="clinic-inventory-categories" data-clinic-inventory-category className="rounded-2xl border bg-white">
                        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-4 font-semibold text-foreground [&::-webkit-details-marker]:hidden">
                          <span>{category}</span>
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-muted-foreground">{categoryItems.length}</span>
                        </summary>
                        <div className="space-y-3 border-t p-3">
                          {categoryItems.map((item) => {
                            const lowStock = ["Low Stock", "Out of Stock"].includes(item.status);
                            const reorderActive = ["Requested", "Ordered"].includes(item.reorderStatus);
                            return (
                              <div
                                key={item.id}
                                data-clinic-inventory-item
                                data-inventory-search={`${item.name} ${item.category || ""} ${item.unit || ""} ${item.vendor || ""} ${item.status || ""}`}
                                className={`rounded-2xl border p-4 ${lowStock || reorderActive ? "border-orange-300 bg-orange-50/60" : "border-transparent bg-slate-50"}`}
                              >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="font-semibold">{item.name}</p>
                            {item.unit && <p className="text-xs text-muted-foreground">Unit: {item.unit}</p>}
                            {item.lastCountedAt && <p className="mt-1 text-xs text-muted-foreground">Last counted {formatDate(item.lastCountedAt)}{item.lastCountedBy ? ` by ${item.lastCountedBy}` : ""}</p>}
                            <p className={`mt-1 text-xs font-semibold ${lowStock || reorderActive ? "text-primary" : "text-muted-foreground"}`}>
                              {reorderActive ? `Reorder ${item.reorderStatus.toLowerCase()}` : (item.status || "No status")}
                            </p>
                            {item.reorderReason && reorderActive && <p className="mt-1 text-xs text-muted-foreground">{item.reorderReason}</p>}
                          </div>
                          <div className="text-left sm:text-right">
                            <p className="text-lg font-bold">{item.current ?? "—"}</p>
                            <p className="text-xs text-muted-foreground">Reorder at {item.reorderPoint ?? "—"} · Target {item.target ?? "—"} · Recommend {item.suggestedReorder ?? 0}</p>
                          </div>
                        </div>
                        <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]">
                          <form action={saveInventoryCount} className="flex flex-wrap items-end gap-2">
                            <input type="hidden" name="itemId" value={item.id} />
                            <label className="text-xs font-medium">
                              Current count
                              <input name="count" type="number" min="0" step="1" defaultValue={item.current ?? ""} placeholder="Enter count" className="mt-1 w-28 rounded-lg border bg-white px-3 py-2 text-sm" />
                            </label>
                            <button className="rounded-full border border-primary px-4 py-2 text-sm font-semibold text-primary">Save count</button>
                          </form>
                          {canRequestClinicReorder && (
                            <div className="flex flex-wrap items-end justify-end gap-2">
                              <form action={requestInventoryReorder} className="flex items-end">
                                <input type="hidden" name="itemId" value={item.id} />
                                <button disabled={reorderActive} className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-45">
                                  {reorderActive ? (item.reorderStatus === "Ordered" ? "Order in progress" : "Reorder requested") : "Request reorder"}
                                </button>
                              </form>
                              {canManageClinicInventory && reorderActive && (
                                <div className="max-w-md">
                                  <div className="flex flex-wrap items-end gap-2">
                                    <form action={receiveClinicInventory} className="flex items-end gap-2">
                                      <input type="hidden" name="itemId" value={item.id} />
                                      <input name="quantity" type="number" min="0.01" step="0.01" required placeholder="Qty received" className="w-28 rounded-lg border bg-white px-3 py-2 text-sm" />
                                      <button className="rounded-full border border-primary px-4 py-2 text-sm font-semibold text-primary">Receive</button>
                                    </form>
                                    <form action={resolveClinicInventoryReorder} className="flex items-end">
                                      <input type="hidden" name="itemId" value={item.id} />
                                      <button className="rounded-full border border-primary px-4 py-2 text-sm font-semibold text-primary">Resolved</button>
                                    </form>
                                  </div>
                                  <p className="mt-2 text-xs leading-5 text-muted-foreground">
                                    If an order arrives partially, record the quantity received and leave the reorder request unresolved until the remaining items arrive.
                                  </p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        {lowStock && !reorderActive && <p className="mt-3 text-xs font-semibold text-primary">Low count detected. A reorder request is needed.</p>}
            
                        {canManageClinicInventory && (
                          <details className="mt-4 border-t pt-4">
                            <summary className="cursor-pointer text-sm font-semibold text-primary">Modify item</summary>
                            <form action={updateClinicInventoryItem} className="mt-4 grid gap-3 sm:grid-cols-2">
                              <input type="hidden" name="itemId" value={item.id} />
                              <label className="text-xs font-medium">Supply name<input name="itemName" required defaultValue={item.name} className="mt-1 w-full rounded-xl border bg-white px-3 py-2.5" /></label>
                              <label className="text-xs font-medium">Category<select name="category" defaultValue={item.category || "Other"} className="mt-1 w-full rounded-xl border bg-white px-3 py-2.5">
                                {["Surgical Instruments","Surgery & Sterilization","Anesthesia, Medications & Airway","Vaccines, Testing & Preventive Care","Recovery & Patient Care","Cleaning, PPE & General Supplies","Other"].map((category)=><option key={category}>{category}</option>)}
                              </select></label>
                              <label className="text-xs font-medium">Unit of measure<input name="unit" defaultValue={item.unit} placeholder="e.g. box, dose, each" className="mt-1 w-full rounded-xl border bg-white px-3 py-2.5" /></label>
                              <div className="grid grid-cols-2 gap-3">
                                <label className="text-xs font-medium">Reorder point<input name="reorderPoint" type="number" min="0" step="0.01" defaultValue={item.reorderPoint ?? ""} placeholder="0" className="mt-1 w-full rounded-xl border bg-white px-3 py-2.5" /></label>
                                <label className="text-xs font-medium">Target quantity<input name="targetQuantity" type="number" min="0" step="0.01" defaultValue={item.target ?? ""} placeholder="0" className="mt-1 w-full rounded-xl border bg-white px-3 py-2.5" /></label>
                              </div>
                              <label className="text-xs font-medium">Preferred vendor<input name="vendor" defaultValue={item.vendor} placeholder="Optional" className="mt-1 w-full rounded-xl border bg-white px-3 py-2.5" /></label>
                              <label className="text-xs font-medium">Purchase URL<input name="purchaseUrl" type="url" defaultValue={item.purchaseUrl} placeholder="Optional" className="mt-1 w-full rounded-xl border bg-white px-3 py-2.5" /></label>
                              <label className="text-xs font-medium">Typical unit cost<input name="unitCost" type="number" min="0" step="0.01" defaultValue={item.unitCost ?? ""} placeholder="Optional" className="mt-1 w-full rounded-xl border bg-white px-3 py-2.5" /></label>
                              <label className="text-xs font-medium">Responsible person<input name="responsiblePerson" defaultValue={item.responsiblePerson} className="mt-1 w-full rounded-xl border bg-white px-3 py-2.5" /></label>
                              <label className="text-xs font-medium">Responsible email<input name="responsibleEmail" type="email" defaultValue={item.responsibleEmail} className="mt-1 w-full rounded-xl border bg-white px-3 py-2.5" /></label>
                              <label className="flex items-center gap-2 text-sm"><input name="trackLot" type="checkbox" defaultChecked={item.trackLotExpiration} /> Track lot / expiration</label>
                              <label className="flex items-center gap-2 text-sm"><input name="active" type="checkbox" defaultChecked /> Active</label>
                              <label className="text-xs font-medium sm:col-span-2">Notes<textarea name="notes" rows={2} defaultValue={item.notes} placeholder="Optional notes about this supply" className="mt-1 w-full rounded-xl border bg-white px-3 py-2.5" /></label>
                              <button className="w-fit rounded-full border border-primary px-5 py-2 text-sm font-semibold text-primary sm:col-span-2">Save item changes</button>
                            </form>
                            <form action={deleteClinicInventoryItem} className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4">
                              <input type="hidden" name="itemId" value={item.id} />
                              <p className="text-sm font-semibold text-red-800">Delete item</p>
                              <p className="mt-1 text-xs text-red-700">If this item has transaction history, it will be archived instead of permanently removed so inventory history remains intact.</p>
                              <label className="mt-3 flex items-start gap-2 text-xs text-red-800"><input required name="confirmDelete" type="checkbox" className="mt-0.5" /> I confirm that I want to remove this item from active inventory.</label>
                              <button className="mt-3 rounded-full border border-red-500 px-4 py-2 text-sm font-semibold text-red-700">Delete item</button>
                            </form>
                          </details>
                        )}
                              </div>
                            );
                          })}
                        </div>
                      </details>
                    );
                  })}
                  </div>
                </>
              ) : (
                <p className="text-muted-foreground">No active clinic inventory items are available yet.</p>
              )}
              </section>
            )}

            {section === "training" && (
              <section className="mt-4 rounded-3xl border bg-white p-5 shadow-sm sm:p-7">
                <div className="mb-6">
                  <h2 className="text-2xl font-bold">Clinic Training Resources</h2>
                  <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
                    Choose the training area you need. Tap a button to reveal that section.
                  </p>
                </div>

                <TrainingResourceSections resources={data.trainingResources} />
              </section>
            )}
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
              {data.announcements.length > 0 && (
                <section className="rounded-3xl border bg-white p-7 shadow-sm">
                  <div className="mb-5 flex items-center gap-3">
                    <Megaphone className="h-6 w-6 text-primary" />
                    <h2 className="text-2xl font-bold">Clinic Announcements</h2>
                  </div>
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
                </section>
              )}
              {section === "dates" && (
                <>
                {data.member?.role === "Veterinarian" && (
                  <section className="rounded-3xl border bg-white p-7 shadow-sm">
                    <div className="mb-5 flex items-center gap-3">
                      <CalendarPlus className="h-6 w-6 text-primary" />
                      <h2 className="text-2xl font-bold">Choose Clinic Dates</h2>
                    </div>
                    <p className="max-w-3xl text-sm text-muted-foreground">
                      Add the Wednesday or Saturday dates you are available to serve as the veterinarian. Submit dates as far ahead as your schedule allows. Once a date is submitted, the Vet Tech signup round begins.
                    </p>
                    <div className="mt-3 max-w-3xl space-y-1 text-sm text-muted-foreground">
                      <p><span className="font-semibold text-foreground">Full-day clinics:</span> Check-in starts at 8:00 AM. The clinic day ends at approximately 6:00 PM.</p>
                      <p><span className="font-semibold text-foreground">Half-day clinics:</span> 5 hours from check-in to check out, typically 9:00 AM–2:00 PM.</p>
                      <p>Wednesdays are always half days.</p>
                      <p>Saturdays may be scheduled as either full or half days, and a Saturday may also be shared by two veterinarians with separate morning (7:00 AM–11:00 AM) and afternoon (11:00 AM–5:00 PM) half-day coverage.</p>
                    </div>
  
                    <VeterinarianDateForm action={submitVeterinarianPreference} />
  
                    {data.vetPreferences.length > 0 && (
                      <div className="mt-5">
                        <h3 className="text-sm font-semibold">My submitted dates</h3>
                        <div className="mt-3 grid gap-3 md:grid-cols-2">
                          {data.vetPreferences.map((preference) => (
                            <div key={preference.id} className="rounded-2xl border bg-white p-4">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="font-semibold">{formatDate(preference.preferredDate)}</p>
                                  <p className="mt-1 text-sm text-muted-foreground">
                                    {preference.clinicType || "Full Day"}
                                    {preference.startTime && preference.endTime ? ` · ${preference.startTime}–${preference.endTime}` : ""}
                                  </p>
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
                          <div className="grid gap-4 lg:grid-cols-[minmax(220px,0.8fr)_minmax(0,2.2fr)] lg:items-start">
                            <div>
                              <p className="text-lg font-semibold">{formatDate(item.clinic?.date || "")}</p>
                              <p className="mt-1 text-sm text-muted-foreground">
                                {item.clinic?.type || "Clinic"} · {item.clinic?.stage || "Scheduling"}
                              </p>
                              {item.clinic?.startTime && item.clinic?.endTime && (
                                <p className="mt-1 text-sm text-muted-foreground">
                                  {formatClinicTime(item.clinic.startTime)} – approx. {formatClinicTime(item.clinic.endTime)}
                                </p>
                              )}
                              {item.clinic?.alert && <p className="mt-2 text-sm font-medium text-primary">{item.clinic.alert}</p>}
                            </div>
                            <div className="grid gap-3 sm:grid-cols-[minmax(0,1.35fr)_minmax(240px,0.85fr)]">
                              <div className={`rounded-xl border bg-white p-4 ${(!item.initialResponse || item.initialResponse === "No Response" || (data.member?.role === "Clinic Volunteer" && item.initialResponse === "Yes" && item.assignments.length === 0) || Boolean(item.responseClinicDate && item.responseClinicDate !== item.clinic?.date.slice(0, 10))) ? "portal-action-glow" : ""}`}>
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
                                  <form id={`clinic-role-${item.responseId}`} action={saveClinicAssignments} className="mt-4 border-t pt-4">
                                    <input type="hidden" name="responseId" value={item.responseId} />
                                    <p className="mb-1 text-sm font-semibold">Select your clinic role</p>
                                    <p className="mb-3 text-xs text-muted-foreground">Choose one specialized role when possible. Select more than one only when additional coverage is needed.</p>
                                    <div className="space-y-2 text-sm">
                                      {data.member.skills.includes("Front Room System") && <label className="flex items-start gap-2"><input type="checkbox" name="assignments" value="Front Room System" defaultChecked={item.assignments.includes("Front Room System")} className="mt-0.5" /><span>Front Room System{data.teamDates.find((date) => date.id === item.clinic?.id)?.volunteerAssignments["Front Room System"]?.length ? <span className="ml-1 text-xs text-muted-foreground">· covered by {data.teamDates.find((date) => date.id === item.clinic?.id)?.volunteerAssignments["Front Room System"].join(", ")}</span> : <span className="ml-1 text-xs font-semibold text-primary">· needed</span>}</span></label>}
                                      {data.member.skills.includes("Back Room System") && <label className="flex items-start gap-2"><input type="checkbox" name="assignments" value="Back Room System" defaultChecked={item.assignments.includes("Back Room System")} className="mt-0.5" /><span>Back Room System{data.teamDates.find((date) => date.id === item.clinic?.id)?.volunteerAssignments["Back Room System"]?.length ? <span className="ml-1 text-xs text-muted-foreground">· covered by {data.teamDates.find((date) => date.id === item.clinic?.id)?.volunteerAssignments["Back Room System"].join(", ")}</span> : <span className="ml-1 text-xs font-semibold text-primary">· needed</span>}</span></label>}
                                      {data.member.skills.includes("Autoclave") && <label className="flex items-start gap-2"><input type="checkbox" name="assignments" value="Autoclave" defaultChecked={item.assignments.includes("Autoclave")} className="mt-0.5" /><span>Autoclave{data.teamDates.find((date) => date.id === item.clinic?.id)?.volunteerAssignments["Autoclave"]?.length ? <span className="ml-1 text-xs text-muted-foreground">· covered by {data.teamDates.find((date) => date.id === item.clinic?.id)?.volunteerAssignments["Autoclave"].join(", ")}</span> : <span className="ml-1 text-xs font-semibold text-primary">· needed</span>}</span></label>}
                                      {data.member.skills.includes("General Support") && <label className="flex items-center gap-2"><input type="checkbox" name="assignments" value="General Volunteer" defaultChecked={item.assignments.includes("General Volunteer")} /> General Volunteer</label>}
                                    </div>
                                    {item.assignments.length > 0 && <p className="mt-2 text-xs font-semibold text-green-700">Current role: {item.assignments.join(", ")}</p>}
                                  </form>
                                )}

                                {data.member?.role === "Clinic Volunteer" && item.initialResponse === "Yes" && (
                                  <div className="mt-3 flex flex-wrap items-start gap-3">
                                    <button form={`clinic-role-${item.responseId}`} type="submit" className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white">Save role</button>
                                    <details className="w-fit">
                                    <summary className="inline-flex cursor-pointer list-none items-center rounded-full border border-primary px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/5 [&::-webkit-details-marker]:hidden">
                                      My shift note
                                    </summary>
                                    <form action={saveClinicNote} className="mt-3 rounded-2xl border bg-slate-50 p-4">
                                      <input type="hidden" name="responseId" value={item.responseId} />
                                      <label htmlFor={`clinic-note-${item.responseId}`} className="block text-sm font-semibold">My shift note</label>
                                      <p className="mt-1 text-xs text-muted-foreground">Share timing or coverage details, such as needing to leave early. Your note appears on this clinic day’s staffing card.</p>
                                      <textarea id={`clinic-note-${item.responseId}`} name="note" rows={2} maxLength={1000} defaultValue={item.notes} className="mt-2 w-full rounded-xl border bg-white px-3 py-2 text-sm" placeholder="Example: I need to leave by 2:00 p.m." />
                                      <button type="submit" className="mt-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white">Save note</button>
                                    </form>
                                    </details>
                                  </div>
                                )}
                              </div>
  
                              {item.initialResponse !== "No" && (
                                <form action={saveReconfirmation} className={`rounded-xl border bg-white p-4 ${(daysUntilClinic(item.clinic?.date || "") <= 7 && item.initialResponse === "Yes" && (!item.reconfirmation || item.reconfirmation === "Awaiting Response")) ? "portal-action-glow" : ""}`}>
                                  <fieldset disabled={item.initialResponse !== "Yes" || daysUntilClinic(item.clinic?.date || "") > 7 || Boolean(item.responseClinicDate && item.responseClinicDate !== item.clinic?.date.slice(0, 10))} className="disabled:opacity-50">
                                    <input type="hidden" name="responseId" value={item.responseId} />
                                    <p className="mb-2 text-sm font-semibold">Reconfirm attendance</p>
                                    <div className="flex flex-wrap gap-2">
                                      <button name="reconfirmation" value="Yes, still attending" className="rounded-full border px-3 py-1.5 text-sm font-medium hover:bg-primary/5">Still attending</button>
                                      <button name="reconfirmation" value="No, can no longer attend" className="rounded-full border px-3 py-1.5 text-sm font-medium hover:bg-primary/5">Can’t attend</button>
                                    </div>
                                    <p className={`mt-2 text-xs ${item.reconfirmation && item.reconfirmation !== "Awaiting Response" ? "font-semibold text-green-700" : "text-muted-foreground"}`}>Current: {item.reconfirmation || "Awaiting response"}</p>
                                    {daysUntilClinic(item.clinic?.date || "") > 7 && item.initialResponse === "Yes" && <p className="mt-2 text-xs text-muted-foreground">Reconfirmation opens one week before the clinic.</p>}
                                  </fieldset>
                                </form>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No upcoming clinic dates are currently assigned to you.</p>
                  )}
                </section>
                </>
              )}

              <div className="flex flex-col gap-6">
                {section === "staffing" && (
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
                                {date.startTime && date.endTime && (
                                  <p className="mt-1 text-sm text-muted-foreground">
                                    {formatClinicTime(date.startTime)} – approx. {formatClinicTime(date.endTime)}
                                  </p>
                                )}
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
                              <div className="sm:col-span-3">
                                <span className="block text-xs text-muted-foreground">General Volunteers</span>
                                <strong>{[
                                  ...(date.volunteerAssignments["Front Room Support"] || []),
                                  ...(date.volunteerAssignments["Surgery/Recovery Floater"] || []),
                                  ...(date.volunteerAssignments["General Volunteer"] || []),
                                ].join(", ") || "None confirmed"}</strong>
                                {date.notes.length > 0 && (
                                  <div className="mt-3 rounded-xl border bg-white p-3">
                                    <p className="text-xs font-semibold text-muted-foreground">Notes for this clinic day</p>
                                    <ul className="mt-2 space-y-2">
                                      {date.notes.map((note, index) => (
                                        <li key={`${note.name}-${index}`} className="whitespace-pre-wrap break-words text-sm"><span className="font-semibold">{note.name}:</span> {note.text}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground">No upcoming clinic dates are currently posted.</p>
                    )}
                  </section>
                )}


              </div>


            </div>
          )}
        </div>
      </section>
    </div>
  );
}
