import Link from "next/link";
import { revalidatePath } from "next/cache";
import { Activity, AlertCircle, ArrowLeft, ClipboardPlus, Pill, Stethoscope } from "lucide-react";
import {
  airtableCreate,
  airtableUpdate,
  getMedicalPortalData,
  requirePortalRole,
  TABLES,
} from "@/lib/portal";

function formatDateTime(value: string) {
  if (!value) return "Date not recorded";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Chicago",
  }).format(new Date(value));
}

function MedicalRecordCard({ record }: { record: Awaited<ReturnType<typeof getMedicalPortalData>>["records"][number] }) {
  return (
    <article className="rounded-2xl border bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold">{record.animal?.name || "Animal not linked"}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {record.recordType || "Medical entry"} · {formatDateTime(record.dateTime)}
          </p>
        </div>
        {record.needsVeterinarianReview && (
          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            {record.veterinaryReviewStatus || "Pending Review"}
          </span>
        )}
      </div>
      <div className="mt-4 space-y-2 text-sm leading-relaxed">
        {record.reason && <p><strong>Concern:</strong> {record.reason}</p>}
        {record.assessment && <p><strong>Assessment:</strong> {record.assessment}</p>}
        {record.treatment && <p><strong>Treatment:</strong> {record.treatment}</p>}
        {record.medication && <p><strong>Medication:</strong> {record.medication}{record.dose ? ` · ${record.dose}` : ""}</p>}
        {record.vaccine && <p><strong>Vaccine / preventative:</strong> {record.vaccine}</p>}
        {record.notes && <p><strong>Notes:</strong> {record.notes}</p>}
        {record.followUpDate && <p><strong>Follow-up:</strong> {record.followUpDate}</p>}
      </div>
      <p className="mt-4 text-xs text-muted-foreground">
        Entered by {record.enteredByRole || record.source || "Safe Haven"}{record.provider ? ` · ${record.provider}` : ""}
      </p>
    </article>
  );
}

export default async function MedicalPortalPage() {
  const context = await requirePortalRole("Medical");
  const data = await getMedicalPortalData();

  async function addMedicalEntry(formData: FormData) {
    "use server";
    const current = await requirePortalRole("Medical", "write");
    const latest = await getMedicalPortalData();
    const animalId = String(formData.get("animalId") || "");
    const recordType = String(formData.get("recordType") || "Other");
    const reason = String(formData.get("reason") || "").trim();
    const treatment = String(formData.get("treatment") || "").trim();
    const medication = String(formData.get("medication") || "").trim();
    const dose = String(formData.get("dose") || "").trim();
    const notes = String(formData.get("notes") || "").trim();
    const followUpDate = String(formData.get("followUpDate") || "");
    const needsReview = formData.get("needsReview") === "on";

    if (!latest.animals.some((animal) => animal.id === animalId)) return;
    if (!reason && !treatment && !medication && !notes) return;

    await airtableCreate(TABLES.medicalRecords, {
      Animal: [animalId],
      "Date / Time": new Date().toISOString(),
      "Record Type": recordType,
      Source: "Safe Haven",
      ...(reason ? { "Reason / Complaint": reason } : {}),
      ...(treatment ? { "Treatment / Procedure": treatment } : {}),
      ...(medication ? { "Medication / Product": medication } : {}),
      ...(dose ? { "Dose / Route / Frequency": dose } : {}),
      ...(notes ? { Notes: notes } : {}),
      "Follow-Up Required": Boolean(followUpDate),
      ...(followUpDate ? { "Follow-Up Date": followUpDate } : {}),
      "Needs Veterinarian Review": needsReview,
      ...(needsReview ? { "Veterinary Review Status": "Pending Review" } : {}),
      "Entered By Role": current.canStaff ? "Shelter Staff" : "Veterinarian",
    });

    revalidatePath("/portal/medical");
    revalidatePath("/portal/staff");
  }

  async function updateReviewStatus(formData: FormData) {
    "use server";
    await requirePortalRole("Medical", "write");
    const latest = await getMedicalPortalData();
    const recordId = String(formData.get("recordId") || "");
    const status = String(formData.get("status") || "");
    if (!latest.records.some((record) => record.id === recordId)) return;
    if (!["Reviewed", "Follow-Up Needed", "Resolved"].includes(status)) return;

    await airtableUpdate(TABLES.medicalRecords, recordId, {
      "Veterinary Review Status": status,
      "Needs Veterinarian Review": !["Reviewed", "Resolved"].includes(status),
    });
    revalidatePath("/portal/medical");
    revalidatePath("/portal/staff");
  }

  const activeAnimals = data.animals.filter((animal) => animal.status !== "Adopted");

  return (
    <div className="min-h-[calc(100vh-5rem)] bg-slate-50">
      <section className="container-custom py-10 md:py-12">
        <div className="mx-auto max-w-7xl">
          <Link href="/portal" className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline">
            <ArrowLeft className="h-4 w-4" /> Team Portal
          </Link>

          <div className="mb-10">
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-primary">Safe Haven Medical Care</p>
            <h1 className="text-4xl font-bold tracking-tight md:text-5xl">Medical Portal</h1>
            <p className="mt-4 max-w-3xl text-muted-foreground">
              Review each animal&apos;s medical history, document concerns and treatments, and keep the weekly veterinary review focused on unresolved needs.
            </p>
          </div>

          <section className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border bg-white p-5 shadow-sm">
              <Activity className="mb-3 h-5 w-5 text-primary" />
              <p className="text-3xl font-bold">{activeAnimals.length}</p>
              <p className="mt-1 text-sm text-muted-foreground">Animals in active care</p>
            </div>
            <div className="rounded-2xl border bg-white p-5 shadow-sm">
              <AlertCircle className="mb-3 h-5 w-5 text-primary" />
              <p className="text-3xl font-bold">{data.pendingReview.length}</p>
              <p className="mt-1 text-sm text-muted-foreground">Awaiting medical review</p>
            </div>
            <div className="rounded-2xl border bg-white p-5 shadow-sm">
              <Stethoscope className="mb-3 h-5 w-5 text-primary" />
              <p className="text-3xl font-bold">{data.records.length}</p>
              <p className="mt-1 text-sm text-muted-foreground">Medical history entries</p>
            </div>
          </section>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[0.85fr_1.15fr]">
            <div className="space-y-6">
              <section className="rounded-3xl border bg-white p-7 shadow-sm">
                <div className="mb-5 flex items-center gap-3">
                  <ClipboardPlus className="h-6 w-6 text-primary" />
                  <h2 className="text-2xl font-bold">Record Care</h2>
                </div>
                <form action={addMedicalEntry} className="space-y-4">
                  <label className="block text-sm font-medium">
                    Animal
                    <select name="animalId" required defaultValue="" className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5">
                      <option value="" disabled>Select an animal</option>
                      {activeAnimals.map((animal) => (
                        <option key={animal.id} value={animal.id}>{animal.name}{animal.animalId ? ` · ${animal.animalId}` : ""}</option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-sm font-medium">
                    Entry type
                    <select name="recordType" defaultValue="Other" className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5">
                      {["Exam", "Vaccine", "Preventative", "Medication", "Lab / Test", "Procedure", "Treatment", "Injury / Illness", "Weight Check", "Other"].map((type) => <option key={type}>{type}</option>)}
                    </select>
                  </label>
                  <label className="block text-sm font-medium">Concern or observation<textarea name="reason" rows={3} className="mt-2 w-full rounded-xl border px-3 py-2" /></label>
                  <label className="block text-sm font-medium">Treatment or care provided<textarea name="treatment" rows={3} className="mt-2 w-full rounded-xl border px-3 py-2" /></label>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <label className="block text-sm font-medium">Medication / product<input name="medication" className="mt-2 w-full rounded-xl border px-3 py-2" /></label>
                    <label className="block text-sm font-medium">Dose / route / frequency<input name="dose" className="mt-2 w-full rounded-xl border px-3 py-2" /></label>
                  </div>
                  <label className="block text-sm font-medium">Additional notes<textarea name="notes" rows={2} className="mt-2 w-full rounded-xl border px-3 py-2" /></label>
                  <label className="block text-sm font-medium">Follow-up date<input name="followUpDate" type="date" className="mt-2 w-full rounded-xl border px-3 py-2" /></label>
                  <label className="flex items-start gap-3 rounded-xl bg-slate-50 p-4 text-sm">
                    <input name="needsReview" type="checkbox" className="mt-1" />
                    <span><strong>Needs veterinarian review</strong><span className="mt-1 block text-muted-foreground">Add this entry to the focused queue for the veterinarian&apos;s weekly visit.</span></span>
                  </label>
                  <button type="submit" className="rounded-full bg-primary px-5 py-2.5 font-semibold text-white shadow-sm hover:opacity-90">Save Medical Entry</button>
                </form>
              </section>
            </div>

            <div className="space-y-6">
              <section className="rounded-3xl border bg-white p-7 shadow-sm">
                <div className="mb-5 flex items-center gap-3">
                  <AlertCircle className="h-6 w-6 text-primary" />
                  <h2 className="text-2xl font-bold">Awaiting Review</h2>
                </div>
                {data.pendingReview.length ? (
                  <div className="space-y-4">
                    {data.pendingReview.map((record) => (
                      <div key={record.id}>
                        <MedicalRecordCard record={record} />
                        <form action={updateReviewStatus} className="mt-2 flex flex-wrap gap-2 pl-2">
                          <input type="hidden" name="recordId" value={record.id} />
                          {(["Reviewed", "Follow-Up Needed", "Resolved"] as const).map((status) => (
                            <button key={status} name="status" value={status} className="rounded-full border bg-white px-3 py-1.5 text-xs font-semibold hover:bg-slate-50">{status}</button>
                          ))}
                        </form>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-muted-foreground">No medical entries are awaiting review.</p>}
              </section>

              <section className="rounded-3xl border bg-white p-7 shadow-sm">
                <div className="mb-5 flex items-center gap-3"><Pill className="h-6 w-6 text-primary" /><h2 className="text-2xl font-bold">Recent Medical History</h2></div>
                <div className="space-y-4">
                  {data.records.length ? data.records.slice(0, 30).map((record) => <MedicalRecordCard key={record.id} record={record} />) : <p className="text-muted-foreground">No medical history has been recorded yet.</p>}
                </div>
              </section>
            </div>
          </div>

          {context.canStaff && <p className="mt-8 text-sm text-muted-foreground">A shorter medical overview is also available inside the Staff Portal.</p>}
        </div>
      </section>
    </div>
  );
}
