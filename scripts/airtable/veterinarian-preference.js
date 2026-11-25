
const cfg = input.config();
const preferenceId = cfg.preferenceId;

const preferenceTable = base.getTable("Veterinarian Clinic Preferences");
const clinicTable = base.getTable("Clinic Staffing Dates");
const memberTable = base.getTable("Clinic Team Members");
const responseTable = base.getTable("Clinic Staffing Responses");

const preference = await preferenceTable.selectRecordAsync(preferenceId);
if (!preference) return;

const status = preference.getCellValueAsString("Preference Status");
if (status && status !== "Submitted") return;

const vetLinks = preference.getCellValue("Veterinarian") || [];
const preferredDate = preference.getCellValue("Preferred Clinic Date");
const preferredClinicType = preference.getCellValueAsString("Preferred Clinic Type") || "Full Day";
if (!vetLinks.length || !preferredDate) return;

const vetId = vetLinks[0].id;
const date = new Date(preferredDate);
const dateKey = date.toISOString().slice(0,10);
const day = date.getUTCDay();
if (![3,6].includes(day)) throw new Error("Preferred clinic date must be a Wednesday or Saturday.");

const existingPreferences = await preferenceTable.selectRecordsAsync({
  fields:["Veterinarian", "Preferred Clinic Date", "Preference Status"]
});
const anotherPreference = existingPreferences.records.find(record => {
  if (record.id === preferenceId || record.getCellValueAsString("Preference Status") === "Withdrawn") return false;
  const otherDate = record.getCellValue("Preferred Clinic Date");
  return otherDate && new Date(otherDate).toISOString().slice(0,10) === dateKey;
});
if (anotherPreference) throw new Error("Only one veterinarian may be scheduled for a clinic date. A preference already exists for this date.");

const vet = await memberTable.selectRecordAsync(vetId);
if (!vet || vet.getCellValueAsString("Role") !== "Veterinarian" || !vet.getCellValue("Active")) throw new Error("Active approved veterinarian required.");
const clinicType = day === 3 ? "Wednesday" : "Saturday";

const clinics = await clinicTable.selectRecordsAsync({
  fields:[
    "Clinic Date",
    "Scheduling Stage",
    "Staffing Source",
    "Veterinarian Preference",
    "Veterinarian Clinic Preferences",
    "Volunteer Target", "ClinicDay Session Type",
    "Follow-Up Person", "Primary Follow-Up Email", "Secondary Follow-Up Email"
  ]
});

let clinic = clinics.records.find(record => {
  const value = record.getCellValue("Clinic Date");
  return value && new Date(value).toISOString().slice(0,10) === dateKey;
});

if (clinic && ["Cancelled","Completed"].includes(clinic.getCellValueAsString("Scheduling Stage"))) throw new Error("This date is cancelled or completed. A coordinator must resolve it.");
if (clinic && clinic.getCellValueAsString("ClinicDay Session Type") !== preferredClinicType) throw new Error("This date has a different session type. Ask a coordinator to reconcile before confirming.");
if (clinic) {
  const linkedPreferences = clinic.getCellValue("Veterinarian Preference") || [];
  if (linkedPreferences.some(link => link.id !== preferenceId)) throw new Error("This clinic date is already linked to another veterinarian preference. A coordinator must reconcile it.");
}
if (!clinic) {
  const followUpTemplate = clinics.records.find(record =>
    record.getCellValueAsString("Primary Follow-Up Email") && record.getCellValueAsString("Secondary Follow-Up Email")
  );
  if (!followUpTemplate) throw new Error("A clinic staffing date with configured follow-up contacts is required before creating this date.");
  const clinicId = await clinicTable.createRecordAsync({
    "Clinic Date": preferredDate,
    "Clinic Type": {name: clinicType},
    "Scheduling Stage": {name: "Awaiting Vet Tech"},
    "Follow-Up Person": followUpTemplate.getCellValue("Follow-Up Person"),
    "Primary Follow-Up Email": followUpTemplate.getCellValueAsString("Primary Follow-Up Email"),
    "Secondary Follow-Up Email": followUpTemplate.getCellValueAsString("Secondary Follow-Up Email"),
    "Volunteer Target": 6,
    "ClinicDay Session Type": {name: preferredClinicType},
    "Staffing Source": {name: "Veterinarian Preference"},
    "Veterinarian Preference": [{id: preferenceId}]
  });
  clinic = await clinicTable.selectRecordAsync(clinicId);
} else {
  const linked = clinic.getCellValue("Veterinarian Preference") || [];
  if (!linked.some(x => x.id === preferenceId)) {
    await clinicTable.updateRecordAsync(clinic.id, {
      "Veterinarian Preference": [...linked, {id: preferenceId}],
      "Volunteer Target":6
    });
    clinic = await clinicTable.selectRecordAsync(clinic.id);
  }
}

if (!clinic) return;

const responses = await responseTable.selectRecordsAsync({
  fields:[
    "Clinic Date",
    "Team Member",
    "Initial Response",
    "One-Week Reconfirmation",
    "Final Attendance Plan",
    "Clinic Assignment",
    "Initial Response Date",
    "Reconfirmation Date",
    "Availability Clinic Date",
    "Veterinarian for Invitation"
  ]
});

const clinicResponses = responses.records.filter(record => {
  const links = record.getCellValue("Clinic Date") || [];
  return links.some(x => x.id === clinic.id);
});

let vetResponse = clinicResponses.find(record => {
  const team = record.getCellValue("Team Member") || [];
  return team.some(x => x.id === vetId);
});

const now = new Date().toISOString();
if (vetResponse) {
  await responseTable.updateRecordAsync(vetResponse.id, {
    "Initial Response": {name:"Yes"},
    "Initial Response Date": now,
    "Availability Clinic Date":dateKey, "Reconfirmation Date":null,
    "One-Week Reconfirmation": {name:"Awaiting Response"},
    "Final Attendance Plan": {name:"Attending"},
    "Clinic Assignment": {name:"Veterinarian"}
  });
} else {
  await responseTable.createRecordAsync({
    "Clinic Date": [{id: clinic.id}],
    "Team Member": [{id: vetId}],
    "Initial Response": {name:"Yes"},
    "Initial Response Date": now,
    "Availability Clinic Date":dateKey, "Reconfirmation Date":null,
    "One-Week Reconfirmation": {name:"Awaiting Response"},
    "Final Attendance Plan": {name:"Attending"},
    "Clinic Assignment": {name:"Veterinarian"}
  });
}

const members = await memberTable.selectRecordsAsync({
  fields:["Team Member Name","Role","Active","Receive Scheduling Emails"]
});
const existingMemberIds = new Set();
for (const record of clinicResponses) {
  const team = record.getCellValue("Team Member") || [];
  team.forEach(x => existingMemberIds.add(x.id));
}
existingMemberIds.add(vetId);
const vetMember = members.records.find(record => record.id === vetId);
const veterinarianName = vetMember?.getCellValueAsString("Team Member Name") || "Confirmed veterinarian";

const vetTechs = members.records.filter(record =>
  record.getCellValueAsString("Role") === "Vet Tech" &&
  Boolean(record.getCellValue("Active")) &&
  Boolean(record.getCellValue("Receive Scheduling Emails")) &&
  !existingMemberIds.has(record.id)
);

const creates = vetTechs.map(record => ({
  fields:{
    "Clinic Date":[{id:clinic.id}],
    "Team Member":[{id:record.id}],
    "Initial Response":{name:"No Response"},
    "One-Week Reconfirmation":{name:"Awaiting Response"},
    "Final Attendance Plan":{name:"Unconfirmed"},
    "Availability Clinic Date":dateKey,
    "Veterinarian for Invitation": veterinarianName
  }
}));
while (creates.length) {
  await responseTable.createRecordsAsync(creates.splice(0,50));
}

await clinicTable.updateRecordAsync(clinic.id, {
  "Volunteer Target":6
});

await preferenceTable.updateRecordAsync(preferenceId, {
  "Preference Status": {name:"Scheduled"},
  "Clinic Staffing Date": [{id:clinic.id}]
});

