const CLINICDAY_BASE_ID = "app3AcoD2G64aMsEz";
const CLINICDAY_TABLE_ID = "tblnOw4Qr5AvCRWvQ";
const SHELTER_BASE_ID = "app2vpch2JJVrP9pu";
const SHELTER_TABLE_ID = "tblJvWn5fh7Rtfp3O";
const DEFAULT_VOLUNTEER_TARGET = 5;

async function airtableList(baseId, tableId, fields) {
  const token = process.env.AIRTABLE_ACCESS_TOKEN;
  if (!token) throw new Error("AIRTABLE_ACCESS_TOKEN is missing");

  const records = [];
  let offset;
  do {
    const params = new URLSearchParams();
    params.set("pageSize", "100");
    for (const field of fields) params.append("fields[]", field);
    if (offset) params.set("offset", offset);

    const response = await fetch(
      `https://api.airtable.com/v0/${baseId}/${tableId}?${params.toString()}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const data = await response.json();
    if (!response.ok) throw new Error(`Airtable read failed: ${JSON.stringify(data)}`);

    records.push(...(data.records || []));
    offset = data.offset;
  } while (offset);

  return records;
}

async function airtableCreate(fields) {
  const token = process.env.AIRTABLE_ACCESS_TOKEN;
  const response = await fetch(
    `https://api.airtable.com/v0/${SHELTER_BASE_ID}/${SHELTER_TABLE_ID}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ records: [{ fields }] }),
    }
  );
  const data = await response.json();
  if (!response.ok) throw new Error(`Airtable create failed: ${JSON.stringify(data)}`);
  return data.records?.[0];
}

async function airtableUpdate(recordId, fields) {
  const token = process.env.AIRTABLE_ACCESS_TOKEN;
  const response = await fetch(
    `https://api.airtable.com/v0/${SHELTER_BASE_ID}/${SHELTER_TABLE_ID}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ records: [{ id: recordId, fields }] }),
    }
  );
  const data = await response.json();
  if (!response.ok) throw new Error(`Airtable update failed: ${JSON.stringify(data)}`);
  return data.records?.[0];
}

function shelterClinicType(dateText) {
  const day = new Date(`${dateText}T12:00:00`).getDay();
  if (day === 3) return "Wednesday";
  if (day === 6) return "Saturday";
  return "Other";
}

export default async () => {
  const now = new Date();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  const [clinicDayRecords, shelterRecords] = await Promise.all([
    airtableList(CLINICDAY_BASE_ID, CLINICDAY_TABLE_ID, [
      "Clinic_Date",
      "Clinic Type",
      "Clinic Day Status",
    ]),
    airtableList(SHELTER_BASE_ID, SHELTER_TABLE_ID, [
      "ClinicDay Record ID",
      "Clinic Date",
      "Clinic Type",
      "ClinicDay Session Type",
      "Scheduling Stage",
      "Synced from ClinicDay",
      "Last ClinicDay Sync",
    ]),
  ]);

  const existingBySourceId = new Map(
    shelterRecords
      .filter((record) => record.fields?.["ClinicDay Record ID"])
      .map((record) => [record.fields["ClinicDay Record ID"], record])
  );

  let created = 0;
  let updated = 0;

  for (const record of clinicDayRecords) {
    const date = record.fields?.Clinic_Date;
    const status = record.fields?.["Clinic Day Status"];
    const sessionType = record.fields?.["Clinic Type"];

    if (!date || !["Scheduled", "Active"].includes(status)) continue;
    if (new Date(`${date}T23:59:59`) < today) continue;

    const fields = {
      "Clinic Date": date,
      "Clinic Type": shelterClinicType(date),
      "ClinicDay Session Type": sessionType || undefined,
      "ClinicDay Record ID": record.id,
      "Synced from ClinicDay": true,
      "Last ClinicDay Sync": new Date().toISOString(),
    };

    Object.keys(fields).forEach((key) => fields[key] === undefined && delete fields[key]);

    const existing = existingBySourceId.get(record.id);
    if (existing) {
      await airtableUpdate(existing.id, fields);
      updated += 1;
    } else {
      await airtableCreate({
        ...fields,
        "Scheduling Stage": "Proposed",
        "Volunteer Target": DEFAULT_VOLUNTEER_TARGET,
      });
      created += 1;
    }
  }

  return new Response(
    JSON.stringify({ ok: true, created, updated }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
};

export const config = {
  schedule: "0 */6 * * *",
};
