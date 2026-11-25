const cfg = input.config();
const responseId = cfg.responseId;
const clinicTable = base.getTable("Clinic Staffing Dates");
const memberTable = base.getTable("Clinic Team Members");
const responseTable = base.getTable("Clinic Staffing Responses");

const changed = await responseTable.selectRecordAsync(responseId);
if (!changed) return;

const clinicLinks = changed.getCellValue("Clinic Date") || [];
if (!clinicLinks.length) return;
const clinicId = clinicLinks[0].id;
const clinic = await clinicTable.selectRecordAsync(clinicId);
if (!clinic) return;

const currentStage = clinic.getCellValueAsString("Scheduling Stage");
if (["Completed","Cancelled"].includes(currentStage)) return;

const responses = await responseTable.selectRecordsAsync({
  fields:["Computed Attendance Plan","Clinic Date","Team Member","Initial Response","One-Week Reconfirmation","Team Member Role","Clinic Assignment","Team Member Name","Clinic Assignments"]
});
const clinicResponses = responses.records.filter(r => {
  const links = r.getCellValue("Clinic Date") || [];
  return links.some(x => x.id === clinicId);
});

function attendance(record) { return record.getCellValueAsString("Computed Attendance Plan"); }
function role(record) {
  return record.getCellValueAsString("Team Member Role");
}
const attending = clinicResponses.filter(r => attendance(r) === "Attending");
const vets = attending.filter(r => role(r) === "Veterinarian").length;
const techs = attending.filter(r => ["Vet Tech","Veterinary Technician"].includes(role(r))).length;
const volunteers = attending.filter(r => role(r) === "Clinic Volunteer").length;
const target = 6;
function assignments(record) {
  const linked = record.getCellValue("Clinic Assignments") || [];
  return linked.length ? linked.map(item => item.name || String(item)) : [record.getCellValueAsString("Clinic Assignment")].filter(Boolean);
}
const volunteerAssignments = attending.filter(r => role(r) === "Clinic Volunteer").flatMap(assignments);
const confirmedVeterinarianName =
  attending.find(r => role(r) === "Veterinarian")?.getCellValueAsString("Team Member Name") || "";

const requiredCoverageComplete =
  volunteerAssignments.filter(x => x === "Front Room System").length >= 1 &&
  volunteerAssignments.filter(x => x === "Back Room System").length >= 1 &&
  volunteerAssignments.filter(x => x === "Autoclave").length >= 1;

const laterStage = ["Awaiting Vet Tech","Awaiting Volunteers","Staffing In Progress","Staffed","At Risk"].includes(currentStage);
const volunteerStage = ["Awaiting Volunteers","Staffing In Progress","Staffed","At Risk"].includes(currentStage);

async function ensureResponsesForRole(roleName) {
  const members = await memberTable.selectRecordsAsync({
    fields:["Role","Active","Receive Scheduling Emails"]
  });
  const existing = new Set();
  for (const r of clinicResponses) {
    const links = r.getCellValue("Team Member") || [];
    links.forEach(x => existing.add(x.id));
  }
  const eligible = members.records.filter(m =>
    m.getCellValueAsString("Role") === roleName &&
    Boolean(m.getCellValue("Active")) &&
    Boolean(m.getCellValue("Receive Scheduling Emails")) &&
    !existing.has(m.id)
  );
  const creates = eligible.map(m => ({fields:{
    "Clinic Date":[{id:clinicId}],
    "Team Member":[{id:m.id}],
    "Initial Response":{name:"No Response"},
    "One-Week Reconfirmation":{name:"Awaiting Response"},
    "Final Attendance Plan":{name:"Unconfirmed"},
    "Availability Clinic Date": String(clinic.getCellValue("Clinic Date")).slice(0,10),
    "Veterinarian for Invitation": confirmedVeterinarianName
  }}));
  while (creates.length) await responseTable.createRecordsAsync(creates.splice(0,50));
}

let nextStage = currentStage;
if (vets > 1) {
  nextStage = "At Risk";
} else if (laterStage && vets < 1) {
  nextStage = "At Risk";
} else if (volunteerStage && techs < 1) {
  nextStage = "At Risk";
} else if (vets >= 1 && techs < 1) {
  await ensureResponsesForRole("Vet Tech");
  nextStage = "Awaiting Vet Tech";
} else if (vets >= 1 && techs >= 1) {
  await ensureResponsesForRole("Clinic Volunteer");
  nextStage = !clinic.getCellValue("Booked Appointment Follow-Up Required") && requiredCoverageComplete && volunteers >= target
    ? "Staffed"
    : volunteers > 0
      ? "Staffing In Progress"
      : "Awaiting Volunteers";
} else {
  nextStage = "Proposed";
}

if (nextStage !== currentStage || clinic.getCellValue("Volunteer Target") !== 6) {
  await clinicTable.updateRecordAsync(clinicId, {
    "Volunteer Target":6, "Scheduling Stage": {name: nextStage}
  });
}
