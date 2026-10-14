import "server-only";

/** Read-only adapter to ClinicDay. This module must never be imported by client components. */
const BASE_ID = "app3AcoD2G64aMsEz";
const CASES_TABLE = "tblOz2F29cXimUoMY";
const DAYS_TABLE = "tblnOw4Qr5AvCRWvQ";

type Row = { id: string; fields: Record<string, unknown> };
const string = (x: unknown): string =>
  x == null ? "" : Array.isArray(x) ? x.map(string).filter(Boolean).join(", ") : String(x);
const ids = (x: unknown): string[] =>
  Array.isArray(x) ? x.filter((v): v is string => typeof v === "string") : [];

async function readRows(table: string, fields: readonly string[]): Promise<Row[]> {
  const token = process.env.CLINICDAY_AIRTABLE_TOKEN;
  if (!token) {
    throw new Error("ClinicDay is not connected. Configure a server-only CLINICDAY_AIRTABLE_TOKEN with read-only access to the ClinicDay base.");
  }
  const results: Row[] = [];
  let offset: string | undefined;
  do {
    const query = new URLSearchParams({ pageSize: "100" });
    for (const field of fields) query.append("fields[]", field);
    if (offset) query.set("offset", offset);
    const response = await fetch(
      `https://api.airtable.com/v0/${BASE_ID}/${table}?${query.toString()}`,
      { headers: { Authorization: `Bearer ${token}` }, cache: "no-store", signal: AbortSignal.timeout(18000) }
    );
    if (!response.ok) throw new Error(`ClinicDay data connection failed (HTTP ${response.status}). Confirm read access to the Cases and Clinic Days tables.`);
    const payload = (await response.json()) as { records: Row[]; offset?: string };
    results.push(...payload.records);
    offset = payload.offset;
    if (results.length > 10000) throw new Error("ClinicDay record limit exceeded. Narrow the date range before printing.");
  } while (offset);
  return results;
}

export type ClinicDayOption = { id: string; date: string; type: string; status: string };
export type CageCard = {
  id: string; clinicIds: string[]; caseNumber: string; name: string; sex: string; species: string;
  breed: string; client: string; handling: string; lifestyle: string; pregnant: string;
  earTip: boolean; services: string[]; arrival: string;
};

export async function loadClinicDayCageCards(): Promise<{ days: ClinicDayOption[]; cards: CageCard[] }> {
  const [days, cases] = await Promise.all([
    readRows(DAYS_TABLE, ["Clinic_Date", "Clinic Type", "Clinic Day Status"]),
    readRows(CASES_TABLE, [
      "Case_ID", "Pet Name", "Species", "Sex", "Color/Breed of Animal",
      "Client_Cage_Card_Display", "Handling Level", "Clinic Day", "Arrival_Status",
      "Is this cat a Indoor, Indoor/Outdoor or Outdoor cat?",
      "Is there a chance that your cat may be pregnant?", "Ear Tip", "Service Codes",
    ]),
  ]);
  return {
    days: days.map(r => ({
      id: r.id, date: string(r.fields.Clinic_Date).slice(0, 10),
      type: string(r.fields["Clinic Type"]), status: string(r.fields["Clinic Day Status"]),
    })).filter(r => r.date).sort((a, b) => a.date.localeCompare(b.date)),
    cards: cases.map(r => {
      const f = r.fields;
      const ear = string(f["Ear Tip"]).trim();
      return {
        id: r.id, clinicIds: ids(f["Clinic Day"]), caseNumber: string(f.Case_ID),
        name: string(f["Pet Name"]) || "Unnamed patient", species: string(f.Species),
        sex: string(f.Sex), breed: string(f["Color/Breed of Animal"]),
        client: string(f["Client_Cage_Card_Display"]), handling: string(f["Handling Level"]),
        lifestyle: string(f["Is this cat a Indoor, Indoor/Outdoor or Outdoor cat?"]),
        pregnant: string(f["Is there a chance that your cat may be pregnant?"]),
        earTip: Boolean(ear) && !/^(no|none|not required|false|0)$/i.test(ear),
        services: string(f["Service Codes"]).split(/,\s*|\n/).map(x => x.trim()).filter(Boolean),
        arrival: string(f.Arrival_Status),
      };
    }),
  };
}
