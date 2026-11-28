import Link from "next/link";
import { revalidatePath } from "next/cache";
import { AlertTriangle, ArrowLeft, CheckCircle2 } from "lucide-react";
import { airtableList, airtableUpdate, asStrings, asText, requirePortalRole, TABLES } from "@/lib/portal";

function formatDate(value: unknown) {
  const text = asText(value);
  if (!text) return "Date not recorded";
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return text;
  return new Intl.DateTimeFormat("en-US", {
    month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit",
    timeZone: "America/Chicago",
  }).format(date);
}

const levels = ["Urgent", "Needs Attention", "Monitor"];

export default async function CareAlertsPage() {
  const actor = await requirePortalRole("Staff");
  const [care, animals, access] = await Promise.all([
    airtableList(TABLES.dailyCare, [
      "Animal", "Date / Time", "Care Type", "Completed By", "Alert Level",
      "Follow-Up Needed", "Follow-Up Date", "Notes / Observation", "Photo / Attachment", "Follow-Up Status",
    ], { sort: [{ field: "Date / Time", direction: "desc" }] }),
    airtableList(TABLES.animals, ["Pet Name", "Animal ID", "Species"]),
    airtableList(TABLES.portalAccess, ["Email", "Shelter Position", "Active"]),
  ]);
  const profile = access.find((record) => asText(record.fields.Email).toLowerCase() === actor.email.toLowerCase());
  const position = asText(profile?.fields["Shelter Position"]);
  const canResolve = actor.isAdministrator || (actor.roles.includes("Shelter Manager") || actor.roles.includes("Executive Director")) || position === "Animal Welfare Manager";
  const animalById = new Map(animals.map((animal) => [animal.id, animal]));
  const alerts = care.filter((record) =>
    levels.includes(asText(record.fields["Alert Level"])) &&
    asText(record.fields["Follow-Up Status"]) !== "Completed"
  );

  async function resolveAlert(formData: FormData) {
    "use server";
    const current = await requirePortalRole("Staff", "write");
    const staff = await airtableList(TABLES.portalAccess, ["Email", "Shelter Position"]);
    const currentProfile = staff.find((record) => asText(record.fields.Email).toLowerCase() === current.email.toLowerCase());
    const currentPosition = asText(currentProfile?.fields["Shelter Position"]);
    const authorized = current.isAdministrator || (current.roles.includes("Shelter Manager") || current.roles.includes("Executive Director")) || currentPosition === "Animal Welfare Manager";
    if (!authorized) throw new Error("Only shelter management can resolve a care alert.");

    const careId = String(formData.get("careId") || "");
    const latest = await airtableList(TABLES.dailyCare, ["Alert Level", "Follow-Up Status"]);
    const record = latest.find((item) => item.id === careId);
    if (!record || !levels.includes(asText(record.fields["Alert Level"])) || asText(record.fields["Follow-Up Status"]) === "Completed") return;
    await airtableUpdate(TABLES.dailyCare, careId, {
      "Follow-Up Status": "Completed",
      "Follow-Up Needed": false,
    }, true);
    revalidatePath("/portal/staff/care-alerts");
    revalidatePath("/portal/staff/animals");
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="container-custom py-10 md:py-12">
        <Link href="/portal/staff" className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline">
          <ArrowLeft className="h-4 w-4" /> Staff Portal
        </Link>
        <header className="mb-8">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-primary">Animal Care</p>
          <h1 className="text-4xl font-bold tracking-tight md:text-5xl">Care Alerts</h1>
          <p className="mt-4 max-w-3xl text-muted-foreground">A shared queue for animal care staff and management to review observations that need follow-up.</p>
        </header>

        <section className="mb-6 grid gap-4 md:grid-cols-3">
          {levels.map((level) => {
            const count = alerts.filter((record) => asText(record.fields["Alert Level"]) === level).length;
            return <div key={level} className="rounded-2xl border bg-white p-5 shadow-sm"><p className="text-2xl font-bold">{count}</p><p className="mt-1 font-medium">{level}</p></div>;
          })}
        </section>

        <p className="mb-6 rounded-2xl border border-orange-200 bg-orange-50 p-4 text-sm text-orange-950">
          All animal care staff can see this shared queue. Monitor and Needs Attention are routed for Shelter Manager review. Urgent is routed for Shelter Manager and Executive Director review.
        </p>

        <section className="rounded-3xl border bg-white p-6 shadow-sm md:p-8">
          <div className="mb-5 flex items-center gap-3"><AlertTriangle className="h-6 w-6 text-primary" /><div><h2 className="text-2xl font-bold">Open observations</h2><p className="text-sm text-muted-foreground">Review the animal, observation, alert level, and requested follow-up.</p></div></div>
          {alerts.length ? (
            <div className="space-y-4">
              {alerts.map((record) => {
                const animalId = asStrings(record.fields.Animal)[0];
                const animal = animalById.get(animalId);
                const level = asText(record.fields["Alert Level"]);
                const audience = level === "Urgent" ? "Shelter Manager + Executive Director" : "Shelter Manager";
                const files = Array.isArray(record.fields["Photo / Attachment"]) ? record.fields["Photo / Attachment"] as { url?: unknown; filename?: unknown }[] : [];
                return (
                  <article key={record.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <Link href={animalId ? `/portal/staff/animals/${animalId}` : "/portal/staff/animals"} className="font-semibold text-primary hover:underline">
                          {asText(animal?.fields["Pet Name"]) || "Animal"}{asText(animal?.fields["Animal ID"]) ? ` · ${asText(animal?.fields["Animal ID"])}` : ""}
                        </Link>
                        <p className="mt-1 text-sm text-muted-foreground">{asText(record.fields["Care Type"]) || "Observation"} · {formatDate(record.fields["Date / Time"])}{asText(record.fields["Completed By"]) ? ` · Recorded by ${asText(record.fields["Completed By"])}` : ""}</p>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-sm font-semibold ${level === "Urgent" ? "bg-red-100 text-red-900" : level === "Needs Attention" ? "bg-amber-100 text-amber-900" : "bg-slate-200 text-slate-800"}`}>{level}</span>
                    </div>
                    <p className="mt-4 whitespace-pre-wrap text-sm">{asText(record.fields["Notes / Observation"]) || "No observation notes were entered."}</p>
                    <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
                      <span>Review: <strong className="text-slate-900">{audience}</strong></span>
                      {asText(record.fields["Follow-Up Date"]) && <span>Follow-up by {formatDate(record.fields["Follow-Up Date"])}</span>}
                    </div>
                    {files.map((file) => typeof file.url === "string" && file.url ? <a key={file.url} href={file.url} target="_blank" rel="noreferrer" className="mt-3 block text-sm font-semibold text-primary hover:underline">{typeof file.filename === "string" ? file.filename : "View attachment"}</a> : null)}
                    {canResolve ? (
                      <form action={resolveAlert} className="mt-4">
                        <input type="hidden" name="careId" value={record.id} />
                        <button className="inline-flex items-center gap-2 rounded-full border border-primary px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/5"><CheckCircle2 className="h-4 w-4" /> Mark follow-up complete</button>
                      </form>
                    ) : <p className="mt-4 text-sm font-medium text-muted-foreground">Awaiting management review</p>}
                  </article>
                );
              })}
            </div>
          ) : <p className="rounded-2xl bg-slate-50 p-5 text-muted-foreground">No open care alerts right now.</p>}
        </section>
      </div>
    </main>
  );
}
