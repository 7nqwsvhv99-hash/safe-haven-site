import { NextResponse } from "next/server"

const AIRTABLE_BASE_ID = "app2vpch2JJVrP9pu"
const AIRTABLE_ANIMALS_TABLE_ID = "tbliTXWvG7gdf023E"

const PUBLIC_FIELDS = [
  "Animal ID",
  "Pet Name",
  "Species",
  "Adoption Status",
  "Sex",
  "Date of Birth",
  "Age Display",
  "Breed",
  "Color / Markings",
  "Weight (lb)",
  "Adoption Fee",
  "Adoption Fee Status",
  "Short Bio",
  "Traits",
  "Good With Cats",
  "Good With Dogs",
  "Good With Children",
  "House / Litter Trained",
  "Compatibility Notes",
  "Medical Summary",
  "Adoption Includes",
  "Primary Photo",
  "Additional Photos",
  "Available Since",
  "Public Listing",
  "Housing Type",
  "Website Listing Readiness",
  "Bonded With",
  "From field: Bonded With",
  "Bonded Pair?",
]

type AirtableAttachment = {
  id?: string
  url?: string
  filename?: string
  type?: string
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

function strings(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []
}

function attachments(value: unknown) {
  if (!Array.isArray(value)) return []
  return value
    .filter((item): item is AirtableAttachment => Boolean(item && typeof item === "object" && "url" in item))
    .map((item) => ({
      url: item.url || "",
      filename: item.filename || "",
      thumbnail: item.thumbnails?.large?.url || item.thumbnails?.full?.url || item.url || "",
    }))
    .filter((item) => item.url)
}

function pendingImage(species: string) {
  return species === "Dog" ? "/images/adoption-pending-dog.webp" : "/images/adoption-pending-cat.webp"
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
      'AND({Public Listing}=1,{Website Listing Readiness}="Ready",OR({Adoption Status}="Available",{Adoption Status}="Pending",{Adoption Status}="Getting Ready for Adoption"))'
    )
    params.append("sort[0][field]", "Pet Name")
    params.append("sort[0][direction]", "asc")
    params.set("pageSize", "100")
    for (const field of PUBLIC_FIELDS) params.append("fields[]", field)

    const response = await fetch(
      `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_ANIMALS_TABLE_ID}?${params.toString()}`,
      {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      }
    )

    const result = await response.json()
    if (!response.ok) {
      console.error("Airtable animal listing error", result)
      return NextResponse.json({ error: "We could not load the animals right now." }, { status: 502 })
    }

    const records = (result.records || []) as AirtableRecord[]
    const namesById = new Map(records.map((record) => [record.id, text(record.fields["Pet Name"])]))

    const animals = records.map((record) => {
      const fields = record.fields
      const species = text(fields["Species"])
      const status = text(fields["Adoption Status"])
      const primaryPhotos = attachments(fields["Primary Photo"])
      const additionalPhotos = attachments(fields["Additional Photos"])
      const bondedIds = Array.from(
        new Set([...strings(fields["Bonded With"]), ...strings(fields["From field: Bonded With"])])
      ).filter((id) => id !== record.id)
      const bondedWith = bondedIds
        .map((id) => ({ id, name: namesById.get(id) || "Bonded companion" }))
        .filter((item) => item.name)

      return {
        id: record.id,
        animalId: text(fields["Animal ID"]),
        name: text(fields["Pet Name"]),
        species,
        status,
        sex: text(fields["Sex"]),
        dateOfBirth: text(fields["Date of Birth"]),
        age: text(fields["Age Display"]),
        breed: text(fields["Breed"]),
        color: text(fields["Color / Markings"]),
        weight: number(fields["Weight (lb)"]),
        fee: number(fields["Adoption Fee"]),
        feeStatus: text(fields["Adoption Fee Status"]),
        bio: text(fields["Short Bio"]),
        traits: strings(fields["Traits"]),
        goodWithCats: text(fields["Good With Cats"]),
        goodWithDogs: text(fields["Good With Dogs"]),
        goodWithChildren: text(fields["Good With Children"]),
        houseTrained: text(fields["House / Litter Trained"]),
        compatibilityNotes: text(fields["Compatibility Notes"]),
        medicalSummary: text(fields["Medical Summary"]),
        adoptionIncludes: text(fields["Adoption Includes"]),
        housingType: text(fields["Housing Type"]),
        availableSince: text(fields["Available Since"]),
        bondedPair: text(fields["Bonded Pair?"]) === "Yes",
        bondedWith,
        primaryPhoto: status === "Pending" ? pendingImage(species) : primaryPhotos[0]?.url || "",
        photos: status === "Pending" ? [pendingImage(species)] : [...primaryPhotos, ...additionalPhotos].map((photo) => photo.url),
      }
    })

    return NextResponse.json({ animals }, { headers: { "Cache-Control": "no-store" } })
  } catch (error) {
    console.error("Animal listing error", error)
    return NextResponse.json({ error: "We could not load the animals right now." }, { status: 500 })
  }
}
