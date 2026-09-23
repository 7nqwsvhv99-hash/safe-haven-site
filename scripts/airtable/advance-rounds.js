const cfg = input.config();
const responseId = cfg.responseId;
const clinicTable = base.getTable("tblJvWn5fh7Rtfp3O");
const memberTable = base.getTable("tblVG88gCVYbRC8Qo");
const responseTable = base.getTable("tblEVlmHvHzItbcVl");

const changed = await responseTable.selectRecordAsync(responseId);
if (!changed) return;

const clinicLinks = changed.getCellValue("fldQSpVFW9aL1N2IB") || [];
if (!clinicLinks.length) return;
const clinicId = clinicLinks[0].id;
const clinic = await clinicTable.selectRecordAsync(clinicId);
if (!clinic) return;

const currentStage = clinic.getCellValueAsString("fldLHtdVUd8OKryxu");
if (["Completed","Cancelled"].includes(currentStage)) return;

const responses = await responseTable.selectRecordsAsync({
  fields:["Computed Attendance Plan","fldQSpVFW9aL1N2IB","fldcgvpRHyLfhilZ9","fldFhS8wEchraTk7Y","fldLcBN2h1exkDvSg","fldluC4JvQvvvRVHc","fldLIYuasrLgz7xJb","fldBOwvVYNacWyArm"]
});
const clinicResponses = responses.records.filter(r => {
  const links = r.getCellValue("fldQSpVFW9aL1N2IB") || [];
  return links.some(x => x.id === clinicId);
});

function attendance(record) { return record.getCellValueAsString("Computed Attendance Plan"); }
function role(record) {
  return record.getCellValueAsString("fldluC4JvQvvvRVHc");
}
const attending = clinicResponses.filter(r => attendance(r) === "Attending");
const vets = attending.filter(r => role(r) === "Veterinarian").length;
const techs = attending.filter(r => ["Vet Tech","Veterinary Technician"].includes(role(r))).length;
const volunteers = attending.filter(r => role(r) === "Clinic Volunteer").length;
const target = 6;
function assignment(record) { return record.getCellValueAsString("fldLIYuasrLgz7xJb"); }
const volunteerAssignments = attending.filter(r => role(r) === "Clinic Volunteer").map(assignment);
const confirmedVeterinarianName =
  attending.find(r => role(r) === "Veterinarian")?.getCellValueAsString("fldBOwvVYNacWyArm") || "";

const requiredCoverageComplete =
  volunteerAssignments.filter(x => x === "Front Room System").length >= 1 &&
  volunteerAssignments.filter(x => x === "Back Room System").length >= 1 &&
  volunteerAssignments.filter(x => x === "Autoclave").length >= 1;

const laterStage = ["Awaiting Vet Tech","Awaiting Volunteers","Staffing In Progress","Staffed","At Risk"].includes(currentStage);
const volunteerStage = ["Awaiting Volunteers","Staffing In Progress","Staffed","At Risk"].includes(currentStage);

async function ensureResponsesForRole(roleName) {
  const members = await memberTable.selectRecordsAsync({
    fields:["fldetVJrQMMWSEgb4","fld4MiXyflGeHGGvV","fldoDKW5kuprStjDZ"]
  });
  const existing = new Set();
  for (const r of clinicResponses) {
    const links = r.getCellValue("fldcgvpRHyLfhilZ9") || [];
    links.forEach(x => existing.add(x.id));
  }
  const eligible = members.records.filter(m =>
    m.getCellValueAsString("fldetVJrQMMWSEgb4") === roleName &&
    Boolean(m.getCellValue("fld4MiXyflGeHGGvV")) &&
    Boolean(m.getCellValue("fldoDKW5kuprStjDZ")) &&
    !existing.has(m.id)
  );
  const creates = eligible.map(m => ({fields:{
    "fldQSpVFW9aL1N2IB":[{id:clinicId}],
    "fldcgvpRHyLfhilZ9":[{id:m.id}],
    "fldFhS8wEchraTk7Y":{name:"No Response"},
    "fldLcBN2h1exkDvSg":{name:"Awaiting Response"},
    "fldN3ZulqJOCE7hYC":{name:"Unconfirmed"},
    "Availability Clinic Date": String(clinic.getCellValue("Clinic Date")).slice(0,10),
    "fldYmLJKJ88SU4gwL": confirmedVeterinarianName
  }}));
  while (creates.length) await responseTable.createRecordsAsync(creates.splice(0,50));
}

let nextStage = currentStage;
if (laterStage && vets < 1) {
  nextStage = "At Risk";
} else if (volunteerStage && techs < 1) {
  nextStage = "At Risk";
} else if (vets >= 1 && techs < 1) {
  await ensureResponsesForRole("Vet Tech");
  nextStage = "Awaiting Vet Tech";
} else if (vets >= 1 && techs >= 1) {
  await ensureResponsesForRole("Clinic Volunteer");
  nextStage = !clinic.getCellValue("Patient Follow-Up Required") && requiredCoverageComplete && volunteers >= target
    ? "Staffed"
    : volunteers > 0
      ? "Staffing In Progress"
      : "Awaiting Volunteers";
} else {
  nextStage = "Proposed";
}

if (nextStage !== currentStage || clinic.getCellValue("Volunteer Target") !== 6) {
  await clinicTable.updateRecordAsync(clinicId, {
    "Volunteer Target":6, "fldLHtdVUd8OKryxu": {name: nextStage}
  });
}
