import { NextResponse } from "next/server"

const AIRTABLE_BASE_ID = "app2vpch2JJVrP9pu"
const VOLUNTEERS_TABLE_ID = "tblpVwUgbClbtcQfz"
const VOLUNTEER_HOURS_TABLE_ID = "tblEHjmBlgEg9Z7Tm"
const TIME_ZONE = "America/Chicago"

const ACTIVITIES = [
  "Clinic",
  "Adoption & Community Events",
  "Host an Event or Fundraiser",
  "Transportation",
  "Gardening & Grounds",
  "Dog Socializing & Exercise",
  "Cat Socializing & Enrichment",
  "Pet Food Pantry",
  "Building Maintenance",
  "Photography",
  "Social Media & Content",
  "Administrative Support",
  "Fundraising & Event Support",
  "Other",
] as const

type AirtableRecord = {
  id: string
  fields: Record<string, unknown>
}

type AirtableListResponse = {
  records?: AirtableRecord[]
  offset?: string
  error?: unknown
}

type VolunteerOption = {
  id: string
  displayName: string
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : ""
}

function number(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null
}

function chicagoDate() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date())

  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${values.year}-${values.month}-${values.day}`
}

function shortName(fullName: string) {
  const pieces = fullName.trim().split(/\s+/).filter(Boolean)
  if (pieces.length === 0) return "Volunteer"
  if (pieces.length === 1) return pieces[0]
  return `${pieces[0]} ${pieces[pieces.length - 1].charAt(0).toUpperCase()}.`
}

async function fetchActiveVolunteers(token: string): Promise<VolunteerOption[]> {
  const records: AirtableRecord[] = []
  let offset: string | undefined

  do {
    const params = new URLSearchParams()
    params.set("pageSize", "100")
    params.set("filterByFormula", '{Status}="Active"')
    params.append("fields[]", "Volunteer Name")
    params.append("fields[]", "Volunteer ID")
    params.append("fields[]", "Status")
    params.append("sort[0][field]", "Volunteer Name")
    params.append("sort[0][direction]", "asc")
    if (offset) params.set("offset", offset)

    const response = await fetch(
      `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${VOLUNTEERS_TABLE_ID}?${params.toString()}`,
      {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      }
    )

    const result = (await response.json()) as AirtableListResponse
    if (!response.ok) {
      console.error("Airtable active volunteer lookup error", result)
      throw new Error("Unable to load active volunteers")
    }

    records.push(...(result.records || []))
    offset = result.offset
  } while (offset)

  const baseNames = records.map((record) => shortName(text(record.fields["Volunteer Name"])))
  const counts = new Map<string, number>()
  for (const name of baseNames) counts.set(name, (counts.get(name) || 0) + 1)

  return records.map((record, index) => {
    const baseName = baseNames[index]
    const volunteerNumber = number(record.fields["Volunteer ID"])
    const needsId = (counts.get(baseName) || 0) > 1

    return {
      id: record.id,
      displayName: needsId && volunteerNumber ? `${baseName} · V${volunteerNumber}` : baseName,
    }
  })
}

export async function GET() {
  try {
    const token = process.env.AIRTABLE_ACCESS_TOKEN
    if (!token) {
      return NextResponse.json({ error: "Server configuration is incomplete." }, { status: 500 })
    }

    const volunteers = await fetchActiveVolunteers(token)

    return NextResponse.json(
      {
        volunteers,
        activities: ACTIVITIES,
        today: chicagoDate(),
      },
      { headers: { "Cache-Control": "no-store" } }
    )
  } catch (error) {
    console.error("Volunteer hours form load error", error)
    return NextResponse.json({ error: "We could not load the volunteer hours form right now." }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const token = process.env.AIRTABLE_ACCESS_TOKEN
    if (!token) {
      return NextResponse.json({ error: "Server configuration is incomplete." }, { status: 500 })
    }

    const body = await request.json()
    const date = text(body.date)
    const activity = text(body.activity)
    const hours = typeof body.hours === "number" ? body.hours : Number(body.hours)
    const volunteerIds = Array.isArray(body.volunteerIds)
      ? Array.from(new Set(body.volunteerIds.filter((value: unknown): value is string => typeof value === "string" && value.startsWith("rec"))))
      : []

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: "Please enter a valid date." }, { status: 400 })
    }
    if (!Number.isFinite(hours) || hours <= 0 || hours > 24) {
      return NextResponse.json({ error: "Hours must be greater than 0 and no more than 24." }, { status: 400 })
    }
    if (!ACTIVITIES.includes(activity as (typeof ACTIVITIES)[number])) {
      return NextResponse.json({ error: "Please select a valid volunteer activity." }, { status: 400 })
    }
    if (volunteerIds.length === 0) {
      return NextResponse.json({ error: "Please select at least one volunteer." }, { status: 400 })
    }
    if (volunteerIds.length > 50) {
      return NextResponse.json({ error: "Please submit no more than 50 volunteers at once." }, { status: 400 })
    }

    const activeVolunteers = await fetchActiveVolunteers(token)
    const activeIds = new Set(activeVolunteers.map((volunteer) => volunteer.id))
    const invalidSelection = volunteerIds.some((id) => !activeIds.has(id))
    if (invalidSelection) {
      return NextResponse.json({ error: "One or more selected volunteers are no longer active. Please refresh and try again." }, { status: 400 })
    }

    const response = await fetch(
      `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${VOLUNTEER_HOURS_TABLE_ID}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          records: [
            {
              fields: {
                Date: date,
                Volunteer: volunteerIds,
                Hours: hours,
                "Volunteer Activity": activity,
              },
            },
          ],
          typecast: true,
        }),
      }
    )

    const result = await response.json()
    if (!response.ok) {
      console.error("Airtable volunteer hours submission error", result)
      return NextResponse.json({ error: "We could not record these volunteer hours. Please try again." }, { status: 502 })
    }

    return NextResponse.json({
      ok: true,
      participants: volunteerIds.length,
      totalVolunteerHours: Math.round(hours * volunteerIds.length * 100) / 100,
      recordId: result?.records?.[0]?.id,
    })
  } catch (error) {
    console.error("Volunteer hours submission error", error)
    return NextResponse.json({ error: "We could not record these volunteer hours. Please try again." }, { status: 500 })
  }
}
