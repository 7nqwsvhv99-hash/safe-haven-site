import { NextResponse } from "next/server"

const AIRTABLE_BASE_ID = "app2vpch2JJVrP9pu"
const AIRTABLE_TABLE_ID = "tblmDw2mrdg40JyoF"

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : ""
}

function asStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0) : []
}

function asBoolean(value: unknown) {
  return value === true
}

function missing(value: unknown) {
  if (Array.isArray(value)) return value.length === 0
  if (typeof value === "boolean") return value !== true
  return asString(value).length === 0
}

export async function POST(request: Request) {
  try {
    const token = process.env.AIRTABLE_ACCESS_TOKEN
    if (!token) {
      return NextResponse.json({ error: "Server configuration is incomplete." }, { status: 500 })
    }

    const body = await request.json()

    const applicationType = asString(body.applicationType)
    const speciesInterest = asStringArray(body.speciesInterest)
    const preferredAnimalIds = asStringArray(body.preferredAnimalIds)
    const consideringDog = speciesInterest.includes("Dog")

    const requiredCore: Array<[string, unknown]> = [
      ["Application type", applicationType],
      ["Species interest", speciesInterest],
      ["First name", body.firstName],
      ["Last name", body.lastName],
      ["Email", body.email],
      ["Phone", body.phone],
      ["Preferred contact", body.preferredContact],
      ["Street address", body.streetAddress],
      ["City", body.city],
      ["State", body.state],
      ["ZIP", body.zip],
      ["Applicant is 18+", body.applicantIs18Plus],
      ["Employment status", body.employmentStatus],
      ["In school", body.inSchool],
      ["How heard about us", body.howHeardAboutUs],
      ["Residence type", body.residenceType],
      ["Own or rent", body.ownOrRent],
      ["Other adults in home", body.otherAdultsInHome],
      ["Children in home", body.childrenInHome],
      ["Current / previous pet experience", body.petExperience],
      ["Current pets", body.currentPets],
      ["All household members agree", body.allHouseholdMembersAgree],
      ["Household allergies", body.householdAllergies],
      ["Long-term commitment", body.longTermCommitment],
      ["Care plan", body.carePlan],
      ["Can provide timely veterinary care", body.timelyVetCare],
      ["Primary feeding caregiver", body.primaryFeedingCaregiver],
      ["Pet sleep location", body.petSleepLocation],
      ["Pet location when alone", body.petLocationWhenAlone],
      ["Longest time alone", body.longestTimeAlone],
      ["Vacation care plan", body.vacationCarePlan],
      ["Willing to allow adjustment time", body.willingToAllowAdjustmentTime],
      ["Behaviors willing to work on", body.behaviorsWillingToWorkOn],
      ["Reasons for adoption", body.reasonsForAdoption],
      ["Ready to adopt", body.readyToAdopt],
      ["Reference 1 name", body.reference1Name],
      ["Reference 1 phone", body.reference1Phone],
      ["Reference 1 years acquainted", body.reference1Years],
      ["Reference 1 non-family confirmed", body.reference1NonFamily],
      ["Reference 2 name", body.reference2Name],
      ["Reference 2 phone", body.reference2Phone],
      ["Reference 2 years acquainted", body.reference2Years],
      ["Reference 2 non-family confirmed", body.reference2NonFamily],
      ["Has used veterinarian", body.hasUsedVeterinarian],
      ["Authorization", body.authorizationAgreed],
    ]

    const firstMissing = requiredCore.find(([, value]) => missing(value))
    if (firstMissing) {
      return NextResponse.json({ error: `${firstMissing[0]} is required.` }, { status: 400 })
    }

    if (applicationType === "Specific Animal(s)" && preferredAnimalIds.length === 0 && missing(body.otherPetsInterestedIn)) {
      return NextResponse.json({ error: "Please identify at least one animal you are interested in." }, { status: 400 })
    }

    if (asString(body.ownOrRent) === "Rent" && (missing(body.landlordContact) || missing(body.landlordPhone))) {
      return NextResponse.json({ error: "Landlord or property contact information is required for renters." }, { status: 400 })
    }

    if (asString(body.hasUsedVeterinarian) === "Yes" && (missing(body.vetClinicName) || missing(body.vetClinicPhone))) {
      return NextResponse.json({ error: "Veterinary clinic name and phone are required when you have used a veterinarian." }, { status: 400 })
    }

    if (consideringDog) {
      const dogRequired: Array<[string, unknown]> = [
        ["Dog yard question", body.dogHasYard],
        ["Dog daily walking plan", body.dogDailyWalkingPlan],
        ["Dog walking caregiver", body.dogPrimaryWalkingCaregiver],
        ["Dog exercise plan", body.dogExercisePlan],
        ["Dog training plan", body.dogTrainingPlan],
        ["Dog barking tolerance", body.dogBarkingTolerance],
        ["Dog digging tolerance", body.dogDiggingTolerance],
      ]
      const firstMissingDog = dogRequired.find(([, value]) => missing(value))
      if (firstMissingDog) {
        return NextResponse.json({ error: `${firstMissingDog[0]} is required.` }, { status: 400 })
      }

      if (asString(body.dogHasYard) === "Yes" && missing(body.dogYardFenced)) {
        return NextResponse.json({ error: "Please indicate whether the yard is fenced." }, { status: 400 })
      }

      if (asString(body.dogYardFenced) === "Yes" && missing(body.dogFenceHeight)) {
        return NextResponse.json({ error: "Fence height is required for a fenced yard." }, { status: 400 })
      }
    }

    const now = new Date()
    const compactDate = now.toISOString().slice(0, 10).replaceAll("-", "")
    const randomSuffix = Math.random().toString(36).slice(2, 7).toUpperCase()
    const applicationId = `APP-${compactDate}-${randomSuffix}`

    const fields: Record<string, unknown> = {
      "Application ID": applicationId,
      "Submitted At": now.toISOString(),
      "Status": "New",
      "Application Type": applicationType,
      "Species Interest": speciesInterest,
      "First Name": asString(body.firstName),
      "Last Name": asString(body.lastName),
      "Email": asString(body.email),
      "Phone": asString(body.phone),
      "Preferred Contact": asString(body.preferredContact),
      "Street Address": asString(body.streetAddress),
      "Unit / Apt": asString(body.unitApt),
      "City": asString(body.city),
      "State": asString(body.state),
      "ZIP": asString(body.zip),
      "Applicant Is 18+": asBoolean(body.applicantIs18Plus),
      "Employment Status": asString(body.employmentStatus),
      "In School": asString(body.inSchool),
      "How Heard About Us": asString(body.howHeardAboutUs),
      "Residence Type": asString(body.residenceType),
      "Own or Rent": asString(body.ownOrRent),
      "Landlord / Property Contact": asString(body.landlordContact),
      "Landlord / Property Phone": asString(body.landlordPhone),
      "Other Adults in Home": asString(body.otherAdultsInHome),
      "Children in Home": asString(body.childrenInHome),
      "Current / Previous Pet Experience": asString(body.petExperience),
      "Current Pets": asString(body.currentPets),
      "All Household Members Agree": asString(body.allHouseholdMembersAgree),
      "Household Allergies": asString(body.householdAllergies),
      "Long-Term Commitment": asString(body.longTermCommitment),
      "Care Plan if Unable to Keep Pet": asString(body.carePlan),
      "Can Provide Timely Veterinary Care": asString(body.timelyVetCare),
      "Primary Feeding Caregiver": asString(body.primaryFeedingCaregiver),
      "Pet Sleep Location": asString(body.petSleepLocation),
      "Pet Location When Alone": asString(body.petLocationWhenAlone),
      "Longest Time Alone": asString(body.longestTimeAlone),
      "Vacation Care Plan": asString(body.vacationCarePlan),
      "Willing to Allow Adjustment Time": asString(body.willingToAllowAdjustmentTime),
      "Behaviors Willing to Work On": asStringArray(body.behaviorsWillingToWorkOn),
      "Reasons for Adoption": asStringArray(body.reasonsForAdoption),
      "Other Adoption Reason": asString(body.otherAdoptionReason),
      "Ready to Adopt": asString(body.readyToAdopt),
      "Other Pets Interested In": asString(body.otherPetsInterestedIn),
      "Anything Else": asString(body.anythingElse),
      "Reference 1 Name": asString(body.reference1Name),
      "Reference 1 Phone": asString(body.reference1Phone),
      "Reference 1 Years Acquainted": asString(body.reference1Years),
      "Reference 1 Non-Family Confirmed": asBoolean(body.reference1NonFamily),
      "Reference 2 Name": asString(body.reference2Name),
      "Reference 2 Phone": asString(body.reference2Phone),
      "Reference 2 Years Acquainted": asString(body.reference2Years),
      "Reference 2 Non-Family Confirmed": asBoolean(body.reference2NonFamily),
      "Has Used Veterinarian": asString(body.hasUsedVeterinarian),
      "Veterinary Clinic Name": asString(body.vetClinicName),
      "Veterinary Clinic Phone": asString(body.vetClinicPhone),
      "Veterinary Clinic Email": asString(body.vetClinicEmail),
      "Marketing Opt-In": asBoolean(body.marketingOptIn),
      "Authorization Agreed": asBoolean(body.authorizationAgreed),
    }

    if (preferredAnimalIds.length > 0) fields["Preferred Animal"] = preferredAnimalIds

    if (consideringDog) {
      fields["Dog - Has Yard"] = asString(body.dogHasYard)
      fields["Dog - Yard Fenced"] = asString(body.dogYardFenced || "Not Applicable")
      fields["Dog - Fence Height"] = asString(body.dogFenceHeight || "Not Applicable")
      fields["Dog - Daily Walking Plan"] = asString(body.dogDailyWalkingPlan)
      fields["Dog - Primary Walking Caregiver"] = asString(body.dogPrimaryWalkingCaregiver)
      fields["Dog - Exercise Plan"] = asString(body.dogExercisePlan)
      fields["Dog - Training Plan"] = asString(body.dogTrainingPlan)
      fields["Dog - Willing to Work on Excessive Barking"] = asString(body.dogBarkingTolerance)
      fields["Dog - Willing to Work on Digging"] = asString(body.dogDiggingTolerance)
    }

    const response = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_ID}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ records: [{ fields }], typecast: true }),
    })

    const airtableResult = await response.json()

    if (!response.ok) {
      console.error("Airtable adoption application error", airtableResult)
      return NextResponse.json({ error: "We could not submit your application. Please try again or contact Safe Haven." }, { status: 502 })
    }

    const recordId = airtableResult?.records?.[0]?.id

    return NextResponse.json({ ok: true, applicationId, recordId })
  } catch (error) {
    console.error("Adoption application submission error", error)
    return NextResponse.json({ error: "We could not submit your application. Please try again or contact Safe Haven." }, { status: 500 })
  }
}
