import "server-only";
import { redirect } from "next/navigation";
import { airtableList, asText, asStrings, getPortalContext, normalizeEmail, TABLES } from "./portal";
import { isStaff, managesStaff } from "./staff-policy";
export const STAFF = { materials: "tblyMvtsiOXCEGrXc", tasks: "tblWBcA9SjjNwOFzK", shifts: "tblVFTKBcMRM9OuYv" };
export const FIELDS = {
  materials: ["Title", "Content", "Resource URL", "Status", "Version", "Updated By"],
  tasks: ["Task", "Staff Email", "Staff Name", "Material ID", "Material Version", "Training Snapshot", "Status", "Due Date", "Staff Notes", "Manager Notes", "Assigned By", "Verified By", "Completed At", "Verified At"],
  shifts: ["Shift", "Staff Email", "Staff Name", "Start", "End", "Location", "Status", "Response", "Notes", "Staff Notes", "Updated By"],
};
export async function staffContext(manager = false) {
  const context = await getPortalContext();
  if (!isStaff(context.roles) || (manager && !managesStaff(context.roles))) redirect("/portal");
  return { ...context, manager: managesStaff(context.roles) };
}
export async function staffRoster() {
  return (await airtableList(TABLES.portalAccess, ["Email", "Display Name", "Roles", "Active"]))
    .filter(r => r.fields.Active && isStaff(asStrings(r.fields.Roles)))
    .map(r => ({ id: r.id, email: normalizeEmail(asText(r.fields.Email)), name: asText(r.fields["Display Name"]) || asText(r.fields.Email) }));
}
export async function staffData(kind: "training" | "schedule") {
  const context = await staffContext();
  const roster = await staffRoster();
  const ownEmail = roster.find(r => r.id === context.accessRecordId)?.email || context.email;
  const escaped = ownEmail.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
  const filter = context.manager ? undefined : { filterByFormula: `LOWER({Staff Email})='${escaped}'` };
  const rows = await airtableList(kind === "training" ? STAFF.tasks : STAFF.shifts, kind === "training" ? FIELDS.tasks : FIELDS.shifts, filter);
  const materials = kind === "training" ? await airtableList(STAFF.materials, FIELDS.materials, context.manager ? undefined : { filterByFormula: "{Status}='Published'" }) : [];
  return { context, roster: context.manager ? roster : roster.filter(r => r.email === ownEmail), ownEmail, rows, materials };
}
