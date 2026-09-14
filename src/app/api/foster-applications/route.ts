import { NextResponse } from "next/server"

const AIRTABLE_BASE_ID = "app2vpch2JJVrP9pu"
const AIRTABLE_FOSTER_APPLICATIONS_TABLE_ID = "tblFWPjyZMi9DjpBj"

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : ""
}

function asStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : []
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
    const speciesInterest = asStringArray(body.speciesInterest)
    const fosterInterests = asStringArray(body.fosterInterests)
    const consideringCat = speciesInterest.includes("Cat")
    const consideringDog = speciesInterest.includes("Dog")
    const interestedInBottleBabies = fosterInterests.includes("Bottle Babies")
    const interestedInPregnantMom = fosterInterests.includes("Pregnant Mom") || fosterInterests.includes("Nursing Mom with Litter")

    const requiredCore: Array<[string, unknown]> = [
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
      ["Residence type", body.residenceType],
      ["Own or rent", body.ownOrRent],
      ["Other adults in home", body.otherAdultsInHome],
      ["Children in home", body.childrenInHome],
      ["Current pets", body.currentPets],
      ["Household allergies", body.householdAllergies],
      ["All household members agree", body.allHouseholdMembersAgree],
      ["Typical schedule / time away", body.typicalSchedule],
      ["Animal / foster experience", body.animalExperience],
      ["Species interest", speciesInterest],
      ["Foster interests", fosterInterests],
      ["Ready to foster", body.readyToFoster],
      ["Medical-needs comfort", body.willingMedicalNeeds],
      ["Behavior-needs comfort", body.willingBehaviorChallenges],
      ["Veterinary transportation", body.willingVetTransport],
      ["Potential adopter visits", body.willingAdopterVisits],
      ["Safe Haven approval acknowledgement", body.safeHavenApprovalAcknowledged],
      ["Reference name", body.referenceName],
      ["Reference phone", body.referencePhone],
      ["Reference relationship", body.referenceRelationship],
      ["Reference years acquainted", body.referenceYears],
      ["Has used veterinarian", body.hasUsedVeterinarian],
      ["Authorization", body.authorizationAgreed],
    ]

    const firstMissing = requiredCore.find(([, value]) => missing(value))
    if (firstMissing) {
      return NextResponse.json({ error: `${firstMissing[0]} is required.` }, { status: 400 })
    }

    if (asString(body.ownOrRent) === "Rent" && (missing(body.landlordContact) || missing(body.landlordPhone))) {
      return NextResponse.json({ error: "Landlord or property contact information is required for renters." }, { status: 400 })
    }

    if (asString(body.hasUsedVeterinarian) === "Yes" && (missing(body.vetClinicName) || missing(body.vetClinicPhone))) {
      return NextResponse.json({ error: "Veterinary clinic name and phone are required when you have used a veterinarian." }, { status: 400 })
    }

    if (consideringCat) {
      if (missing(body.catIndoorOnlyAgreement)) {
        return NextResponse.json({ error: "Please confirm the indoor-only requirement for foster cats." }, { status: 400 })
      }
      if (missing(body.catSeparateSafeRoomAvailable)) {
        return NextResponse.json({ error: "Please confirm that you have a separate safe room available for foster cats." }, { status: 400 })
      }
    }

    if (consideringDog) {
      const dogRequired: Array<[string, unknown]> = [
        ["Dog yard question", body.dogHasYard],
        ["Dog daily walking plan", body.dogDailyWalkingPlan],
        ["Dog primary exercise caregiver", body.dogPrimaryExerciseCaregiver],
        ["Dog training plan", body.dogTrainingPlan],
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

    if (interestedInBottleBabies) {
      if (missing(body.bottleBabyExperience) || missing(body.bottleBabyOvernightCareAcknowledged)) {
        return NextResponse.json({ error: "Please complete the bottle-baby readiness questions." }, { status: 400 })
      }
    }

    if (interestedInPregnantMom) {
      if (missing(body.pregnantNursingExperience) || missing(body.pregnantMomPrivateSpaceAvailable) || missing(body.specialFosterNotes)) {
        return NextResponse.json({ error: "Please complete the pregnant or nursing-mom readiness questions, including a description of the private space you would use." }, { status: 400 })
      }
    }

    const now = new Date()
    const compactDate = now.toISOString().slice(0, 10).replaceAll("-", "")
    const randomSuffix = Math.random().toString(36).slice(2, 7).toUpperCase()
    const applicationId = `FOSTER-${compactDate}-${randomSuffix}`

    const fields: Record<string, unknown> = {
      "Foster Application ID": applicationId,
      "Submitted At": now.toISOString(),
      "Status": "New",
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
      "Residence Type": asString(body.residenceType),
      "Own or Rent": asString(body.ownOrRent),
      "Landlord / Property Contact": asString(body.landlordContact),
      "Landlord / Property Phone": asString(body.landlordPhone),
      "Other Adults in Home": asString(body.otherAdultsInHome),
      "Children in Home": asString(body.childrenInHome),
      "Current Pets": asString(body.currentPets),
      "Household Allergies": asString(body.householdAllergies),
      "All Household Members Agree": asString(body.allHouseholdMembersAgree),
      "Typical Schedule / Time Away": asString(body.typicalSchedule),
      "Animal / Foster Experience": asString(body.animalExperience),
      "Species Interest": speciesInterest,
      "Foster Interests": fosterInterests,
      "Ready to Foster": asString(body.readyToFoster),
      "Willing to Foster Medical Needs": asString(body.willingMedicalNeeds),
      "Willing to Foster Behavior Challenges": asString(body.willingBehaviorChallenges),
      "Willing to Transport for Veterinary Care": asString(body.willingVetTransport),
      "Willing to Provide Progress Updates": "Yes",
      "Willing to Accommodate Potential Adopter Visits": asString(body.willingAdopterVisits),
      "Understands Safe Haven Approval Required for Veterinary / Placement Decisions": asBoolean(body.safeHavenApprovalAcknowledged),
      "Cat - Indoor Only Agreement": consideringCat ? asString(body.catIndoorOnlyAgreement) : "Not Applicable",
      "Cat - Separate Safe Room Available": consideringCat ? asBoolean(body.catSeparateSafeRoomAvailable) : false,
      "Dog - Has Yard": consideringDog ? asString(body.dogHasYard) : "Not Applicable",
      "Dog - Yard Fenced": consideringDog ? asString(body.dogYardFenced || "Not Applicable") : "Not Applicable",
      "Dog - Fence Height": consideringDog ? asString(body.dogFenceHeight || "Not Applicable") : "Not Applicable",
      "Dog - Daily Walking Plan": consideringDog ? asString(body.dogDailyWalkingPlan) : "Depends on Dog",
      "Dog - Primary Exercise Caregiver": consideringDog ? asString(body.dogPrimaryExerciseCaregiver) : "Not Applicable",
      "Dog - Training Plan": consideringDog ? asString(body.dogTrainingPlan) : "Not Applicable",
      "Bottle Baby Experience": interestedInBottleBabies ? asString(body.bottleBabyExperience) : "Not interested",
      "Bottle Baby Overnight Care Acknowledged": interestedInBottleBabies ? asBoolean(body.bottleBabyOvernightCareAcknowledged) : false,
      "Pregnant / Nursing Mom Experience": interestedInPregnantMom ? asString(body.pregnantNursingExperience) : "Not interested",
      "Pregnant Mom Private Space Available": interestedInPregnantMom ? asBoolean(body.pregnantMomPrivateSpaceAvailable) : false,
      "Special Foster Notes": interestedInPregnantMom ? asString(body.specialFosterNotes) : "",
      "Reference Name": asString(body.referenceName),
      "Reference Phone": asString(body.referencePhone),
      "Reference Email": asString(body.referenceEmail),
      "Reference Relationship": asString(body.referenceRelationship),
      "Reference Years Acquainted": asString(body.referenceYears),
      "Has Used Veterinarian": asString(body.hasUsedVeterinarian),
      "Veterinary Clinic Name": asString(body.vetClinicName),
      "Veterinary Clinic Phone": asString(body.vetClinicPhone),
      "Veterinary Clinic Email": asString(body.vetClinicEmail),
      "Anything Else": asString(body.anythingElse),
      "Marketing Opt-In": asBoolean(body.marketingOptIn),
      "Authorization Agreed": asBoolean(body.authorizationAgreed),
    }

    const response = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_FOSTER_APPLICATIONS_TABLE_ID}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ records: [{ fields }], typecast: true }),
    })

    const airtableResult = await response.json()

    if (!response.ok) {
      console.error("Airtable foster application error", airtableResult)
      return NextResponse.json({ error: "We could not submit your foster application. Please try again or contact Safe Haven." }, { status: 502 })
    }

    const recordId = airtableResult?.records?.[0]?.id
    return NextResponse.json({ ok: true, applicationId, recordId })
  } catch (error) {
    console.error("Foster application submission error", error)
    return NextResponse.json({ error: "We could not submit your foster application. Please try again or contact Safe Haven." }, { status: 500 })
  }
}
