import Link from "next/link";
import type { ReactNode } from "react";
import { revalidatePath } from "next/cache";
import {
  ArrowLeft,
  FileCheck2,
  FileText,
  PenLine,
  Upload,
} from "lucide-react";
import {
  airtableCreate,
  airtableList,
  airtableUpdate,
  airtableUploadAttachment,
  asStrings,
  asText,
  requirePortalRole,
  TABLES,
} from "@/lib/portal";

const DOCUMENT_FILE_FIELD_ID = "fldaRwAQYAzhP40Uy";

function value(form: FormData, name: string) {
  return String(form.get(name) || "").trim();
}
function today() {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric", month: "2-digit", day: "2-digit", timeZone: "America/Chicago",
  }).format(new Date());
}
function formatDate(input: unknown) {
  const text = asText(input);
  if (!text) return "";
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return text;
  return new Intl.DateTimeFormat("en-US", {
    month: "short", day: "numeric", year: "numeric", timeZone: "America/Chicago",
  }).format(date);
}
function attachments(input: unknown) {
  if (!Array.isArray(input)) return [];
  return (input as { url?: unknown; filename?: unknown }[])
    .map((item) => ({
      url: typeof item.url === "string" ? item.url : "",
      filename: typeof item.filename === "string" ? item.filename : "Document",
    }))
    .filter((item) => item.url);
}
function Status({ children }: { children: ReactNode }) {
  return <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold">{children || "No status"}</span>;
}

export default async function DocumentsManagementPage() {
  await requirePortalRole("Staff");

  const [documents, animals, adoptions, fosterPlacements, surrenderRequests] = await Promise.all([
    airtableList(TABLES.documents, [
      "Document Type","Status","Animal","Adoption","Foster Placement","Surrender Request",
      "Generated Date","Sent Date","Signed Date","Signed By","Signature Provider",
      "External Document ID","Template / Version","Document File","Notes"
    ], { sort: [{ field: "Generated Date", direction: "desc" }] }),
    airtableList(TABLES.animals, ["Animal ID","Pet Name","Adoption Status"], {
      sort: [{ field: "Pet Name", direction: "asc" }],
    }),
    airtableList(TABLES.adoptions, ["Adoption ID","Adoption Date","Animal"], {
      sort: [{ field: "Adoption Date", direction: "desc" }],
    }),
    airtableList(TABLES.fosterPlacements, ["Foster Placement ID","Animal","Placement Status"], {
      sort: [{ field: "Start Date", direction: "desc" }],
    }),
    airtableList(TABLES.surrenderRequests, ["Owner First Name","Owner Last Name","Animal Name","Status"], {
      sort: [{ field: "Submitted At", direction: "desc" }],
    }),
  ]);

  const animalById = new Map(animals.map((r) => [r.id, r]));
  const unsigned = documents.filter((r) =>
    ["Ready for Signature","Sent"].includes(asText(r.fields.Status))
  );
  const signed = documents.filter((r) => asText(r.fields.Status) === "Signed");
  const drafts = documents.filter((r) => asText(r.fields.Status) === "Draft");

  async function createDocument(formData: FormData) {
    "use server";
    await requirePortalRole("Staff");

    const documentType = value(formData, "documentType");
    if (!documentType) return;

    const animalId = value(formData, "animalId");
    const adoptionId = value(formData, "adoptionId");
    const fosterPlacementId = value(formData, "fosterPlacementId");
    const surrenderRequestId = value(formData, "surrenderRequestId");

    const record = await airtableCreate(TABLES.documents, {
      "Document Type": documentType,
      Status: value(formData, "status") || "Draft",
      ...(animalId ? { Animal: [animalId] } : {}),
      ...(adoptionId ? { Adoption: [adoptionId] } : {}),
      ...(fosterPlacementId ? { "Foster Placement": [fosterPlacementId] } : {}),
      ...(surrenderRequestId ? { "Surrender Request": [surrenderRequestId] } : {}),
      "Generated Date": value(formData, "generatedDate") || today(),
      ...(value(formData, "sentDate") ? { "Sent Date": value(formData, "sentDate") } : {}),
      ...(value(formData, "templateVersion") ? { "Template / Version": value(formData, "templateVersion") } : {}),
      ...(value(formData, "externalDocumentId") ? { "External Document ID": value(formData, "externalDocumentId") } : {}),
      ...(value(formData, "signatureProvider") ? { "Signature Provider": value(formData, "signatureProvider") } : {}),
      ...(value(formData, "notes") ? { Notes: value(formData, "notes") } : {}),
    }, true);

    const file = formData.get("file");
    if (record && file instanceof File && file.size) {
      await airtableUploadAttachment(record.id, DOCUMENT_FILE_FIELD_ID, file, true);
    }

    revalidatePath("/portal/staff/documents");
    if (animalId) revalidatePath("/portal/staff/animals/" + animalId);
  }

  async function updateDocument(formData: FormData) {
    "use server";
    await requirePortalRole("Staff");
    const documentId = value(formData, "documentId");
    const latest = await airtableList(TABLES.documents, ["Status"]);
    if (!latest.some((r) => r.id === documentId)) return;

    const status = value(formData, "status");
    await airtableUpdate(TABLES.documents, documentId, {
      Status: status,
      "Sent Date": value(formData, "sentDate") || null,
      "Signed Date": value(formData, "signedDate") || null,
      "Signed By": value(formData, "signedBy"),
      "Signature Provider": value(formData, "signatureProvider"),
      "External Document ID": value(formData, "externalDocumentId"),
      "Template / Version": value(formData, "templateVersion"),
      Notes: value(formData, "notes"),
    }, true);

    const file = formData.get("file");
    if (file instanceof File && file.size) {
      await airtableUploadAttachment(documentId, DOCUMENT_FILE_FIELD_ID, file, true);
    }

    revalidatePath("/portal/staff/documents");
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="container-custom py-10 md:py-12">
        <Link href="/portal/staff" className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline">
          <ArrowLeft className="h-4 w-4" /> Staff Portal
        </Link>

        <header className="mb-8">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-primary">Records & Agreements</p>
          <h1 className="text-4xl font-bold tracking-tight md:text-5xl">Documents & Agreements</h1>
          <p className="mt-4 max-w-3xl text-muted-foreground">
            Manage formal documents across intake, owner surrender, foster, adoption, volunteering, medical releases, donations, and other Safe Haven workflows from one shared record system.
          </p>
        </header>

        <section className="mb-8 grid gap-4 sm:grid-cols-3">
          {[
            ["Drafts", drafts.length, FileText],
            ["Awaiting signature", unsigned.length, PenLine],
            ["Signed", signed.length, FileCheck2],
          ].map(([label,count,Icon]) => {
            const MetricIcon = Icon as typeof FileText;
            return <div key={String(label)} className="rounded-2xl border bg-white p-5 shadow-sm"><MetricIcon className="mb-3 h-5 w-5 text-primary"/><p className="text-3xl font-bold">{String(count)}</p><p className="mt-1 text-sm text-muted-foreground">{String(label)}</p></div>;
          })}
        </section>

        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-3xl border bg-white p-6 shadow-sm md:p-8">
            <h2 className="text-2xl font-bold">Document Registry</h2>
            <p className="mt-2 text-sm text-muted-foreground">Each record keeps the file and its operational links together.</p>

            <div className="mt-5 space-y-4">
              {documents.map((record) => {
                const linkedAnimals = asStrings(record.fields.Animal).map((id) => animalById.get(id)).filter(Boolean);
                const files = attachments(record.fields["Document File"]);
                return (
                  <details key={record.id} className="rounded-2xl border p-5">
                    <summary className="cursor-pointer list-none">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h3 className="font-bold">{asText(record.fields["Document Type"]) || "Document"}</h3>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {linkedAnimals.length ? linkedAnimals.map((a) => asText(a?.fields["Pet Name"])).join(", ") + " · " : ""}
                            {formatDate(record.fields["Generated Date"]) || "No generated date"}
                          </p>
                        </div>
                        <Status>{asText(record.fields.Status)}</Status>
                      </div>
                    </summary>

                    <div className="mt-5 grid gap-5 border-t pt-5 lg:grid-cols-2">
                      <div className="space-y-3 text-sm">
                        {files.length ? files.map((file) => (
                          <a key={file.url} href={file.url} target="_blank" rel="noopener noreferrer" className="block rounded-xl bg-slate-50 p-4 font-semibold text-primary hover:underline">
                            {file.filename}
                          </a>
                        )) : <p className="rounded-xl bg-slate-50 p-4 text-muted-foreground">No file uploaded yet.</p>}
                        <p><strong>Sent:</strong> {formatDate(record.fields["Sent Date"]) || "Not sent"}</p>
                        <p><strong>Signed:</strong> {formatDate(record.fields["Signed Date"]) || "Not signed"}</p>
                        <p><strong>Signed by:</strong> {asText(record.fields["Signed By"]) || "Not recorded"}</p>
                        <p><strong>Template/version:</strong> {asText(record.fields["Template / Version"]) || "Not recorded"}</p>
                        <p><strong>External document ID:</strong> {asText(record.fields["External Document ID"]) || "Not recorded"}</p>
                      </div>

                      <form action={updateDocument} className="space-y-3 rounded-2xl bg-slate-50 p-5">
                        <input type="hidden" name="documentId" value={record.id}/>
                        <label className="block text-sm font-medium">Status<select name="status" defaultValue={asText(record.fields.Status)} className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5">{["Draft","Ready for Signature","Sent","Signed","Expired","Void"].map((s)=><option key={s}>{s}</option>)}</select></label>
                        <div className="grid gap-3 sm:grid-cols-2"><label className="block text-sm font-medium">Sent date<input name="sentDate" type="date" defaultValue={asText(record.fields["Sent Date"]).slice(0,10)} className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5"/></label><label className="block text-sm font-medium">Signed date<input name="signedDate" type="date" defaultValue={asText(record.fields["Signed Date"]).slice(0,10)} className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5"/></label></div>
                        <input name="signedBy" defaultValue={asText(record.fields["Signed By"])} placeholder="Signed by" className="w-full rounded-xl border bg-white px-3 py-2.5"/>
                        <input name="signatureProvider" defaultValue={asText(record.fields["Signature Provider"])} placeholder="Signature provider" className="w-full rounded-xl border bg-white px-3 py-2.5"/>
                        <input name="externalDocumentId" defaultValue={asText(record.fields["External Document ID"])} placeholder="External document ID" className="w-full rounded-xl border bg-white px-3 py-2.5"/>
                        <input name="templateVersion" defaultValue={asText(record.fields["Template / Version"])} placeholder="Template / version" className="w-full rounded-xl border bg-white px-3 py-2.5"/>
                        <textarea name="notes" rows={3} defaultValue={asText(record.fields.Notes)} placeholder="Notes" className="w-full rounded-xl border bg-white px-3 py-2.5"/>
                        <label className="block text-sm font-medium">Add or replace document file<input name="file" type="file" accept="application/pdf,image/*" className="mt-2 block w-full text-sm"/></label>
                        <button className="rounded-full border border-primary px-4 py-2 text-sm font-semibold text-primary">Save Document</button>
                      </form>
                    </div>
                  </details>
                );
              })}
              {!documents.length && <p className="text-sm text-muted-foreground">No document records have been created yet.</p>}
            </div>
          </section>

          <section className="rounded-3xl border bg-white p-6 shadow-sm md:p-8">
            <div className="mb-5 flex items-center gap-3"><Upload className="h-6 w-6 text-primary"/><div><h2 className="text-2xl font-bold">Create Document Record</h2><p className="text-sm text-muted-foreground">Link the agreement to the record it belongs to and upload the PDF when available.</p></div></div>
            <form action={createDocument} className="space-y-4">
              <label className="block text-sm font-medium">Document type<select name="documentType" required defaultValue="" className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5"><option value="" disabled>Select type</option>{["Adoption Contract","Foster Agreement","Volunteer Waiver","Owner Surrender Agreement","Medical Release","Donation Receipt","Other"].map((s)=><option key={s}>{s}</option>)}</select></label>
              <label className="block text-sm font-medium">Status<select name="status" defaultValue="Draft" className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5">{["Draft","Ready for Signature","Sent","Signed","Expired","Void"].map((s)=><option key={s}>{s}</option>)}</select></label>

              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="mb-3 text-sm font-semibold">Operational links</p>
                <label className="block text-sm font-medium">Animal<select name="animalId" defaultValue="" className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5"><option value="">No animal link</option>{animals.map((a)=><option key={a.id} value={a.id}>{asText(a.fields["Pet Name"])} · {asText(a.fields["Animal ID"])}</option>)}</select></label>
                <label className="mt-3 block text-sm font-medium">Adoption<select name="adoptionId" defaultValue="" className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5"><option value="">No adoption link</option>{adoptions.map((a)=>{const animal=animalById.get(asStrings(a.fields.Animal)[0]);return <option key={a.id} value={a.id}>{asText(a.fields["Adoption ID"])} · {asText(animal?.fields["Pet Name"])||"Animal"}</option>})}</select></label>
                <label className="mt-3 block text-sm font-medium">Foster placement<select name="fosterPlacementId" defaultValue="" className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5"><option value="">No foster placement link</option>{fosterPlacements.map((p)=>{const names=asStrings(p.fields.Animal).map((id)=>asText(animalById.get(id)?.fields["Pet Name"])).filter(Boolean).join(", ");return <option key={p.id} value={p.id}>{asText(p.fields["Foster Placement ID"])} · {names||"Animal"}</option>})}</select></label>
                <label className="mt-3 block text-sm font-medium">Surrender request<select name="surrenderRequestId" defaultValue="" className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5"><option value="">No surrender request link</option>{surrenderRequests.map((r)=><option key={r.id} value={r.id}>{asText(r.fields["Animal Name"])} · {[asText(r.fields["Owner First Name"]),asText(r.fields["Owner Last Name"])].filter(Boolean).join(" ")}</option>)}</select></label>
              </div>

              <label className="block text-sm font-medium">Generated date<input name="generatedDate" type="date" defaultValue={today()} className="mt-2 w-full rounded-xl border px-3 py-2.5"/></label>
              <label className="block text-sm font-medium">Sent date<input name="sentDate" type="date" className="mt-2 w-full rounded-xl border px-3 py-2.5"/></label>
              <input name="templateVersion" placeholder="Template / version" className="w-full rounded-xl border px-3 py-2.5"/>
              <input name="signatureProvider" placeholder="Signature provider, if external" className="w-full rounded-xl border px-3 py-2.5"/>
              <input name="externalDocumentId" placeholder="External document ID" className="w-full rounded-xl border px-3 py-2.5"/>
              <textarea name="notes" rows={3} placeholder="Notes" className="w-full rounded-xl border px-3 py-2.5"/>
              <label className="block text-sm font-medium">Document file<input name="file" type="file" accept="application/pdf,image/*" className="mt-2 block w-full text-sm"/></label>
              <button className="w-full rounded-full bg-primary px-5 py-3 font-semibold text-white">Create Document Record</button>
            </form>
          </section>
        </div>
      </div>
    </main>
  );
}
