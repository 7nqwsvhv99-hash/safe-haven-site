import { NextResponse } from "next/server"

const AIRTABLE_ACCESS_TOKEN = process.env.AIRTABLE_ACCESS_TOKEN
const CLINICDAY_BASE_ID = "app3AcoD2G64aMsEz"

const CASES_TABLE_ID = "tblOz2F29cXimUoMY"
const SURGERY_RECORDS_TABLE_ID = "tbltBWO00PSHVHuXu"
const SERVICE_LINE_ITEMS_TABLE_ID = "tbl4c4F75WlPfTh7D"
const CLINIC_DAYS_TABLE_ID = "tblnOw4Qr5AvCRWvQ"

const TIME_ZONE = "America/Chicago"

// Historical 2026 activity that predates the current ClinicDay record structure.
// These baselines reconcile the live Airtable records to the verified Canva
// Community Impact presentation.
const ANIMALS_SERVED_2026_BASELINE = 99
const SURGERY_2026_BASELINE = 20
const SERVICES_2026_BASELINE = 69

type AirtableRecord = {
  id: string
  fields: Record<string, unknown>
}

type AirtableResponse = {
  records?: AirtableRecord[]
  offset?: string
  error?: unknown
}

function yearInChicago(value: unknown) {
  if (typeof value !== "string" || !value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null

  return Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: TIME_ZONE,
      year: "numeric",
    }).format(date)
  )
}

function selectName(value: unknown) {
  if (!value || typeof value !== "object" || !("name" in value)) return ""
  const name = (value as { name?: unknown }).name
  return typeof name === "string" ? name.trim() : ""
}

function normalizePlace(value: unknown) {
  if (typeof value !== "string") return ""

  return value
    .trim()
    .toLowerCase()
    .replace(/[.,]/g, "")
    .replace(/\s+/g, " ")
}

function numberValue(value: unknown) {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

async function fetchAllAirtableRecords({
  tableId,
  fields,
  filterByFormula,
}: {
  tableId: string
  fields: string[]
  filterByFormula?: string
}) {
  if (!AIRTABLE_ACCESS_TOKEN) throw new Error("AIRTABLE_ACCESS_TOKEN is missing")

  const records: AirtableRecord[] = []
  let offset: string | undefined

  do {
    const params = new URLSearchParams()
    params.set("pageSize", "100")
    for (const field of fields) params.append("fields[]", field)
    if (filterByFormula) params.set("filterByFormula", filterByFormula)
    if (offset) params.set("offset", offset)

    const response = await fetch(
      `https://api.airtable.com/v0/${CLINICDAY_BASE_ID}/${tableId}?${params.toString()}`,
      {
        headers: { Authorization: `Bearer ${AIRTABLE_ACCESS_TOKEN}` },
        cache: "no-store",
      }
    )

    const result = (await response.json()) as AirtableResponse

    if (!response.ok) {
      console.error("Clinic impact Airtable error", result)
      throw new Error(`Airtable request failed with status ${response.status}`)
    }

    records.push(...(result.records || []))
    offset = result.offset
  } while (offset)

  return records
}

export async function GET() {
  try {
    const currentYear = Number(
      new Intl.DateTimeFormat("en-US", {
        timeZone: TIME_ZONE,
        year: "numeric",
      }).format(new Date())
    )

    const [cases, surgeryRecords, serviceLineItems, clinicDays] =
      await Promise.all([
        fetchAllAirtableRecords({
          tableId: CASES_TABLE_ID,
          fields: [
            "Visit Completed Time",
            "City",
            "County",
            "State",
            "Rabies Date Administered",
          ],
        }),
        fetchAllAirtableRecords({
          tableId: SURGERY_RECORDS_TABLE_ID,
          fields: ["Surgery_Outcome", "Surgery End Time"],
          filterByFormula:
            'AND({Surgery_Outcome}="Completed",NOT({Surgery End Time}=BLANK()))',
        }),
        fetchAllAirtableRecords({
          tableId: SERVICE_LINE_ITEMS_TABLE_ID,
          fields: [
            "Service_Outcome",
            "Clinic Day",
            "Report - Safe Haven Estimated Avoided External Cost",
            "Report - Community Estimated Veterinary Savings",
          ],
        }),
        fetchAllAirtableRecords({
          tableId: CLINIC_DAYS_TABLE_ID,
          fields: ["Clinic_Date"],
        }),
      ])

    const completedCasesThisYear = cases.filter(
      (record) => yearInChicago(record.fields["Visit Completed Time"]) === currentYear
    )

    const animalsServed =
      (currentYear === 2026 ? ANIMALS_SERVED_2026_BASELINE : 0) +
      completedCasesThisYear.length

    const surgeries =
      (currentYear === 2026 ? SURGERY_2026_BASELINE : 0) +
      surgeryRecords.filter(
        (record) => yearInChicago(record.fields["Surgery End Time"]) === currentYear
      ).length

    const performedServicesThisYear = serviceLineItems.filter((record) => {
      const outcome = selectName(record.fields["Service_Outcome"])
      const clinicDayText = JSON.stringify(record.fields["Clinic Day"] ?? "")
      return (
        (outcome === "Performed" || outcome === "Waived") &&
        clinicDayText.includes(String(currentYear))
      )
    }).length

    const servicesProvided =
      (currentYear === 2026 ? SERVICES_2026_BASELINE : 0) +
      performedServicesThisYear

    const rabiesVaccines = cases.filter(
      (record) => yearInChicago(record.fields["Rabies Date Administered"]) === currentYear
    ).length

    const safeHavenCostsAvoided = serviceLineItems.reduce(
      (sum, record) =>
        sum +
        numberValue(
          record.fields["Report - Safe Haven Estimated Avoided External Cost"]
        ),
      0
    )

    const communitySavings = serviceLineItems.reduce(
      (sum, record) =>
        sum +
        numberValue(
          record.fields["Report - Community Estimated Veterinary Savings"]
        ),
      0
    )

    const towns = new Set(
      completedCasesThisYear
        .map((record) => normalizePlace(record.fields.City))
        .filter(Boolean)
    ).size

    const counties = new Set(
      completedCasesThisYear
        .map((record) => selectName(record.fields.County).toLowerCase())
        .filter(Boolean)
    ).size

    const states = new Set(
      completedCasesThisYear
        .map((record) => selectName(record.fields.State).toUpperCase())
        .filter(Boolean)
    ).size

    const clinicDayCount = clinicDays.filter(
      (record) => yearInChicago(record.fields.Clinic_Date) === currentYear
    ).length

    return NextResponse.json(
      {
        year: currentYear,
        clinicDays: clinicDayCount,
        animalsServed,
        surgeries,
        servicesProvided,
        rabiesVaccines,
        safeHavenCostsAvoided,
        communitySavings,
        towns,
        counties,
        states,
      },
      { headers: { "Cache-Control": "no-store" } }
    )
  } catch (error) {
    console.error("Clinic impact error", error)
    return NextResponse.json(
      { error: "We could not load clinic impact data right now." },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    )
  }
}
