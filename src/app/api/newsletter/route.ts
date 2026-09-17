import { NextResponse } from "next/server"

const AIRTABLE_BASE_ID = "app2vpch2JJVrP9pu"
const NEWSLETTER_TABLE_ID = "tblWYHSZNniov20FA"

type AirtableRecord = {
  id: string
  fields: Record<string, unknown>
}

type AirtableListResponse = {
  records?: AirtableRecord[]
  error?: unknown
}

function normalizeEmail(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : ""
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function escapeFormulaString(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')
}

async function findSubscriber(token: string, email: string) {
  const params = new URLSearchParams()
  params.set("maxRecords", "1")
  params.set("filterByFormula", `LOWER({Email})=LOWER("${escapeFormulaString(email)}")`)
  params.append("fields[]", "Email")
  params.append("fields[]", "Status")

  const response = await fetch(
    `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${NEWSLETTER_TABLE_ID}?${params.toString()}`,
    {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    }
  )

  const result = (await response.json()) as AirtableListResponse
  if (!response.ok) {
    console.error("Airtable newsletter lookup error", result)
    throw new Error("Unable to check newsletter subscription")
  }

  return result.records?.[0] ?? null
}

export async function POST(request: Request) {
  try {
    const token = process.env.AIRTABLE_ACCESS_TOKEN
    if (!token) {
      return NextResponse.json({ error: "Server configuration is incomplete." }, { status: 500 })
    }

    const body = await request.json()
    const email = normalizeEmail(body.email)

    if (!isValidEmail(email)) {
      return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 })
    }

    const existing = await findSubscriber(token, email)
    const now = new Date().toISOString()

    if (existing) {
      const status = existing.fields.Status
      if (status === "Subscribed") {
        return NextResponse.json({ ok: true, alreadySubscribed: true })
      }

      const response = await fetch(
        `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${NEWSLETTER_TABLE_ID}/${existing.id}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            fields: {
              Email: email,
              Status: "Subscribed",
              "Subscribed At": now,
              Source: "Website",
              "Unsubscribed At": null,
            },
            typecast: true,
          }),
        }
      )

      const result = await response.json()
      if (!response.ok) {
        console.error("Airtable newsletter resubscribe error", result)
        return NextResponse.json({ error: "We could not complete your subscription. Please try again." }, { status: 502 })
      }

      return NextResponse.json({ ok: true, resubscribed: true })
    }

    const response = await fetch(
      `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${NEWSLETTER_TABLE_ID}`,
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
                Email: email,
                Status: "Subscribed",
                "Subscribed At": now,
                Source: "Website",
              },
            },
          ],
          typecast: true,
        }),
      }
    )

    const result = await response.json()
    if (!response.ok) {
      console.error("Airtable newsletter subscription error", result)
      return NextResponse.json({ error: "We could not complete your subscription. Please try again." }, { status: 502 })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Newsletter subscription error", error)
    return NextResponse.json({ error: "We could not complete your subscription. Please try again." }, { status: 500 })
  }
}
