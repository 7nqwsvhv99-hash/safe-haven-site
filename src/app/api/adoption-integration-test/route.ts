import { NextResponse } from "next/server"

export async function GET() {
  const token = process.env.AIRTABLE_ACCESS_TOKEN
  if (!token) return NextResponse.json({ error: "Missing Airtable configuration" }, { status: 500 })

  const now = new Date()
  const applicationId = `TEST-${now.toISOString().slice(0, 10).replaceAll("-", "")}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`
  const fields = {
    "Application ID": applicationId,
    "Submitted At": now.toISOString(),
    "Status": "New",
    "Application Type": "Specific Animal(s)",
    "Species Interest": ["Cat"],
    "Preferred Animal": ["recJhJBc10Fwxwx3m"],
    "First Name": "Website",
    "Last Name": "Integration Test",
    "Email": "safehaven1471@gmail.com",
    "Phone": "815-858-2265",
    "Preferred Contact": "Email",
    "Street Address": "1471 US Hwy 20 W",
    "City": "Elizabeth",
    "State": "IL",
    "ZIP": "61028",
    "Applicant Is 18+": true,
    "Employment Status": "Employed",
    "In School": "No",
    "How Heard About Us": "Website integration test",
    "Residence Type": "House",
    "Own or Rent": "Own",
    "Other Adults in Home": "TEST DATA - none",
    "Children in Home": "TEST DATA - none",
    "Current / Previous Pet Experience": "TEST DATA - prior cat ownership",
    "Current Pets": "TEST DATA - none",
    "All Household Members Agree": "Yes",
    "Household Allergies": "TEST DATA - none",
    "Long-Term Commitment": "Yes",
    "Care Plan if Unable to Keep Pet": "TEST DATA - contact Safe Haven",
    "Can Provide Timely Veterinary Care": "Yes",
    "Primary Feeding Caregiver": "Website Integration Test",
    "Pet Sleep Location": "TEST DATA - indoors",
    "Pet Location When Alone": "TEST DATA - indoors",
    "Longest Time Alone": "TEST DATA - 4 hours",
    "Vacation Care Plan": "TEST DATA - trusted pet sitter",
    "Willing to Allow Adjustment Time": "Yes",
    "Behaviors Willing to Work On": ["Needs Social Skills", "Accidents in the House"],
    "Reasons for Adoption": ["Family Companion"],
    "Ready to Adopt": "TEST DATA - immediately",
    "Other Pets Interested In": "Maple",
    "Anything Else": "TEST SUBMISSION. Safe to delete after verification.",
    "Reference 1 Name": "Test Reference One",
    "Reference 1 Phone": "815-555-0101",
    "Reference 1 Years Acquainted": "5",
    "Reference 1 Non-Family Confirmed": true,
    "Reference 2 Name": "Test Reference Two",
    "Reference 2 Phone": "815-555-0102",
    "Reference 2 Years Acquainted": "4",
    "Reference 2 Non-Family Confirmed": true,
    "Has Used Veterinarian": "No",
    "Authorization Agreed": true
  }

  const response = await fetch("https://api.airtable.com/v0/app2vpch2JJVrP9pu/tblmDw2mrdg40JyoF", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ records: [{ fields }], typecast: true })
  })
  const result = await response.json()
  if (!response.ok) return NextResponse.json({ error: result }, { status: 502 })
  return NextResponse.json({ ok: true, applicationId, recordId: result.records?.[0]?.id })
}
