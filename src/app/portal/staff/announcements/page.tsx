import Link from "next/link";
import { revalidatePath } from "next/cache";
import { ArrowLeft, Megaphone } from "lucide-react";
import {
  airtableCreate,
  airtableList,
  airtableUpdate,
  asStrings,
  asText,
  requirePortalRole,
  TABLES,
} from "@/lib/portal";

function field(formData: FormData, name: string) {
  return String(formData.get(name) || "").trim();
}

const audiences = ["Volunteer", "Clinic Team", "Staff", "Foster", "All"];
const statuses = ["Draft", "Published", "Archived"];
const priorities = ["Normal", "Important", "Urgent"];

function displayDate(value: unknown) {
  const text = asText(value);
  if (!text) return "No date";
  const date = new Date(text + (text.length === 10 ? "T12:00:00" : ""));
  return Number.isNaN(date.getTime())
    ? text
    : new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

export default async function AnnouncementsPage() {
  await requirePortalRole("Staff");
  const records = await airtableList(
    TABLES.announcements,
    ["Title", "Audience", "Status", "Message", "Publish Date", "Expires", "Priority", "CTA Label", "CTA URL", "Display Order"],
    { sort: [{ field: "Display Order", direction: "asc" }] }
  );

  async function createAnnouncement(formData: FormData) {
    "use server";
    await requirePortalRole("Staff", "write");
    const title = field(formData, "title");
    const message = field(formData, "message");
    const selectedAudiences = formData.getAll("audience").map(String).filter((value) => audiences.includes(value));
    if (!title || !message || !selectedAudiences.length) return;

    const status = field(formData, "status") || "Draft";
    const priority = field(formData, "priority") || "Normal";
    const displayOrderRaw = field(formData, "displayOrder");
    const displayOrder = displayOrderRaw ? Number(displayOrderRaw) : 0;

    await airtableCreate(TABLES.announcements, {
      Title: title,
      Audience: selectedAudiences,
      Status: statuses.includes(status) ? status : "Draft",
      Message: message,
      "Publish Date": field(formData, "publishDate") || null,
      Expires: field(formData, "expires") || null,
      Priority: priorities.includes(priority) ? priority : "Normal",
      "CTA Label": field(formData, "ctaLabel"),
      "CTA URL": field(formData, "ctaUrl"),
      "Display Order": Number.isFinite(displayOrder) ? displayOrder : 0,
    }, true);

    revalidatePath("/portal/staff/announcements");
    revalidatePath("/portal/staff");
    revalidatePath("/portal/volunteer");
    revalidatePath("/portal/clinic");
    revalidatePath("/portal/foster");
  }

  async function updateAnnouncement(formData: FormData) {
    "use server";
    await requirePortalRole("Staff", "write");
    const id = field(formData, "id");
    const title = field(formData, "title");
    const message = field(formData, "message");
    const selectedAudiences = formData.getAll("audience").map(String).filter((value) => audiences.includes(value));
    if (!id || !title || !message || !selectedAudiences.length) return;

    const status = field(formData, "status") || "Draft";
    const priority = field(formData, "priority") || "Normal";
    const displayOrderRaw = field(formData, "displayOrder");
    const displayOrder = displayOrderRaw ? Number(displayOrderRaw) : 0;

    await airtableUpdate(TABLES.announcements, id, {
      Title: title,
      Audience: selectedAudiences,
      Status: statuses.includes(status) ? status : "Draft",
      Message: message,
      "Publish Date": field(formData, "publishDate") || null,
      Expires: field(formData, "expires") || null,
      Priority: priorities.includes(priority) ? priority : "Normal",
      "CTA Label": field(formData, "ctaLabel"),
      "CTA URL": field(formData, "ctaUrl"),
      "Display Order": Number.isFinite(displayOrder) ? displayOrder : 0,
    }, true);

    revalidatePath("/portal/staff/announcements");
    revalidatePath("/portal/staff");
    revalidatePath("/portal/volunteer");
    revalidatePath("/portal/clinic");
    revalidatePath("/portal/foster");
  }

  return (
    <main className="min-h-[calc(100vh-5rem)] bg-slate-50">
      <section className="container-custom py-8 md:py-10">
        <div className="mx-auto max-w-7xl">
          <Link href="/portal/staff" className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline">
            <ArrowLeft className="h-4 w-4" /> Staff Portal
          </Link>

          <header className="mb-8">
            <p className="mb-2 text-sm font-semibold uppercase tracking-[0.18em] text-primary">Operations</p>
            <h1 className="text-4xl font-bold tracking-tight md:text-5xl">Announcements</h1>
            <p className="mt-3 max-w-3xl text-muted-foreground">
              Create and manage portal announcements for volunteers, clinic team members, staff, fosters, or everyone. Published announcements appear only during their active date range.
            </p>
          </header>

          <div className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
            <section className="rounded-3xl border bg-white p-6 shadow-sm">
              <div className="mb-5 flex items-center gap-3">
                <Megaphone className="h-6 w-6 text-primary" />
                <h2 className="text-2xl font-bold">Existing Announcements</h2>
              </div>

              <div className="space-y-4">
                {records.length ? records.map((record) => {
                  const currentAudiences = asStrings(record.fields.Audience);
                  const status = asText(record.fields.Status) || "Draft";
                  const priority = asText(record.fields.Priority) || "Normal";
                  return (
                    <details key={record.id} className="rounded-2xl border bg-slate-50 p-5">
                      <summary className="cursor-pointer list-none">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="font-bold">{asText(record.fields.Title) || "Untitled announcement"}</h3>
                              <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold">{status}</span>
                              {priority !== "Normal" && <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">{priority}</span>}
                            </div>
                            <p className="mt-2 text-sm text-muted-foreground">{currentAudiences.join(", ") || "No audience selected"}</p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              Publish: {displayDate(record.fields["Publish Date"])} · Expires: {displayDate(record.fields.Expires)}
                            </p>
                          </div>
                          <span className="text-sm font-semibold text-primary">Edit</span>
                        </div>
                      </summary>

                      <form action={updateAnnouncement} className="mt-5 space-y-4 border-t pt-5">
                        <input type="hidden" name="id" value={record.id} />
                        <label className="block text-sm font-medium">Title
                          <input name="title" required defaultValue={asText(record.fields.Title)} className="mt-1 w-full rounded-xl border bg-white px-3 py-2.5" />
                        </label>
                        <label className="block text-sm font-medium">Message
                          <textarea name="message" required rows={5} defaultValue={asText(record.fields.Message)} className="mt-1 w-full rounded-xl border bg-white px-3 py-2.5" />
                        </label>
                        <fieldset>
                          <legend className="text-sm font-medium">Audience</legend>
                          <div className="mt-2 flex flex-wrap gap-3">
                            {audiences.map((audience) => (
                              <label key={audience} className="flex items-center gap-2 text-sm">
                                <input name="audience" value={audience} type="checkbox" defaultChecked={currentAudiences.includes(audience)} /> {audience}
                              </label>
                            ))}
                          </div>
                        </fieldset>
                        <div className="grid gap-4 md:grid-cols-2">
                          <label className="text-sm font-medium">Status
                            <select name="status" defaultValue={status} className="mt-1 w-full rounded-xl border bg-white px-3 py-2.5">
                              {statuses.map((item) => <option key={item}>{item}</option>)}
                            </select>
                          </label>
                          <label className="text-sm font-medium">Priority
                            <select name="priority" defaultValue={priority} className="mt-1 w-full rounded-xl border bg-white px-3 py-2.5">
                              {priorities.map((item) => <option key={item}>{item}</option>)}
                            </select>
                          </label>
                          <label className="text-sm font-medium">Publish date
                            <input name="publishDate" type="date" defaultValue={asText(record.fields["Publish Date"])} className="mt-1 w-full rounded-xl border bg-white px-3 py-2.5" />
                          </label>
                          <label className="text-sm font-medium">Expiration date
                            <input name="expires" type="date" defaultValue={asText(record.fields.Expires)} className="mt-1 w-full rounded-xl border bg-white px-3 py-2.5" />
                          </label>
                          <label className="text-sm font-medium">Button label
                            <input name="ctaLabel" defaultValue={asText(record.fields["CTA Label"])} placeholder="Optional" className="mt-1 w-full rounded-xl border bg-white px-3 py-2.5" />
                          </label>
                          <label className="text-sm font-medium">Button URL
                            <input name="ctaUrl" type="url" defaultValue={asText(record.fields["CTA URL"])} placeholder="Optional" className="mt-1 w-full rounded-xl border bg-white px-3 py-2.5" />
                          </label>
                          <label className="text-sm font-medium">Display order
                            <input name="displayOrder" type="number" step="1" defaultValue={typeof record.fields["Display Order"] === "number" ? String(record.fields["Display Order"]) : "0"} className="mt-1 w-full rounded-xl border bg-white px-3 py-2.5" />
                          </label>
                        </div>
                        <button className="rounded-full bg-primary px-5 py-2.5 font-semibold text-white">Save announcement</button>
                      </form>
                    </details>
                  );
                }) : <p className="text-sm text-muted-foreground">No announcements have been created yet.</p>}
              </div>
            </section>

            <section className="h-fit rounded-3xl border bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-bold">Create Announcement</h2>
              <p className="mt-2 text-sm text-muted-foreground">Start as a draft or publish immediately. Use an expiration date when the message should disappear automatically.</p>

              <form action={createAnnouncement} className="mt-5 space-y-4">
                <label className="block text-sm font-medium">Title
                  <input name="title" required className="mt-1 w-full rounded-xl border px-3 py-2.5" />
                </label>
                <label className="block text-sm font-medium">Message
                  <textarea name="message" required rows={5} className="mt-1 w-full rounded-xl border px-3 py-2.5" />
                </label>
                <fieldset>
                  <legend className="text-sm font-medium">Audience</legend>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {audiences.map((audience) => (
                      <label key={audience} className="flex items-center gap-2 text-sm">
                        <input name="audience" value={audience} type="checkbox" /> {audience}
                      </label>
                    ))}
                  </div>
                </fieldset>
                <div className="grid grid-cols-2 gap-3">
                  <label className="text-sm font-medium">Status
                    <select name="status" defaultValue="Draft" className="mt-1 w-full rounded-xl border bg-white px-3 py-2.5">
                      {statuses.map((item) => <option key={item}>{item}</option>)}
                    </select>
                  </label>
                  <label className="text-sm font-medium">Priority
                    <select name="priority" defaultValue="Normal" className="mt-1 w-full rounded-xl border bg-white px-3 py-2.5">
                      {priorities.map((item) => <option key={item}>{item}</option>)}
                    </select>
                  </label>
                </div>
                <label className="block text-sm font-medium">Publish date
                  <input name="publishDate" type="date" className="mt-1 w-full rounded-xl border px-3 py-2.5" />
                </label>
                <label className="block text-sm font-medium">Expiration date
                  <input name="expires" type="date" className="mt-1 w-full rounded-xl border px-3 py-2.5" />
                </label>
                <label className="block text-sm font-medium">Button label
                  <input name="ctaLabel" placeholder="Optional" className="mt-1 w-full rounded-xl border px-3 py-2.5" />
                </label>
                <label className="block text-sm font-medium">Button URL
                  <input name="ctaUrl" type="url" placeholder="Optional" className="mt-1 w-full rounded-xl border px-3 py-2.5" />
                </label>
                <label className="block text-sm font-medium">Display order
                  <input name="displayOrder" type="number" step="1" defaultValue="0" className="mt-1 w-full rounded-xl border px-3 py-2.5" />
                </label>
                <button className="rounded-full bg-primary px-5 py-2.5 font-semibold text-white">Create Announcement</button>
              </form>
            </section>
          </div>
        </div>
      </section>
    </main>
  );
}
