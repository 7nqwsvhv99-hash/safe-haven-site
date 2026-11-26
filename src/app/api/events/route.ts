import { NextResponse } from "next/server"
import { eventEndTimestamp } from "@/lib/event-dates"
import { getSafeHavenAirtableConfig } from "@/lib/airtable-config"
import { paidEventRegistrationEnabled } from "@/lib/paypal"

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
    const config = getSafeHavenAirtableConfig()
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
      "Registration / Ticket URL",
      "Visitor Action",
      "Cancellation Reason",
      "Cancellation Contact",
      "Cancellation Notice Through",
      "Reschedule Notice",
      "Reschedule Notice Through",
      "Previous Start Date & Time",
      "Previous End Date & Time",
      "Previous Location",
      "Publish on Website",
      "Featured on Homepage",
      "Display Order",
    ]
    for (const field of fields) params.append("fields[]", field)

    const records: AirtableRecord[] = []
    let offset: string | undefined
    do {
      if (offset) params.set("offset", offset)
      const response = await fetch(`https://api.airtable.com/v0/${config.baseId}/${config.tables.events}?${params}`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" })
      const result = await response.json()
      if (!response.ok) throw new Error("Could not load events")
      records.push(...(result.records || []))
      offset = result.offset
    } while (offset)
    const now = Date.now()

    const optionParams = new URLSearchParams()
    optionParams.set("pageSize", "100")
    for (const field of ["Event", "Active", "Sales Start", "Sales End", "Price", "Option Type"]) optionParams.append("fields[]", field)
    const optionRows: AirtableRecord[] = []
    let optionOffset: string | undefined
    do {
      if (optionOffset) optionParams.set("offset", optionOffset)
      const optionResponse = await fetch(`https://api.airtable.com/v0/${config.baseId}/${config.tables.eventTicketOptions}?${optionParams}`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" })
      const optionResult = await optionResponse.json()
      if (!optionResponse.ok) throw new Error("Could not load event ticket options")
      optionRows.push(...(optionResult.records || []))
      optionOffset = optionResult.offset
    } while (optionOffset)
    const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Chicago", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date())
    const optionsByEvent = new Map<string, Array<{ price: number; type: string }>>()
    for (const record of optionRows) {
      const fields = record.fields
      if (fields.Active !== true) continue
      const start = text(fields["Sales Start"]), end = text(fields["Sales End"])
      if ((start && start > today) || (end && end < today)) continue
      const eventIds = Array.isArray(fields.Event) ? fields.Event as string[] : []
      for (const eventId of eventIds) {
        const list = optionsByEvent.get(eventId) || []
        list.push({ price: typeof fields.Price === "number" ? fields.Price : 0, type: text(fields["Option Type"]) })
        optionsByEvent.set(eventId, list)
      }
    }

    const events = records
      .map((record) => {
        const fields = record.fields
        const start = text(fields["Start Date & Time"])
        const end = text(fields["End Date & Time"])
        const startTime = start ? new Date(start).getTime() : Number.NaN
        const effectiveEnd = eventEndTimestamp(fields)
        const action = text(fields["Visitor Action"])
        const configuredOptions = optionsByEvent.get(record.id) || []
        const activeOptions = action === "RSVP for free" ? configuredOptions.filter(option => option.price === 0) : ["Purchase tickets", "Register and pay"].includes(action) ? paidEventRegistrationEnabled() ? configuredOptions.filter(option => option.price > 0) : [] : configuredOptions
        const paidOptions = activeOptions.filter(option => option.price > 0)
        const admissionPrices = paidOptions.filter(option => !/sponsor/i.test(option.type)).map(option => option.price)
        const hasFreeOption = activeOptions.some(option => option.price === 0)
        const cancelled = text(fields["Event Status"]) === "Cancelled"
        const rescheduleNotice = text(fields["Reschedule Notice"])
        const rescheduleThrough = Date.parse(text(fields["Reschedule Notice Through"]) || "")
        const showRescheduleBanner = Boolean(rescheduleNotice) && (!Number.isFinite(rescheduleThrough) ? effectiveEnd >= now : rescheduleThrough >= now)
        const cancellationThrough = Date.parse(text(fields["Cancellation Notice Through"]) || "")

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
          ctaUrl: action === "Learn more" ? text(fields["Registration / Ticket URL"]) : action ? "" : text(fields["CTA URL"]),
          registrationUrl: text(fields["Registration / Ticket URL"]),
          visitorAction: action,
          cancelled,
          cancellationReason: text(fields["Cancellation Reason"]),
          cancellationContact: text(fields["Cancellation Contact"]),
          hasCancellationNotice: cancelled && Number.isFinite(cancellationThrough) && cancellationThrough >= now,
          rescheduleNotice: showRescheduleBanner ? rescheduleNotice : "",
          showRescheduleBanner,
          previousStart: text(fields["Previous Start Date & Time"]),
          previousEnd: text(fields["Previous End Date & Time"]),
          previousLocation: text(fields["Previous Location"]),
          hasPaidReservations: paidOptions.length > 0,
          hasFreeRsvp: hasFreeOption,
          hasRegistrationOptions: !cancelled && (action ? ["RSVP for free", "Purchase tickets", "Register and pay"].includes(action) && activeOptions.length > 0 : activeOptions.length > 0),
          startingPrice: admissionPrices.length ? Math.min(...admissionPrices) : null,
          hasSponsorship: paidOptions.some(option => /sponsor/i.test(option.type)),
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
          (all || (event.featured && !event.cancelled)) &&
          ((event.status === "Published" && Number.isFinite(event.effectiveEnd) && event.effectiveEnd >= now) || event.hasCancellationNotice)
      )
      .sort((a, b) => {
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
