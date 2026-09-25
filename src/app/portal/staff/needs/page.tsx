import Link from "next/link";
import { revalidatePath } from "next/cache";
import { ArrowLeft, ClipboardList } from "lucide-react";
import { airtableCreate, airtableList, airtableUpdate, asText, requirePortalRole, TABLES } from "@/lib/portal";

function field(formData: FormData, name: string) {
  return String(formData.get(name) || "").trim();
}

export default async function CurrentNeedsPage() {
  await requirePortalRole("Staff");
  const records = await airtableList(
    TABLES.currentNeeds,
    ["Need", "Area", "Status", "Priority", "Details", "Quantity / Goal", "Show to Volunteers", "Publish on Website", "CTA Label", "CTA URL", "Display Order"],
    { sort: [{ field: "Display Order", direction: "asc" }] }
  );

  const active = records.filter((record) => asText(record.fields.Status) === "Active");

  async function addNeed(formData: FormData) {
    "use server";
    await requirePortalRole("Staff", "write");
    const need = field(formData, "need");
    if (!need) return;
    await airtableCreate(TABLES.currentNeeds, {
      Need: need,
      Area: field(formData, "area") || "General",
      Status: "Active",
      Priority: field(formData, "priority") || "Normal",
      Details: field(formData, "details"),
      "Quantity / Goal": field(formData, "goal"),
      "Show to Volunteers": formData.get("showToVolunteers") === "on",
      "Publish on Website": formData.get("publishOnWebsite") === "on",
    }, true);
    revalidatePath("/portal/staff/needs");
    revalidatePath("/portal/staff");
    revalidatePath("/portal/volunteer");
  }

  async function closeNeed(formData: FormData) {
    "use server";
    await requirePortalRole("Staff", "write");
    const id = field(formData, "id");
    if (!id) return;
    await airtableUpdate(TABLES.currentNeeds, id, { Status: "Closed" }, true);
    revalidatePath("/portal/staff/needs");
    revalidatePath("/portal/staff");
    revalidatePath("/portal/volunteer");
  }

  return (
    <main className="min-h-[calc(100vh-5rem)] bg-slate-50">
      <section className="container-custom py-8 md:py-10">
        <div className="mx-auto max-w-6xl">
          <Link href="/portal/staff" className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline">
            <ArrowLeft className="h-4 w-4" /> Staff Portal
          </Link>

          <div className="mb-8">
            <p className="mb-2 text-sm font-semibold uppercase tracking-[0.18em] text-primary">Operations</p>
            <h1 className="text-4xl font-bold tracking-tight">Current Needs</h1>
            <p className="mt-3 max-w-3xl text-muted-foreground">
              Manage supply requests, volunteer help, and other active needs. Share only information that is appropriate for the selected audience.
            </p>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <section className="rounded-3xl border bg-white p-6 shadow-sm">
              <div className="mb-5 flex items-center gap-3">
                <ClipboardList className="h-6 w-6 text-primary" />
                <h2 className="text-2xl font-bold">Active Needs</h2>
              </div>

              <div className="space-y-3">
                {active.length ? active.map((record) => {
                  const priority = asText(record.fields.Priority) || "Normal";
                  return (
                    <div key={record.id} className={`rounded-2xl border p-5 ${["High","Urgent"].includes(priority) ? "border-orange-300 bg-orange-50/50" : "bg-slate-50"}`}>
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-bold">{asText(record.fields.Need)}</h3>
                            <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold">{priority}</span>
                          </div>
                          <p className="mt-2 text-sm text-muted-foreground">
                            {asText(record.fields.Area) || "General"}
                            {asText(record.fields["Quantity / Goal"]) ? ` · ${asText(record.fields["Quantity / Goal"])}` : ""}
                          </p>
                          {asText(record.fields.Details) && <p className="mt-2 text-sm">{asText(record.fields.Details)}</p>}
                          <p className="mt-3 text-xs text-muted-foreground">
                            {record.fields["Show to Volunteers"] ? "Shown to volunteers" : "Internal only"}
                            {record.fields["Publish on Website"] ? " · Marked for public website" : ""}
                          </p>
                        </div>
                        <form action={closeNeed}>
                          <input type="hidden" name="id" value={record.id} />
                          <button className="rounded-full border border-primary px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/5">Mark complete</button>
                        </form>
                      </div>
                    </div>
                  );
                }) : <p className="text-sm text-muted-foreground">No active needs are currently posted.</p>}
              </div>
            </section>

            <section className="h-fit rounded-3xl border bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-bold">Add a Need</h2>
              <p className="mt-2 text-sm text-muted-foreground">Create one clear request and choose where it should appear.</p>

              <form action={addNeed} className="mt-5 space-y-4">
                <label className="block text-sm font-medium">What is needed?
                  <input name="need" required className="mt-1 w-full rounded-xl border px-3 py-2.5" />
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="text-sm font-medium">Area
                    <select name="area" defaultValue="Shelter" className="mt-1 w-full rounded-xl border bg-white px-3 py-2.5">
                      <option>Shelter</option><option>Clinic</option><option>Volunteer</option><option>Fundraising</option><option>General</option>
                    </select>
                  </label>
                  <label className="text-sm font-medium">Priority
                    <select name="priority" defaultValue="Normal" className="mt-1 w-full rounded-xl border bg-white px-3 py-2.5">
                      <option>Normal</option><option>High</option><option>Urgent</option>
                    </select>
                  </label>
                </div>
                <label className="block text-sm font-medium">Quantity or goal
                  <input name="goal" placeholder="Optional" className="mt-1 w-full rounded-xl border px-3 py-2.5" />
                </label>
                <label className="block text-sm font-medium">Details
                  <textarea name="details" rows={4} className="mt-1 w-full rounded-xl border px-3 py-2.5" />
                </label>
                <label className="flex items-center gap-2 text-sm"><input name="showToVolunteers" type="checkbox" /> Show to volunteers</label>
                <label className="flex items-center gap-2 text-sm"><input name="publishOnWebsite" type="checkbox" /> Mark for public website</label>
                <button className="rounded-full bg-primary px-5 py-2.5 font-semibold text-white">Add Current Need</button>
              </form>
            </section>
          </div>
        </div>
      </section>
    </main>
  );
}
