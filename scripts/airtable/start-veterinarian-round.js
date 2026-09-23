const cfg = input.config();
const clinicId = cfg.clinicId;
const clinicTable = base.getTable("tblJvWn5fh7Rtfp3O");
const memberTable = base.getTable("tblVG88gCVYbRC8Qo");
const responseTable = base.getTable("tblEVlmHvHzItbcVl");

const clinic = await clinicTable.selectRecordAsync(clinicId);
if (!clinic) throw new Error("Clinic date not found");
if (!clinic.getCellValue("Clinic Date")) return; // Daily catch-up handles dates entered after row creation.
if (["Cancelled","Completed"].includes(clinic.getCellValueAsString("Scheduling Stage"))) return;

const staffingSource = clinic.getCellValueAsString("fldumFvbufAkcE4SJ");
const vetPreferences =
  clinic.getCellValue("fld8zF1AWVBrY14XH") ||
  clinic.getCellValue("fldTtrwf64Doa7oWC") ||
  [];
if (staffingSource === "Veterinarian Preference" || vetPreferences.length) {
  return;
}

const members = await memberTable.selectRecordsAsync({
  fields: ["fldetVJrQMMWSEgb4","fld4MiXyflGeHGGvV","fldoDKW5kuprStjDZ"]
});
const responses = await responseTable.selectRecordsAsync({
  fields: ["fldQSpVFW9aL1N2IB","fldcgvpRHyLfhilZ9"]
});

const existingMemberIds = new Set();
for (const record of responses.records) {
  const clinics = record.getCellValue("fldQSpVFW9aL1N2IB") || [];
  if (!clinics.some(x => x.id === clinicId)) continue;
  const team = record.getCellValue("fldcgvpRHyLfhilZ9") || [];
  for (const member of team) existingMemberIds.add(member.id);
}

const veterinarians = members.records.filter(record => {
  const role = record.getCellValueAsString("fldetVJrQMMWSEgb4");
  return role === "Veterinarian" &&
    Boolean(record.getCellValue("fld4MiXyflGeHGGvV")) &&
    Boolean(record.getCellValue("fldoDKW5kuprStjDZ")) &&
    !existingMemberIds.has(record.id);
});

const creates = veterinarians.map(record => ({
  fields: {
    "fldQSpVFW9aL1N2IB": [{id: clinicId}],
    "fldcgvpRHyLfhilZ9": [{id: record.id}],
    "fldFhS8wEchraTk7Y": {name: "No Response"},
    "fldLcBN2h1exkDvSg": {name: "Awaiting Response"},
    "Availability Clinic Date": String(clinic.getCellValue("Clinic Date")).slice(0,10),
    "fldN3ZulqJOCE7hYC": {name: "Unconfirmed"}
  }
}));

while (creates.length) {
  await responseTable.createRecordsAsync(creates.splice(0,50));
}

if (clinic.getCellValue("Volunteer Target") !== 6) {
  await clinicTable.updateRecordAsync(clinicId, {
    "Volunteer Target": 6
  });
}
