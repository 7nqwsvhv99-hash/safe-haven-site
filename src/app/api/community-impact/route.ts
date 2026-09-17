import { NextResponse } from "next/server"

const AIRTABLE_ACCESS_TOKEN = process.env.AIRTABLE_ACCESS_TOKEN

const SHELTER_BASE_ID = "app2vpch2JJVrP9pu"
const ANIMALS_TABLE_ID = "tbliTXWvG7gdf023E"
const CLINICDAY_BASE_ID = "app3AcoD2G64aMsEz"
const SURGERY_RECORDS_TABLE_ID = "tbltBWO00PSHVHuXu"
const TIME_ZONE = "America/Chicago"

const ADOPTION_2026_BASELINE = {
  total: 84,
  cats: 52,
  dogs: 32,
}

const SURGERY_2026_BASELINE = 78

const FOOD_POUNDS_BY_YEAR: Record<number, string> = {
  2026: "16,000+",
}

type AirtableRecord = {
  id: string
  fields: Record<string, unknown>
}

type AirtableResponse = {
  records?: AirtableRecord[]
  offset?: string
  error?: unknown
}

function text(value: unknown) {
  return typeof value === "string" ? value : ""
}

function yearInChicago(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return null

  const year = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    year: "numeric",
  }).format(date)

  return Number(year)
}

async function fetchAllAirtableRecords({
  baseId,
  tableId,
  fields,
  filterByFormula,
}: {
  baseId: string
  tableId: string
  fields: string[]
  filterByFormula: string
}) {
  if (!AIRTABLE_ACCESS_TOKEN) throw new Error("AIRTABLE_ACCESS_TOKEN is missing")

  const records: AirtableRecord[] = []
  let offset: string | undefined

  do {
    const params = new URLSearchParams()
    params.set("pageSize", "100")
    params.set("filterByFormula", filterByFormula)
    for (const field of fields) params.append("fields[]", field)
    if (offset) params.set("offset", offset)

    const response = await fetch(
      `https://api.airtable.com/v0/${baseId}/${tableId}?${params.toString()}`,
      {
        headers: { Authorization: `Bearer ${AIRTABLE_ACCESS_TOKEN}` },
        cache: "no-store",
      }
    )

    const result = (await response.json()) as AirtableResponse
    if (!response.ok) {
      console.error("Community impact Airtable error", result)
      throw new Error(`Airtable request failed with status ${response.status}`)
    }

    records.push(...(result.records || []))
    offset = result.offset
  } while (offset)

  return records
}

export async function GET() {
  try {
    const year = yearInChicago(new Date())
    if (!year) throw new Error("Unable to determine current year")

    const [adoptionRecords, surgeryRecords] = await Promise.all([
      fetchAllAirtableRecords({
        baseId: SHELTER_BASE_ID,
        tableId: ANIMALS_TABLE_ID,
        fields: ["Species", "Website Adoption Count Date"],
        filterByFormula: 'NOT({Website Adoption Count Date}=BLANK())',
      }),
      fetchAllAirtableRecords({
        baseId: CLINICDAY_BASE_ID,
        tableId: SURGERY_RECORDS_TABLE_ID,
        fields: ["Surgery_Outcome", "Surgery End Time"],
        filterByFormula: 'AND({Surgery_Outcome}="Completed",NOT({Surgery End Time}=BLANK()))',
      }),
    ])

    const currentYearAdoptions = adoptionRecords.filter(
      (record) => yearInChicago(text(record.fields["Website Adoption Count Date"])) === year
    )

    const newCats = currentYearAdoptions.filter(
      (record) => text(record.fields.Species) === "Cat"
    ).length
    const newDogs = currentYearAdoptions.filter(
      (record) => text(record.fields.Species) === "Dog"
    ).length

    const adoptionBaseline = year === 2026 ? ADOPTION_2026_BASELINE : { total: 0, cats: 0, dogs: 0 }
    const adoptions = adoptionBaseline.total + currentYearAdoptions.length
    const cats = adoptionBaseline.cats + newCats
    const dogs = adoptionBaseline.dogs + newDogs

    const completedSurgeriesThisYear = surgeryRecords.filter(
      (record) => yearInChicago(text(record.fields["Surgery End Time"])) === year
    ).length
    const surgeries = (year === 2026 ? SURGERY_2026_BASELINE : 0) + completedSurgeriesThisYear

    return NextResponse.json(
      {
        year,
        foodPounds: FOOD_POUNDS_BY_YEAR[year] ?? "—",
        surgeries,
        adoptions,
        cats,
        dogs,
        veterinarySavingsDisplay: year === 2026 ? "$71,000+" : null,
      },
      { headers: { "Cache-Control": "no-store" } }
    )
  } catch (error) {
    console.error("Community impact error", error)
    return NextResponse.json(
      { error: "We could not load community impact data right now." },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    )
  }
}
