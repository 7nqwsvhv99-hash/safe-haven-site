import { NextResponse } from "next/server"
import { getSafeHavenAirtableConfig } from "@/lib/airtable-config"
import { findExceptionOverlap, getCentralDate, parseIntervals, validateWeeklySchedule } from "@/lib/shelter-hours-policy.js"

type AirtableRecord = { id: string; fields: Record<string, unknown> }
type PublicException = {
  id: string; name: string; type: string; startDate: string; endDate: string;
  mode: "Closed" | "Replace"; openIntervals: { start: string; end: string }[]; message: string; status: string;
}

export const dynamic = "force-dynamic"

function text(value: unknown) { return typeof value === "string" ? value : "" }

async function readTable(tableId: string, fields: string[]) {
  const token = process.env.AIRTABLE_ACCESS_TOKEN
  if (!token) throw new Error("Airtable is unavailable")
  const config = getSafeHavenAirtableConfig()
  const records: AirtableRecord[] = []
  let offset = ""
  do {
    const params = new URLSearchParams({ pageSize: "100" })
    fields.forEach((field) => params.append("fields[]", field))
    if (offset) params.set("offset", offset)
    const response = await fetch(`https://api.airtable.com/v0/${config.baseId}/${tableId}?${params}`, {
      headers: { Authorization: `Bearer ${token}` }, cache: "no-store",
    })
    if (!response.ok) throw new Error(`Airtable read failed (${response.status})`)
    const result = await response.json() as { records?: AirtableRecord[]; offset?: string }
    records.push(...(result.records || []))
    offset = result.offset || ""
  } while (offset)
  return records
}

export async function GET() {
  try {
    const config = getSafeHavenAirtableConfig()
    const hoursTable = config.tables.publicShelterHours
    const exceptionsTable = config.tables.publicHoursExceptions
    if (!hoursTable || !exceptionsTable) throw new Error("Public shelter hours are not configured")

    const [schedules, records] = await Promise.all([
      readTable(hoursTable, ["Weekly Hours JSON"]),
      readTable(exceptionsTable, ["Exception", "Type", "Start Date", "End Date", "Mode", "Open Intervals JSON", "Status", "Public Message"]),
    ])
    if (schedules.length !== 1) throw new Error("Exactly one public weekly shelter-hours schedule must be configured")
    const rawSchedule = text(schedules[0]?.fields["Weekly Hours JSON"])
    const parsedSchedule = validateWeeklySchedule(JSON.parse(rawSchedule))
    const today = getCentralDate()
    const exceptions: PublicException[] = records.flatMap((record) => {
      const fields = record.fields
      const status = text(fields.Status)
      const startDate = text(fields["Start Date"])
      const endDate = text(fields["End Date"])
      const mode = text(fields.Mode)
      if (status !== "Published" || !startDate || !endDate || endDate < today) return []
      if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate) || startDate > endDate) {
        throw new Error("A published shelter-hours exception has invalid dates")
      }
      if (mode !== "Closed" && mode !== "Replace") throw new Error("A published shelter-hours exception has an invalid mode")
      const rawIntervals = text(fields["Open Intervals JSON"])
      const intervals = mode === "Closed" ? [] : parseIntervals(JSON.parse(rawIntervals).map((item: { start: string; end: string }) => `${item.start}-${item.end}`).join(","))
      if (mode === "Replace" && intervals.length === 0) throw new Error("A published exception has no replacement hours")
      return [{ id: record.id, name: text(fields.Exception), type: text(fields.Type), startDate, endDate, mode, openIntervals: intervals, message: text(fields["Public Message"]), status }]
    })

    for (let index = 0; index < exceptions.length; index += 1) {
      const overlap = findExceptionOverlap(exceptions.slice(index + 1), exceptions[index], exceptions[index].id)
      if (overlap) throw new Error("Published shelter-hours exceptions overlap")
    }
    exceptions.sort((left, right) => left.startDate.localeCompare(right.startDate) || left.name.localeCompare(right.name))

    return NextResponse.json(
      { timezone: "America/Chicago", today, weeklySchedule: parsedSchedule, exceptions },
      { headers: { "Cache-Control": "no-store, max-age=0" } },
    )
  } catch (error) {
    console.error("Public shelter hours could not be loaded", error)
    return NextResponse.json({ error: "Shelter hours are temporarily unavailable." }, { status: 503, headers: { "Cache-Control": "no-store, max-age=0" } })
  }
}
