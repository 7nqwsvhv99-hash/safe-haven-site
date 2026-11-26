"use server"

import { revalidatePath } from "next/cache"
import { chicagoLocalToIso } from "@/lib/event-dates"
import { canManagePublicContent } from "@/lib/announcement-policy"
import { DAYS, findExceptionOverlap, isDate, parseIntervals, parseReplacementIntervals, validateWeeklySchedule } from "@/lib/shelter-hours-policy.js"
import { airtableCreate, airtableList, airtableUpdate, asStrings, asText, requirePortalRole, TABLES } from "@/lib/portal"

export type HoursActionState = { status: "idle" | "success" | "error"; message: string }
const idle: HoursActionState = { status: "idle", message: "" }
type AirtableRecord = { id: string; fields: Record<string, unknown> }

async function publisher() {
  const context = await requirePortalRole("Staff", "write")
  if (!canManagePublicContent(context)) throw new Error("Only authorized shelter leadership can change public hours.")
  return context
}

function formText(form: FormData, name: string) { return String(form.get(name) || "").trim() }
function identity(context: { displayName: string; email: string }) { return `${context.displayName} (${context.email})` }
function failed(error: unknown): HoursActionState {
  return { status: "error", message: error instanceof Error ? error.message : "Could not save shelter hours. Please try again." }
}
function success(message: string): HoursActionState { return { status: "success", message } }

function parseWeek(form: FormData) {
  const days: Record<string, { start: string; end: string }[]> = {}
  for (const day of DAYS) days[day] = form.get(`closed-${day}`) === "on" ? [] : parseIntervals(formText(form, `hours-${day}`))
  return validateWeeklySchedule({ days })
}

async function soleSchedule() {
  const rows = await airtableList(TABLES.publicShelterHours, ["Schedule", "Weekly Hours JSON", "Last Edited By", "Last Edited At"])
  if (rows.length > 1) throw new Error("More than one weekly schedule is configured. Ask an administrator to resolve this before editing.")
  return rows[0] as AirtableRecord | undefined
}

export async function saveWeeklyHours(_previous: HoursActionState = idle, form: FormData): Promise<HoursActionState> {
  try {
    const context = await publisher()
    const schedule = parseWeek(form)
    if (Object.values(schedule.days).every((intervals) => intervals.length === 0)) throw new Error("At least one day must have open hours.")
    const existing = await soleSchedule()
    const now = new Date().toISOString()
    const fields = { "Weekly Hours JSON": JSON.stringify(schedule), "Last Edited By": identity(context), "Last Edited At": now }
    if (existing) await airtableUpdate(TABLES.publicShelterHours, existing.id, fields, true)
    else await airtableCreate(TABLES.publicShelterHours, { Schedule: "Current public shelter hours", ...fields }, true)
    revalidatePublicHours()
    return success("Weekly shelter hours saved.")
  } catch (error) { return failed(error) }
}

function revalidatePublicHours() {
  revalidatePath("/portal/staff/content")
  revalidatePath("/api/shelter-hours")
  revalidatePath("/api/announcements")
  revalidatePath("/")
  revalidatePath("/about")
}

function mapAnnouncementType(type: string) {
  if (type === "Holiday Closure" || type === "Holiday Schedule") return "Holiday Closure"
  if (type === "Weather Closure") return "Weather Closure"
  if (type === "Delayed Opening") return "Service Interruption"
  return "General"
}

function midnightAfterDate(date: string) {
  const next = new Date(`${date}T12:00:00Z`)
  next.setUTCDate(next.getUTCDate() + 1)
  return next.toISOString().slice(0, 10)
}

function exceptionFromRecord(record: AirtableRecord) {
  const f = record.fields
  let intervals: { start: string; end: string }[] = []
  try { intervals = JSON.parse(asText(f["Open Intervals JSON"]) || "[]") } catch {}
  return {
    id: record.id,
    status: asText(f.Status),
    startDate: asText(f["Start Date"]),
    endDate: asText(f["End Date"]),
    name: asText(f.Exception),
    intervals,
  }
}

export async function saveHoursException(_previous: HoursActionState = idle, form: FormData): Promise<HoursActionState> {
  try {
    const context = await publisher()
    const id = formText(form, "exceptionId")
    const submissionKey = formText(form, "submissionKey")
    const name = formText(form, "name")
    const type = formText(form, "type")
    const startDate = formText(form, "startDate")
    const endDate = formText(form, "endDate")
    const mode = formText(form, "mode")
    const status = formText(form, "status")
    const message = formText(form, "message")
    const allowedTypes = ["Holiday Schedule", "Holiday Closure", "Weather Closure", "Delayed Opening", "Special Hours"]
    if (!name || name.length > 120) throw new Error("Add a short exception name (120 characters or fewer).")
    if (!allowedTypes.includes(type)) throw new Error("Choose a valid hours exception type.")
    if (!isDate(startDate) || !isDate(endDate) || startDate > endDate) throw new Error("Choose valid start and end dates, with the end on or after the start.")
    if (!["Closed", "Replace"].includes(mode)) throw new Error("Choose whether the exception closes the shelter or replaces its hours.")
    if (!message || message.length > 1000) throw new Error("Add a public notice (1,000 characters or fewer).")
    const intervals = mode === "Closed" ? [] : parseReplacementIntervals(formText(form, "intervals"))
    if (mode === "Replace" && intervals.length === 0) throw new Error("Enter replacement opening hours for every date in this range.")
    if (!id && !submissionKey) throw new Error("Refresh the page and submit the exception again.")

    const rows = await airtableList(TABLES.publicHoursExceptions, ["Exception", "Type", "Start Date", "End Date", "Mode", "Open Intervals JSON", "Status", "Public Message", "Linked Announcement", "Submission Key"])
    const previous = (id ? rows.find((row) => row.id === id) : rows.find((row) => asText(row.fields["Submission Key"]) === submissionKey)) as AirtableRecord | undefined
    if (id && !previous) throw new Error("This hours exception could not be found. Refresh the page and try again.")
    if (status === "Published") {
      const conflict = findExceptionOverlap(rows.map(exceptionFromRecord), { startDate, endDate }, previous?.id || id)
      if (conflict) throw new Error(`This date range overlaps “${conflict.name}” (${conflict.startDate} to ${conflict.endDate}). Edit or cancel that published exception first.`)
    }

    const now = new Date().toISOString()
    const who = identity(context)
    const effectiveKey = submissionKey || asText(previous?.fields["Submission Key"]) || `hours-exception-${id}`
    const linkedIds = asStrings(previous?.fields["Linked Announcement"])
    const announcementId = linkedIds[0]
    const knownAnnouncements = announcementId ? [] : await airtableList(TABLES.publicAnnouncements, ["Title", "Hours Exception Key"])
    let announcementRecordId = announcementId || knownAnnouncements.find((item) => asText(item.fields["Hours Exception Key"]) === effectiveKey)?.id || ""
    if (announcementRecordId) await airtableUpdate(TABLES.publicAnnouncements, announcementRecordId, { Status: "Draft", "Last Edited By": who, "Last Edited At": now }, true)
    const draftFields: Record<string, unknown> = {
      Exception: name, Type: type, "Start Date": startDate, "End Date": endDate, Mode: mode,
      "Open Intervals JSON": JSON.stringify(intervals), Status: "Draft", "Public Message": message,
      "Last Edited By": who, "Last Edited At": now,
      "Submission Key": effectiveKey,
    }
    let exceptionRecord: AirtableRecord | null
    if (previous) {
      await airtableUpdate(TABLES.publicHoursExceptions, previous.id, { Status: "Draft", "Last Edited By": who, "Last Edited At": now }, true)
      exceptionRecord = await airtableUpdate(TABLES.publicHoursExceptions, previous.id, draftFields, true) as AirtableRecord
    } else {
      exceptionRecord = await airtableCreate(TABLES.publicHoursExceptions, { ...draftFields, "Created By": who, "Created At": now }, true)
    }
    if (!exceptionRecord) throw new Error("The hours exception was not saved. Please retry.")

    const announcementFields: Record<string, unknown> = {
      Title: name,
      "Notice Type": mapAnnouncementType(type),
      "Public Message": message,
      Status: "Draft",
      "Display Start": chicagoLocalToIso(startDate),
      "Expires At": chicagoLocalToIso(midnightAfterDate(endDate)),
      Priority: "Normal",
      "Last Edited By": who,
      "Last Edited At": now,
      "Hours Exception Key": effectiveKey,
    }
    if (announcementRecordId) {
      await airtableUpdate(TABLES.publicAnnouncements, announcementRecordId, announcementFields, true)
    } else {
      const created = await airtableCreate(TABLES.publicAnnouncements, { ...announcementFields, "Created By": who, "Created At": now }, true) as AirtableRecord | null
      announcementRecordId = created?.id || ""
    }
    if (!announcementRecordId) throw new Error("Hours were saved, but the linked public notice could not be created. Retry saving this exception to finish publishing.")
    await airtableUpdate(TABLES.publicHoursExceptions, exceptionRecord.id, { "Linked Announcement": [announcementRecordId], Status: status, "Last Edited By": who, "Last Edited At": now }, true)
    await airtableUpdate(TABLES.publicAnnouncements, announcementRecordId, { Status: status === "Published" ? "Published" : "Draft", "Last Edited By": who, "Last Edited At": now }, true)
    revalidatePublicHours()
    return success(status === "Published" ? "Hours exception and matching public notice published." : "Hours exception saved as a draft.")
  } catch (error) { return failed(error) }
}

export async function cancelHoursException(_previous: HoursActionState = idle, form: FormData): Promise<HoursActionState> {
  try {
    const context = await publisher()
    const id = formText(form, "exceptionId")
    if (!id) throw new Error("Choose an hours exception to cancel.")
    const rows = await airtableList(TABLES.publicHoursExceptions, ["Exception", "Linked Announcement", "Status"])
    const record = rows.find((row) => row.id === id)
    if (!record) throw new Error("This hours exception could not be found. Refresh and try again.")
    const now = new Date().toISOString()
    const who = identity(context)
    const announcementId = asStrings(record.fields["Linked Announcement"])[0]
    if (announcementId) await airtableUpdate(TABLES.publicAnnouncements, announcementId, { Status: "Cancelled", "Unpublished By": who, "Unpublished At": now, "Last Edited By": who, "Last Edited At": now }, true)
    await airtableUpdate(TABLES.publicHoursExceptions, id, { Status: "Cancelled", "Cancelled By": who, "Cancelled At": now, "Last Edited By": who, "Last Edited At": now }, true)
    revalidatePublicHours()
    return success("Exception cancelled. Regular weekly hours now apply.")
  } catch (error) { return failed(error) }
}
