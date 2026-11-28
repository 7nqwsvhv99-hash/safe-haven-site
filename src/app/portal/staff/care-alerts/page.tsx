import Link from "next/link";
import { revalidatePath } from "next/cache";
import { AlertTriangle, ArrowLeft, CheckCircle2, Clock3 } from "lucide-react";
import { airtableList, airtableUpdate, asStrings, asText, requirePortalRole, TABLES } from "@/lib/portal";

function canManageAlerts(context: Awaited<ReturnType<typeof requirePortalRole>>) {
  return context.isAdministrator || context.roles.includes("Shelter Manager") || context.roles.includes("Executive Director");
}

function fmt(value: unknown) {
  const text = asText(value);
  if (!text) return "Time not recorded";
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return text;
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Chicago" }).format(date);
}

function appendHistory(existing: unknown, entry: string) {
  return [asText(existing), entry].filter(Boolean).join("\n");
}

export default async function CareAlertsPage({ searchParams }: { searchParams: Promise<{ animal?: string; state?: string }> }) {
  const context = await requirePortalRole("Staff");
  const query = await searchParams;
  const records = await airtableList(TABLES.dailyCare, [
    "Animal", "Date / Time", "Care Type", "Completed By", "Alert Level", "Alert Status",
    "Routed Roles", "Assigned Role", "Assigned To", "Acknowledged By", "Acknowledged At",
    "Resolved By", "Resolved At", "Resolution Notes", "Alert History", "Notes / Observation",
    "Follow-Up Date", "Follow-Up Status", "Photo / Attachment",
  ], { sort: [{ field: "Date / Time", direction: "desc" }] });
  const animals = await airtableList(TABLES.animals, ["Pet Name", "Animal ID"]);
  const animalMap = new Map(animals.map((animal) => [animal.id, animal]));
  const allAlerts = records.filter((record) => ["Monitor", "Needs Attention", "Urgent"].includes(asText(record.fields["Alert Level"])) && (!query.animal || asStrings(record.fields.Animal).includes(query.animal)));
  const state = ["resolved", "all"].includes(query.state || "") ? query.state : "open";
  const alertStatus = (record: { fields: Record<string, unknown> }) => asText(record.fields["Alert Status"]) || (asText(record.fields["Follow-Up Status"]) === "Completed" ? "Resolved" : "Open");
  const alerts = allAlerts.filter((record) => state === "all" || (state === "resolved" ? alertStatus(record) === "Resolved" : alertStatus(record) !== "Resolved"));

  async function manageAlert(formData: FormData) {
    "use server";
    const actor = await requirePortalRole("Staff");
    if (!canManageAlerts(actor)) return;
    const recordId = String(formData.get("recordId") || "");
    const action = String(formData.get("action") || "");
    const assignedRole = String(formData.get("assignedRole") || "");
    const assignedTo = String(formData.get("assignedTo") || "").trim();
    const resolutionNotes = String(formData.get("resolutionNotes") || "").trim();
    const allRecords = await airtableList(TABLES.dailyCare, [
      "Animal", "Alert Level", "Alert Status", "Assigned Role", "Assigned To", "Acknowledged By",
      "Acknowledged At", "Resolved By", "Resolved At", "Resolution Notes", "Alert History",
    ]);
    const record = allRecords.find((item) => item.id === recordId);
    if (!record || !["Monitor", "Needs Attention", "Urgent"].includes(asText(record.fields["Alert Level"]))) return;
    const now = new Date().toISOString();
    const history = (entry: string) => appendHistory(record.fields["Alert History"], now + " · " + actor.displayName + " · " + entry);
    if (action === "assign") {
      if (!["Shelter Manager", "Executive Director", "Animal Care Staff"].includes(assignedRole)) return;
      await airtableUpdate(TABLES.dailyCare, recordId, {
        "Assigned Role": assignedRole,
        "Assigned To": assignedTo || null,
        "Alert History": history("Assigned to " + assignedRole + (assignedTo ? " (" + assignedTo + ")" : "") + "."),
      }, true);
    } else if (action === "acknowledge") {
      await airtableUpdate(TABLES.dailyCare, recordId, {
        "Alert Status": "Acknowledged",
        "Acknowledged By": actor.displayName,
        "Acknowledged At": now,
        "Alert History": history("Acknowledged."),
      }, true);
    } else if (action === "resolve") {
      if (!resolutionNotes) return;
      await airtableUpdate(TABLES.dailyCare, recordId, {
        "Alert Status": "Resolved",
        "Resolved By": actor.displayName,
        "Resolved At": now,
        "Resolution Notes": resolutionNotes,
        "Follow-Up Needed": false,
        "Follow-Up Status": "Completed",
        "Alert History": history("Resolved. " + resolutionNotes),
      }, true);
    } else return;
    revalidatePath("/portal/staff/care-alerts");
    for (const animalId of asStrings(record.fields.Animal)) revalidatePath("/portal/staff/animals/" + animalId);
    revalidatePath("/portal/staff/care");
  }

  const management = canManageAlerts(context);
  return (
    <main className="min-h-screen bg-slate-50">
      <div className="container-custom py-10 md:py-12">
        <Link href="/portal/staff" className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"><ArrowLeft className="h-4 w-4" /> Staff Portal</Link>
        <header className="mb-8"><p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-primary">Shelter Operations</p><h1 className="text-4xl font-bold md:text-5xl">Care Alert Review</h1><p className="mt-4 max-w-3xl text-muted-foreground">Shared care concerns routed by urgency. Animal care staff can view every alert; managers and the executive director manage ownership and follow-up.</p></header>
        <div className="mb-6 rounded-2xl border border-orange-200 bg-orange-50 p-4 text-sm text-orange-950">Monitor and Needs Attention alerts route to the Shelter Manager. Urgent alerts route to the Shelter Manager and Executive Director. Animal care staff can see all alerts and their follow-up status.</div>
        <nav className="mb-5 flex flex-wrap gap-2 text-sm font-semibold">
          {(["open", "resolved", "all"] as const).map((value) => <Link key={value} href={"/portal/staff/care-alerts?state=" + value + (query.animal ? "&animal=" + encodeURIComponent(query.animal) : "")} className={"rounded-full border px-4 py-2 " + (state === value ? "border-orange-300 bg-orange-50 text-orange-900" : "bg-white")}>{value === "open" ? "Open (" + allAlerts.filter((r) => alertStatus(r) !== "Resolved").length + ")" : value === "resolved" ? "Resolved (" + allAlerts.filter((r) => alertStatus(r) === "Resolved").length + ")" : "All (" + allAlerts.length + ")"}</Link>)}
        </nav>
        <section className="space-y-4">
          {alerts.length ? alerts.map((record) => {
            const animalId = asStrings(record.fields.Animal)[0] || "";
            const animal = animalMap.get(animalId);
            const level = asText(record.fields["Alert Level"]);
            const files = Array.isArray(record.fields["Photo / Attachment"]) ? record.fields["Photo / Attachment"] as { url?: unknown; filename?: unknown }[] : [];
            return <article id={record.id} key={record.id} className="scroll-mt-28 rounded-3xl border bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div><Link className="text-xl font-bold hover:text-primary" href={"/portal/staff/animals/" + animalId + "#observations"}>{asText(animal?.fields["Pet Name"]) || "Animal"} · {asText(animal?.fields["Animal ID"])}</Link><p className="mt-1 text-sm text-muted-foreground">{asText(record.fields["Care Type"])} · {fmt(record.fields["Date / Time"])} · logged by {asText(record.fields["Completed By"]) || "Staff"}</p></div>
                <span className={"rounded-full px-3 py-1 text-sm font-semibold " + (level === "Urgent" ? "bg-red-100 text-red-800" : level === "Needs Attention" ? "bg-orange-100 text-orange-900" : "bg-amber-100 text-amber-900")}><AlertTriangle className="mr-1 inline h-4 w-4" />{level}</span>
              </div>
              <p className="mt-4 whitespace-pre-wrap">{asText(record.fields["Notes / Observation"])}</p>
              {files.map((file) => typeof file.url === "string" && file.url ? <a key={file.url} href={file.url} target="_blank" rel="noreferrer" className="mt-3 block text-sm font-semibold text-primary hover:underline">{typeof file.filename === "string" ? file.filename : "View attachment"}</a> : null)}
              <div className="mt-4 grid gap-2 rounded-xl bg-slate-50 p-4 text-sm sm:grid-cols-2">
                <p><strong>Status:</strong> {alertStatus(record)}</p><p><strong>Routed roles:</strong> {asStrings(record.fields["Routed Roles"]).join(", ") || "Shelter Manager, Animal Care Staff"}</p>
                <p><strong>Assigned role:</strong> {asText(record.fields["Assigned Role"]) || "Shelter Manager"}</p><p><strong>Assigned to:</strong> {asText(record.fields["Assigned To"]) || "Unassigned individual"}</p>
                {record.fields["Follow-Up Date"] && <p><strong>Follow-up date:</strong> {fmt(record.fields["Follow-Up Date"])}</p>}
                {asText(record.fields["Acknowledged By"]) && <p><strong>Acknowledged:</strong> {asText(record.fields["Acknowledged By"])} · {fmt(record.fields["Acknowledged At"])}</p>}
                {asText(record.fields["Resolved By"]) && <p><strong>Resolved:</strong> {asText(record.fields["Resolved By"])} · {fmt(record.fields["Resolved At"])}</p>}
                {asText(record.fields["Resolution Notes"]) && <p className="sm:col-span-2"><strong>Resolution notes:</strong> {asText(record.fields["Resolution Notes"])}</p>}
              </div>
              {management && <div className="mt-4 grid gap-4 border-t pt-4 lg:grid-cols-2">
                <form action={manageAlert} className="flex flex-wrap items-end gap-2"><input type="hidden" name="recordId" value={record.id}/><input type="hidden" name="action" value="assign"/><label className="min-w-48 flex-1 text-sm font-medium">Assign role<select name="assignedRole" defaultValue={asText(record.fields["Assigned Role"]) || "Shelter Manager"} className="mt-1 w-full rounded-xl border bg-white px-3 py-2.5"><option>Shelter Manager</option><option>Executive Director</option><option>Animal Care Staff</option></select></label><label className="min-w-48 flex-1 text-sm font-medium">Assign to email, optional<input name="assignedTo" type="email" defaultValue={asText(record.fields["Assigned To"])} className="mt-1 w-full rounded-xl border bg-white px-3 py-2.5"/></label><button className="rounded-full border px-4 py-2.5 font-semibold">Save assignment</button></form>
                {asText(record.fields["Alert Status"]) !== "Acknowledged" && <form action={manageAlert}><input type="hidden" name="recordId" value={record.id}/><input type="hidden" name="action" value="acknowledge"/><button className="inline-flex items-center gap-2 rounded-full border px-4 py-2.5 font-semibold"><Clock3 className="h-4 w-4"/>Acknowledge</button></form>}
                <form action={manageAlert} className="flex flex-wrap items-end gap-2"><input type="hidden" name="recordId" value={record.id}/><input type="hidden" name="action" value="resolve"/><label className="min-w-56 flex-1 text-sm font-medium">Resolution notes<textarea name="resolutionNotes" required rows={2} className="mt-1 w-full rounded-xl border bg-white px-3 py-2.5"/></label><button className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 font-semibold text-white"><CheckCircle2 className="h-4 w-4"/>Resolve alert</button></form>
              </div>}
              {asText(record.fields["Alert History"]) && <details className="mt-4"><summary className="cursor-pointer text-sm font-semibold">Action history</summary><pre className="mt-2 whitespace-pre-wrap rounded-xl bg-slate-50 p-4 text-xs">{asText(record.fields["Alert History"])}</pre></details>}
            </article>;
          }) : <div className="rounded-2xl border bg-white p-6 text-muted-foreground">No care alerts match this view.</div>}
        </section>
      </div>
    </main>
  );
}
