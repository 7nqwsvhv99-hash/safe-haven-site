"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { airtableCreate, airtableUpdate, airtableList, asText } from "@/lib/portal";
import { STAFF, FIELDS, staffData, staffContext, staffRoster } from "@/lib/staff-workspace";
import { chicagoISO, overlaps, safeResource } from "@/lib/staff-policy";
const text = (form: FormData, name: string) => String(form.get(name) || "").trim();
function required(value: string, label: string) { if (!value) throw new Error(`${label} is required.`); return value; }
async function run(path: string, work: () => Promise<void>) {
  let error = "";
  try { await work(); } catch(e) { if (e instanceof Error && e.message === "NEXT_REDIRECT") throw e; error = e instanceof Error ? e.message : "Could not save. Please try again."; }
  revalidatePath(path);
  redirect(`${path}?${error ? "error=" + encodeURIComponent(error) : "saved=1"}`);
}
export async function saveMaterial(form: FormData) {
  await staffContext(true);
  await run("/portal/staff/training", async () => {
    const context = await staffContext(true);
    const id = text(form,"id");
    const existing = id ? (await airtableList(STAFF.materials, FIELDS.materials)).find(r=>r.id===id) : null;
    if (id && !existing) throw new Error("Training material was not found.");
    const status = text(form,"status");
    if (!["Draft","Published","Archived"].includes(status)) throw new Error("Choose a valid status.");
    const content = text(form,"content"); const url = safeResource(text(form,"url"));
    if (!content && !url) throw new Error("Add training instructions or a resource link.");
    const fields = { Title: required(text(form,"title"),"Title"), Content: content, "Resource URL": url, Status: status, Version: String(Number(existing?.fields.Version || 0) + 1), "Updated By": context.email };
    if (id) await airtableUpdate(STAFF.materials,id,fields); else await airtableCreate(STAFF.materials,fields);
  });
}
export async function assignTraining(form: FormData) {
  await staffContext(true);
  await run("/portal/staff/training", async()=>{
    const data = await staffData("training");
    const person = data.roster.find(r=>r.id===text(form,"person"));
    if (!person) throw new Error("Choose an active staff member.");
    const material = data.materials.find(r=>r.id===text(form,"material") && r.fields.Status==="Published");
    if (!material) throw new Error("Choose a published training material.");
    if (data.rows.some(r=>r.fields["Staff Email"]===person.email && r.fields["Material ID"]===material.id && r.fields["Material Version"]===material.fields.Version)) throw new Error("This version is already assigned to this staff member.");
    const due = text(form,"due"); if (due && !/^\d{4}-\d{2}-\d{2}$/.test(due)) throw new Error("Enter a valid due date.");
    await airtableCreate(STAFF.tasks,{Task:material.fields.Title,"Staff Email":person.email,"Staff Name":person.name,"Material ID":material.id,"Material Version":material.fields.Version,"Training Snapshot":[material.fields.Content,material.fields["Resource URL"]].filter(Boolean).join("\n\n"),Status:"Assigned","Due Date":due||null,"Assigned By":data.context.email});
  });
}
export async function updateTraining(form: FormData) {
  await staffContext();
  await run("/portal/staff/training", async()=>{
    const data = await staffData("training"); const row = data.rows.find(r=>r.id===text(form,"id"));
    if (!row) throw new Error("Training assignment was not found.");
    const status = text(form,"status"); const now = new Date().toISOString();
    if (text(form,"mode")==="review") {
      if (!data.context.manager) throw new Error("Manager access is required.");
      if (!["Verified","Needs Follow-Up","Assigned"].includes(status)) throw new Error("Choose a valid review status.");
      if (status==="Verified" && row.fields.Status!=="Completed by Staff" && row.fields.Status!=="Verified") throw new Error("The staff member must complete this task before verification.");
      await airtableUpdate(STAFF.tasks,row.id,{Status:status,"Manager Notes":text(form,"notes"),"Verified By":status==="Verified"?data.context.email:"","Verified At":status==="Verified"?now:null});
    } else {
      if (row.fields["Staff Email"]!==data.ownEmail || row.fields.Status==="Verified") throw new Error("You can complete only your own unverified assignments.");
      await airtableUpdate(STAFF.tasks,row.id,{Status:"Completed by Staff","Staff Notes":text(form,"notes"),"Completed At":now});
    }
  });
}
export async function saveShift(form: FormData) {
  await staffContext(true);
  await run("/portal/staff/schedule",async()=>{
    const data=await staffData("schedule"); const id=text(form,"id"); const old=data.rows.find(r=>r.id===id);
    if(id&&!old) throw new Error("Shift was not found.");
    const person=data.roster.find(r=>r.id===text(form,"person")); if(!person) throw new Error("Choose an active staff member.");
    const start=chicagoISO(text(form,"start")),end=chicagoISO(text(form,"end"));
    if(Date.parse(end)<=Date.parse(start)) throw new Error("End time must be after start time.");
    const status=text(form,"status"); if(!["Scheduled","Cancelled","Completed"].includes(status)) throw new Error("Choose a valid shift status.");
    if(status==="Scheduled"&&data.rows.some(r=>r.id!==id&&r.fields["Staff Email"]===person.email&&r.fields.Status==="Scheduled"&&overlaps(start,end,asText(r.fields.Start),asText(r.fields.End)))) throw new Error("This staff member already has an overlapping shift.");
    const changed=!old||old.fields["Staff Email"]!==person.email||Date.parse(asText(old.fields.Start))!==Date.parse(start)||Date.parse(asText(old.fields.End))!==Date.parse(end)||old.fields.Location!==text(form,"location")||old.fields.Status!==status;
    const fields={Shift:required(text(form,"title"),"Shift title"),"Staff Email":person.email,"Staff Name":person.name,Start:start,End:end,Location:text(form,"location"),Status:status,Notes:text(form,"notes"),"Updated By":data.context.email,...(changed?{Response:"Pending","Staff Notes":""}:{})};
    if(id) await airtableUpdate(STAFF.shifts,id,fields); else await airtableCreate(STAFF.shifts,fields);
  });
}
export async function respondShift(form: FormData) {
  await staffContext();
  await run("/portal/staff/schedule",async()=>{
    const data=await staffData("schedule"); const row=data.rows.find(r=>r.id===text(form,"id"));
    if(!row||row.fields["Staff Email"]!==data.ownEmail||row.fields.Status!=="Scheduled") throw new Error("You can respond only to your own scheduled shifts.");
    if(text(form,"snapshot")!==JSON.stringify([row.fields.Start,row.fields.End,row.fields.Location||""])) throw new Error("This shift changed. Review the updated times before responding.");
    const response=text(form,"response"); if(!["Confirmed","Unable to Attend"].includes(response)) throw new Error("Choose a response.");
    await airtableUpdate(STAFF.shifts,row.id,{Response:response,"Staff Notes":text(form,"notes")});
  });
}
