import { NextResponse } from "next/server"

const AIRTABLE_BASE_ID = "app2vpch2JJVrP9pu"
const AIRTABLE_VOLUNTEER_APPLICATIONS_TABLE_ID = "tblonEhsjg3vWumoj"

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : ""
}

function asStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0) : []
}

function lines(entries: Array<[string, unknown]>) {
  return entries
    .map(([label, value]) => {
      const text = Array.isArray(value) ? value.join(", ") : asString(value)
      return text ? label + ": " + text : ""
    })
    .filter(Boolean)
    .join("\n")
}

export async function POST(request: Request) {
  try {
    const token = process.env.AIRTABLE_ACCESS_TOKEN
    if (!token) return NextResponse.json({ error: "Server configuration is incomplete." }, { status: 500 })

    const body = await request.json()
    const interests = asStringArray(body.volunteerInterests)
    const required: Array<[string, unknown]> = [
      ["First name", body.firstName],
      ["Last name", body.lastName],
      ["Age range", body.ageRange],
      ["Email", body.email],
      ["Street address", body.streetAddress],
      ["City", body.city],
      ["State", body.state],
      ["ZIP", body.zip],
      ["Cell phone", body.cellPhone],
      ["Preferred contact", body.preferredContact],
      ["Employment status", body.employmentStatus],
      ["School status", body.schoolStatus],
      ["How you heard about us", body.howHeard],
      ["Ready to volunteer", body.readyToVolunteer],
      ["Previous rescue volunteer", body.previousRescueVolunteer],
      ["Current dog", body.currentDog],
      ["Past dog", body.pastDog],
      ["Current cat", body.currentCat],
      ["Past cat", body.pastCat],
    ]
    const firstMissing = required.find(([, value]) => !asString(value))
    if (firstMissing) return NextResponse.json({ error: firstMissing[0] + " is required." }, { status: 400 })
    if (interests.length === 0) return NextResponse.json({ error: "Please select at least one volunteer interest." }, { status: 400 })
    if (body.authorizationAgreed !== true) return NextResponse.json({ error: "Volunteer authorization is required." }, { status: 400 })

    const now = new Date()
    const compactDate = now.toISOString().slice(0, 10).replaceAll("-", "")
    const applicationId = "VOL-" + compactDate + "-" + Math.random().toString(36).slice(2, 7).toUpperCase()

    const fields = {
      "Volunteer Application ID": applicationId,
      "Submitted At": now.toISOString(),
      "Status": "New",
      "Applicant Name": asString(body.firstName) + " " + asString(body.lastName),
      "Email": asString(body.email),
      "Cell Phone": asString(body.cellPhone),
      "Contact & Address": lines([
        ["Age Range", body.ageRange],
        ["Preferred Contact", body.preferredContact],
        ["Street Address", body.streetAddress],
        ["Unit / Apt", body.unitApt],
        ["City", body.city],
        ["State / Province", body.state],
        ["ZIP / Postal Code", body.zip],
        ["Home Phone", body.homePhone],
        ["Work Phone", body.workPhone],
      ]),
      "Employment & School": lines([
        ["Employment Status", body.employmentStatus],
        ["Employer", body.employer],
        ["School Status", body.schoolStatus],
      ]),
      "Availability": lines([
        ["Ready to Volunteer", body.readyToVolunteer],
        ["Days Available", asStringArray(body.daysAvailable)],
        ["Best Times", asStringArray(body.timesAvailable)],
      ]),
      "Experience & Interests": lines([
        ["How Heard About Us", body.howHeard],
        ["Referral Details", body.howHeardDetails],
        ["Previous Rescue Volunteer", body.previousRescueVolunteer],
        ["Previous Organizations", body.previousOrganizations],
        ["Previous Duties", body.previousDuties],
        ["Currently Has a Dog", body.currentDog],
        ["Had a Dog in the Past", body.pastDog],
        ["Dog Breed Experience", body.dogBreedExperience],
        ["Currently Has a Cat", body.currentCat],
        ["Had a Cat in the Past", body.pastCat],
        ["Animal Experience", body.animalExperience],
        ["Volunteer Interests", interests],
        ["Anything Else", body.anythingElse],
      ]),
      "Authorization Agreed": true,
    }

    const response = await fetch("https://api.airtable.com/v0/" + AIRTABLE_BASE_ID + "/" + AIRTABLE_VOLUNTEER_APPLICATIONS_TABLE_ID, {
      method: "POST",
      headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
      body: JSON.stringify({ records: [{ fields }], typecast: true }),
    })
    const result = await response.json()

    if (!response.ok) {
      console.error("Airtable volunteer application error", result)
      return NextResponse.json({ error: "We could not submit your volunteer application. Please try again or contact Safe Haven." }, { status: 502 })
    }

    return NextResponse.json({ ok: true, applicationId, recordId: result?.records?.[0]?.id })
  } catch (error) {
    console.error("Volunteer application submission error", error)
    return NextResponse.json({ error: "We could not submit your volunteer application. Please try again or contact Safe Haven." }, { status: 500 })
  }
}
