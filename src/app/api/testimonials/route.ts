import { NextResponse } from "next/server"

const AIRTABLE_BASE_ID = "app2vpch2JJVrP9pu"
const AIRTABLE_TESTIMONIALS_TABLE_ID = "tbl8npkpyXTkOdS6V"

const PUBLIC_FIELDS = [
  "Quote",
  "Person / Family Name",
  "Relationship Label",
  "Animal Photo",
  "Website Permission",
  "Approved for Website",
  "Featured",
  "Display Order",
  "Display Animal Name",
]

type AirtableAttachment = {
  url?: string
  filename?: string
  thumbnails?: Record<string, { url?: string; width?: number; height?: number }>
}

type AirtableRecord = {
  id: string
  fields: Record<string, unknown>
}

function text(value: unknown) {
  return typeof value === "string" ? value : ""
}

function number(value: unknown) {
  return typeof value === "number" ? value : null
}

function firstAttachment(value: unknown) {
  if (!Array.isArray(value)) return ""
  const attachment = value.find(
    (item): item is AirtableAttachment =>
      Boolean(item && typeof item === "object" && "url" in item)
  )
  return (
    attachment?.thumbnails?.large?.url ||
    attachment?.thumbnails?.full?.url ||
    attachment?.url ||
    ""
  )
}

export async function GET() {
  try {
    const token = process.env.AIRTABLE_ACCESS_TOKEN
    if (!token) {
      return NextResponse.json({ error: "Server configuration is incomplete." }, { status: 500 })
    }

    const params = new URLSearchParams()
    params.set(
      "filterByFormula",
      'AND({Website Permission}="Granted",{Approved for Website}=1,{Featured}=1)'
    )
    params.append("sort[0][field]", "Display Order")
    params.append("sort[0][direction]", "asc")
    params.set("pageSize", "12")
    for (const field of PUBLIC_FIELDS) params.append("fields[]", field)

    const response = await fetch(
      `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TESTIMONIALS_TABLE_ID}?${params.toString()}`,
      {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      }
    )

    const result = await response.json()
    if (!response.ok) {
      console.error("Airtable testimonials error", result)
      return NextResponse.json({ error: "We could not load adoption stories right now." }, { status: 502 })
    }

    const testimonials = ((result.records || []) as AirtableRecord[]).map((record) => {
      const fields = record.fields
      return {
        id: record.id,
        animalName: text(fields["Display Animal Name"]),
        quote: text(fields["Quote"]),
        personName: text(fields["Person / Family Name"]),
        relationshipLabel: text(fields["Relationship Label"]),
        image: firstAttachment(fields["Animal Photo"]),
        displayOrder: number(fields["Display Order"]),
      }
    })

    return NextResponse.json(
      { testimonials },
      { headers: { "Cache-Control": "no-store" } }
    )
  } catch (error) {
    console.error("Testimonials listing error", error)
    return NextResponse.json({ error: "We could not load adoption stories right now." }, { status: 500 })
  }
}
