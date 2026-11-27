import { NextResponse } from "next/server";

const AIRTABLE_BASE_ID = "app2vpch2JJVrP9pu";
const AIRTABLE_SURRENDER_REQUESTS_TABLE_ID = "tblEFkAKG8KxtlSWj";

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function responseError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request) {
  try {
    const token = process.env.OWNER_SURRENDER_AIRTABLE_TOKEN || process.env.AIRTABLE_ACCESS_TOKEN;
    if (!token) return responseError("The request form is temporarily unavailable. Please call Safe Haven.", 500);

    const body = await request.json();
    // Quietly accept honeypot submissions without adding junk to the staff queue.
    if (text(body.website)) return NextResponse.json({ ok: true });

    const required: Array<[string, unknown]> = [
      ["First name", body.firstName],
      ["Last name", body.lastName],
      ["Email", body.email],
      ["Phone", body.phone],
      ["Street address", body.streetAddress],
      ["City", body.city],
      ["State", body.state],
      ["ZIP code", body.zip],
      ["Animal name", body.animalName],
      ["Species", body.species],
      ["Reason for requesting surrender", body.reason],
    ];
    const missing = required.find(([, value]) => !text(value));
    if (missing) return responseError(missing[0] + " is required.");
    if (!["Cat", "Dog", "Other"].includes(text(body.species))) return responseError("Select a valid species.");
    if (!["Female", "Male", "Unknown"].includes(text(body.sex))) return responseError("Select a valid sex.");
    if (!["Altered", "Not Altered", "Unknown"].includes(text(body.altered))) return responseError("Select a spay/neuter status.");
    if (!["Yes", "No", "Unknown"].includes(text(body.microchipKnown))) return responseError("Select whether a microchip is known.");
    if (!["Soon", "Urgent"].includes(text(body.urgency))) return responseError("Select a valid timeframe.");
    if (body.confirmAccurate !== true) return responseError("Please confirm that the information is accurate.");
    const email = text(body.email).toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return responseError("Enter a valid email address.");
    if (JSON.stringify(body).length > 20_000) return responseError("The request is too large. Shorten the notes and try again.");

    const submittedAt = new Date().toISOString();
    const fields: Record<string, unknown> = {
      "Submitted At": submittedAt,
      Status: "New",
      "Owner First Name": text(body.firstName),
      "Owner Last Name": text(body.lastName),
      Email: email,
      Phone: text(body.phone),
      "Street Address": [text(body.streetAddress), text(body.unitApt)].filter(Boolean).join(", "),
      City: text(body.city),
      State: text(body.state),
      ZIP: text(body.zip),
      "Animal Name": text(body.animalName),
      Species: text(body.species),
      Sex: text(body.sex),
      "Approximate Age": text(body.approximateAge),
      "Breed / Mix": text(body.breed),
      "Spay / Neuter Status": text(body.altered),
      "Microchip Known": text(body.microchipKnown),
      "Reason for Surrender": text(body.reason),
      "Behavior / Safety Notes": text(body.behaviorNotes),
      "Medical Conditions / Medications": text(body.medicalNotes),
      "Current Veterinarian": text(body.veterinarian),
      ...(text(body.microchipNumber) ? { "Microchip Number": text(body.microchipNumber) } : {}),
      ...(text(body.microchipManufacturer) ? { "Microchip Manufacturer": text(body.microchipManufacturer) } : {}),
      ...(text(body.veterinarianPhone) ? { "Veterinarian Phone": text(body.veterinarianPhone) } : {}),
      ...(text(body.veterinarianAddress) ? { "Veterinarian Address": text(body.veterinarianAddress) } : {}),
      Urgency: text(body.urgency),
      ...(text(body.requestedDate) ? { "Requested Surrender Date": text(body.requestedDate) } : {}),
      ...(text(body.canKeepUntil) ? { "Can Keep Animal Until": text(body.canKeepUntil) } : {}),
    };
    const airtableResponse = await fetch(
      `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_SURRENDER_REQUESTS_TABLE_ID}`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ records: [{ fields }], typecast: true }),
        cache: "no-store",
      }
    );
    const result = await airtableResponse.json();
    if (!airtableResponse.ok) {
      console.error("Airtable owner surrender request error", result);
      return responseError("We could not submit your request. Please call Safe Haven at (815) 858-2265.", 502);
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Owner surrender request submission error", error);
    return responseError("We could not submit your request. Please try again or call Safe Haven.", 500);
  }
}
