import { NextResponse } from "next/server"
import { getSafeHavenAirtableConfig } from "@/lib/airtable-config"
import { comparePublicAnnouncements, toPublicAnnouncement } from "@/lib/announcement-policy"

type AirtableRecord = { id: string; fields: Record<string, unknown> }

const PUBLIC_FIELDS = ["Title", "Notice Type", "Public Message", "Status", "Display Start", "Expires At", "Priority"]

export const dynamic = "force-dynamic"

function text(value: unknown) {
  return typeof value === "string" ? value : ""
}

export async function GET() {
  try {
    const token = process.env.AIRTABLE_ACCESS_TOKEN
    if (!token) return NextResponse.json({ error: "Announcements are temporarily unavailable." }, { status: 503 })

    const config = getSafeHavenAirtableConfig()
    const tableId = config.tables.publicAnnouncements
    if (!tableId) return NextResponse.json({ error: "Announcements are temporarily unavailable." }, { status: 503 })

    const rows: AirtableRecord[] = []
    let offset = ""
    do {
      const params = new URLSearchParams()
      params.set("pageSize", "100")
      params.set("filterByFormula", '{Status}="Published"')
      for (const field of PUBLIC_FIELDS) params.append("fields[]", field)
      if (offset) params.set("offset", offset)

      const response = await fetch(
        `https://api.airtable.com/v0/${config.baseId}/${tableId}?${params.toString()}`,
        { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }
      )
      if (!response.ok) {
        console.error("Public announcements could not be loaded", response.status)
        return NextResponse.json({ error: "Announcements are temporarily unavailable." }, { status: 502 })
      }
      const result = await response.json() as { records?: AirtableRecord[]; offset?: string }
      rows.push(...(result.records || []))
      offset = result.offset || ""
    } while (offset)

    const now = Date.now()
    const announcements = rows
      .map((record) => toPublicAnnouncement(record, now))
      .filter((record): record is NonNullable<typeof record> => record !== null)
      .sort(comparePublicAnnouncements)

    return NextResponse.json(
      { announcements },
      { headers: { "Cache-Control": "no-store, max-age=0" } }
    )
  } catch (error) {
    console.error("Public announcements listing error", error)
    return NextResponse.json({ error: "Announcements are temporarily unavailable." }, { status: 503 })
  }
}
