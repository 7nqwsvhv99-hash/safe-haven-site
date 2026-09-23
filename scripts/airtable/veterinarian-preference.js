
const cfg = input.config();
const preferenceId = cfg.preferenceId;

const preferenceTable = base.getTable("tblZ9DrQNMTKgvDbw");
const clinicTable = base.getTable("tblJvWn5fh7Rtfp3O");
const memberTable = base.getTable("tblVG88gCVYbRC8Qo");
const responseTable = base.getTable("tblEVlmHvHzItbcVl");

const preference = await preferenceTable.selectRecordAsync(preferenceId);
if (!preference) return;

const status = preference.getCellValueAsString("fldNOP6jNztALLcG6");
if (status && status !== "Submitted") return;

const vetLinks = preference.getCellValue("fldxb1bKKOynfgqAm") || [];
const preferredDate = preference.getCellValue("fldKSgyd03tNMRXYb");
const preferredClinicType = preference.getCellValueAsString("fld9kccB52tqETUgM") || "Full Day";
if (!vetLinks.length || !preferredDate) return;

const vetId = vetLinks[0].id;
const date = new Date(preferredDate);
const dateKey = date.toISOString().slice(0,10);
const day = date.getUTCDay();
if (![3,6].includes(day)) throw new Error("Preferred clinic date must be a Wednesday or Saturday.");

const vet = await memberTable.selectRecordAsync(vetId);
if (!vet || vet.getCellValueAsString("Role") !== "Veterinarian" || !vet.getCellValue("Active")) throw new Error("Active approved veterinarian required.");
const clinicType = day === 3 ? "Wednesday" : "Saturday";

const clinics = await clinicTable.selectRecordsAsync({
  fields:[
    "fldLjgu1pFiXYemor",
    "fldLHtdVUd8OKryxu",
    "fldumFvbufAkcE4SJ",
    "fld8zF1AWVBrY14XH",
    "fldTtrwf64Doa7oWC",
    "fldXnlJDU9A0cgmSV", "ClinicDay Session Type"
  ]
});

let clinic = clinics.records.find(record => {
  const value = record.getCellValue("fldLjgu1pFiXYemor");
  return value && new Date(value).toISOString().slice(0,10) === dateKey;
});

if (clinic && ["Cancelled","Completed"].includes(clinic.getCellValueAsString("Scheduling Stage"))) throw new Error("This date is cancelled or completed. A coordinator must resolve it.");
if (clinic && clinic.getCellValueAsString("ClinicDay Session Type") !== preferredClinicType) throw new Error("This date has a different session type. Ask a coordinator to reconcile before confirming.");
if (!clinic) {
  const clinicId = await clinicTable.createRecordAsync({
    "fldLjgu1pFiXYemor": preferredDate,
    "fldpGYSF5fVprmAKu": {name: clinicType},
    "fldLHtdVUd8OKryxu": {name: "Awaiting Vet Tech"},
    "fld7c41apIv12bLAC": "Rachel O. and Jen B.",
    "fld6lEz2tK3HwsyJt": "rachelyn001@yahoo.com",
    "fldud1b43Y4XdT8MK": "jenpopp@hotmail.com",
    "fldXnlJDU9A0cgmSV": 6,
    "fldGE5UHhQbOjnF9P": {name: preferredClinicType},
    "fldumFvbufAkcE4SJ": {name: "Veterinarian Preference"},
    "fld8zF1AWVBrY14XH": [{id: preferenceId}]
  });
  clinic = await clinicTable.selectRecordAsync(clinicId);
} else {
  const linked = clinic.getCellValue("fld8zF1AWVBrY14XH") || [];
  if (!linked.some(x => x.id === preferenceId)) {
    await clinicTable.updateRecordAsync(clinic.id, {
      "fld8zF1AWVBrY14XH": [...linked, {id: preferenceId}],
      "Volunteer Target":6
    });
    clinic = await clinicTable.selectRecordAsync(clinic.id);
  }
}

if (!clinic) return;

const responses = await responseTable.selectRecordsAsync({
  fields:[
    "fldQSpVFW9aL1N2IB",
    "fldcgvpRHyLfhilZ9",
    "fldFhS8wEchraTk7Y",
    "fldLcBN2h1exkDvSg",
    "fldN3ZulqJOCE7hYC",
    "fldLIYuasrLgz7xJb"
  ]
});

const clinicResponses = responses.records.filter(record => {
  const links = record.getCellValue("fldQSpVFW9aL1N2IB") || [];
  return links.some(x => x.id === clinic.id);
});

let vetResponse = clinicResponses.find(record => {
  const team = record.getCellValue("fldcgvpRHyLfhilZ9") || [];
  return team.some(x => x.id === vetId);
});

const now = new Date().toISOString();
if (vetResponse) {
  await responseTable.updateRecordAsync(vetResponse.id, {
    "fldFhS8wEchraTk7Y": {name:"Yes"},
    "fld6yV82OWRsHCsGp": now,
    "Availability Clinic Date":dateKey, "Reconfirmation Date":null,
    "fldLcBN2h1exkDvSg": {name:"Awaiting Response"},
    "fldN3ZulqJOCE7hYC": {name:"Attending"},
    "fldLIYuasrLgz7xJb": {name:"Veterinarian"}
  });
} else {
  await responseTable.createRecordAsync({
    "fldQSpVFW9aL1N2IB": [{id: clinic.id}],
    "fldcgvpRHyLfhilZ9": [{id: vetId}],
    "fldFhS8wEchraTk7Y": {name:"Yes"},
    "fld6yV82OWRsHCsGp": now,
    "Availability Clinic Date":dateKey, "Reconfirmation Date":null,
    "fldLcBN2h1exkDvSg": {name:"Awaiting Response"},
    "fldN3ZulqJOCE7hYC": {name:"Attending"},
    "fldLIYuasrLgz7xJb": {name:"Veterinarian"}
  });
}

const members = await memberTable.selectRecordsAsync({
  fields:["fldsH1qDFwK1Bc60j","fldetVJrQMMWSEgb4","fld4MiXyflGeHGGvV","fldoDKW5kuprStjDZ"]
});
const existingMemberIds = new Set();
for (const record of clinicResponses) {
  const team = record.getCellValue("fldcgvpRHyLfhilZ9") || [];
  team.forEach(x => existingMemberIds.add(x.id));
}
existingMemberIds.add(vetId);
const vetMember = members.records.find(record => record.id === vetId);
const veterinarianName = vetMember?.getCellValueAsString("fldsH1qDFwK1Bc60j") || "Confirmed veterinarian";

const vetTechs = members.records.filter(record =>
  record.getCellValueAsString("fldetVJrQMMWSEgb4") === "Vet Tech" &&
  Boolean(record.getCellValue("fld4MiXyflGeHGGvV")) &&
  Boolean(record.getCellValue("fldoDKW5kuprStjDZ")) &&
  !existingMemberIds.has(record.id)
);

const creates = vetTechs.map(record => ({
  fields:{
    "fldQSpVFW9aL1N2IB":[{id:clinic.id}],
    "fldcgvpRHyLfhilZ9":[{id:record.id}],
    "fldFhS8wEchraTk7Y":{name:"No Response"},
    "fldLcBN2h1exkDvSg":{name:"Awaiting Response"},
    "fldN3ZulqJOCE7hYC":{name:"Unconfirmed"},
    "Availability Clinic Date":dateKey,
    "fldYmLJKJ88SU4gwL": veterinarianName
  }
}));
while (creates.length) {
  await responseTable.createRecordsAsync(creates.splice(0,50));
}

await clinicTable.updateRecordAsync(clinic.id, {
  "Volunteer Target":6
});

await preferenceTable.updateRecordAsync(preferenceId, {
  "fldNOP6jNztALLcG6": {name:"Scheduled"},
  "fld4OQWZTVfAREqk6": [{id:clinic.id}]
});

