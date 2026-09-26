import { NextResponse } from "next/server"

const AIRTABLE_BASE_ID = "app2vpch2JJVrP9pu"
const EVENTS_TABLE_ID = "tbl1wjnnJXBI5a3fy"

type AirtableAttachment = {
  url?: string
  thumbnails?: Record<string, { url?: string }>
}

type AirtableRecord = {
  id: string
  fields: Record<string, unknown>
}

function text(value: unknown) {
  return typeof value === "string" ? value : ""
}

function attachments(value: unknown) {
  if (!Array.isArray(value)) return []
  return value
    .filter((item): item is AirtableAttachment => Boolean(item && typeof item === "object" && "url" in item))
    .map((item) => item.thumbnails?.large?.url || item.url || "")
    .filter(Boolean)
}

export async function GET(request: Request) {
  const all = new URL(request.url).searchParams.get("all") === "1"
  try {
    const token = process.env.AIRTABLE_ACCESS_TOKEN
    if (!token) {
      return NextResponse.json({ error: "Server configuration is incomplete." }, { status: 500 })
    }

    const params = new URLSearchParams()
    params.set("pageSize", "100")
    params.append("sort[0][field]", "Start Date & Time")
    params.append("sort[0][direction]", "asc")

    const fields = [
      "Event Name",
      "Event Status",
      "Event Type",
      "Start Date & Time",
      "End Date & Time",
      "All Day Event",
      "Location Name",
      "Street Address",
      "City",
      "State",
      "ZIP",
      "Event Description",
      "Event Image",
      "CTA Label",
      "CTA URL",
      "Publish on Website",
      "Featured on Homepage",
      "Display Order",
    ]
    for (const field of fields) params.append("fields[]", field)

    const records: AirtableRecord[] = []
    let offset: string | undefined
    do {
      if (offset) params.set("offset", offset)
      const response = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${EVENTS_TABLE_ID}?${params}`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" })
      const result = await response.json()
      if (!response.ok) throw new Error("Could not load events")
      records.push(...(result.records || []))
      offset = result.offset
    } while (offset)
    const now = Date.now()

    const events = records
      .map((record) => {
        const fields = record.fields
        const start = text(fields["Start Date & Time"])
        const end = text(fields["End Date & Time"])
        const startTime = start ? new Date(start).getTime() : Number.NaN
        const endTime = end ? new Date(end).getTime() : Number.NaN
        const effectiveEnd = Number.isFinite(endTime) ? endTime : startTime

        return {
          id: record.id,
          name: text(fields["Event Name"]),
          status: text(fields["Event Status"]),
          type: text(fields["Event Type"]),
          start,
          end,
          allDay: Boolean(fields["All Day Event"]),
          locationName: text(fields["Location Name"]),
          streetAddress: text(fields["Street Address"]),
          city: text(fields["City"]),
          state: text(fields["State"]),
          zip: text(fields["ZIP"]),
          description: text(fields["Event Description"]),
          image: attachments(fields["Event Image"])[0] || "",
          ctaLabel: text(fields["CTA Label"]),
          ctaUrl: text(fields["CTA URL"]),
          publish: Boolean(fields["Publish on Website"]),
          featured: Boolean(fields["Featured on Homepage"]),
          displayOrder:
            typeof fields["Display Order"] === "number" ? fields["Display Order"] : 999,
          effectiveEnd,
        }
      })
      .filter(
        (event) =>
          event.name &&
          event.publish &&
          event.status === "Published" &&
          Number.isFinite(event.effectiveEnd) &&
          event.effectiveEnd >= now
      )
      .sort((a, b) => {
        if (a.featured !== b.featured) return a.featured ? -1 : 1
        if (a.displayOrder !== b.displayOrder) return a.displayOrder - b.displayOrder
        return new Date(a.start).getTime() - new Date(b.start).getTime()
      })
      .slice(0, all ? undefined : 3)
      .map(({ effectiveEnd, ...event }) => event)

    return NextResponse.json({ events }, { headers: { "Cache-Control": "no-store" } })
  } catch (error) {
    console.error("Events listing error", error)
    return NextResponse.json({ error: "We could not load events right now." }, { status: 500 })
  }
}
