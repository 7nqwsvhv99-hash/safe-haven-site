"use client"

import { FormEvent, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { CheckCircle2 } from "lucide-react"

const selectClass = "flex h-12 w-full rounded-xl border border-input bg-background px-4 py-3 text-base"
const checkboxClass = "h-4 w-4 rounded border-input"

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="p-6 md:p-8 space-y-6">
      <h2 className="text-2xl font-bold">{title}</h2>
      {children}
    </Card>
  )
}

function Field({ label, htmlFor, children, note }: { label: string; htmlFor?: string; children: React.ReactNode; note?: string }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {note && <p className="text-xs text-muted-foreground">{note}</p>}
    </div>
  )
}

export default function AdoptionApplicationPage() {
  const searchParams = useSearchParams()
  const animalId = searchParams.get("animalId") || ""
  const animalName = searchParams.get("animalName") || ""
  const animalSpecies = searchParams.get("species") || ""

  const [applicationType, setApplicationType] = useState(animalId ? "Specific Animal(s)" : "General Pre-Approval")
  const [speciesInterest, setSpeciesInterest] = useState<string[]>(animalSpecies ? [animalSpecies] : [])
  const [ownOrRent, setOwnOrRent] = useState("")
  const [hasUsedVeterinarian, setHasUsedVeterinarian] = useState("")
  const [dogHasYard, setDogHasYard] = useState("")
  const [dogYardFenced, setDogYardFenced] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; message: string; applicationId?: string } | null>(null)

  const consideringDog = speciesInterest.includes("Dog")

  const preferredAnimalIds = useMemo(() => (animalId ? [animalId] : []), [animalId])

  const toggleSpecies = (species: string) => {
    setSpeciesInterest((current) => current.includes(species) ? current.filter((item) => item !== species) : [...current, species])
  }

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setResult(null)
    setIsSubmitting(true)

    const form = new FormData(event.currentTarget)
    const values = Object.fromEntries(form.entries()) as Record<string, string>

    const payload = {
      applicationType,
      speciesInterest,
      preferredAnimalIds,
      firstName: values.firstName,
      lastName: values.lastName,
      email: values.email,
      phone: values.phone,
      preferredContact: values.preferredContact,
      streetAddress: values.streetAddress,
      unitApt: values.unitApt,
      city: values.city,
      state: values.state,
      zip: values.zip,
      applicantIs18Plus: form.get("applicantIs18Plus") === "on",
      employmentStatus: values.employmentStatus,
      inSchool: values.inSchool,
      howHeardAboutUs: values.howHeardAboutUs,
      residenceType: values.residenceType,
      ownOrRent,
      landlordContact: values.landlordContact,
      landlordPhone: values.landlordPhone,
      otherAdultsInHome: values.otherAdultsInHome,
      childrenInHome: values.childrenInHome,
      petExperience: values.petExperience,
      currentPets: values.currentPets,
      allHouseholdMembersAgree: values.allHouseholdMembersAgree,
      householdAllergies: values.householdAllergies,
      longTermCommitment: values.longTermCommitment,
      carePlan: values.carePlan,
      timelyVetCare: values.timelyVetCare,
      primaryFeedingCaregiver: values.primaryFeedingCaregiver,
      petSleepLocation: values.petSleepLocation,
      petLocationWhenAlone: values.petLocationWhenAlone,
      longestTimeAlone: values.longestTimeAlone,
      vacationCarePlan: values.vacationCarePlan,
      willingToAllowAdjustmentTime: values.willingToAllowAdjustmentTime,
      behaviorsWillingToWorkOn: form.getAll("behaviorsWillingToWorkOn"),
      reasonsForAdoption: form.getAll("reasonsForAdoption"),
      otherAdoptionReason: values.otherAdoptionReason,
      readyToAdopt: values.readyToAdopt,
      otherPetsInterestedIn: animalName || values.otherPetsInterestedIn,
      anythingElse: values.anythingElse,
      reference1Name: values.reference1Name,
      reference1Phone: values.reference1Phone,
      reference1Years: values.reference1Years,
      reference1NonFamily: form.get("reference1NonFamily") === "on",
      reference2Name: values.reference2Name,
      reference2Phone: values.reference2Phone,
      reference2Years: values.reference2Years,
      reference2NonFamily: form.get("reference2NonFamily") === "on",
      hasUsedVeterinarian,
      vetClinicName: values.vetClinicName,
      vetClinicPhone: values.vetClinicPhone,
      vetClinicEmail: values.vetClinicEmail,
      marketingOptIn: form.get("marketingOptIn") === "on",
      authorizationAgreed: form.get("authorizationAgreed") === "on",
      dogHasYard,
      dogYardFenced,
      dogFenceHeight: values.dogFenceHeight,
      dogDailyWalkingPlan: values.dogDailyWalkingPlan,
      dogPrimaryWalkingCaregiver: values.dogPrimaryWalkingCaregiver,
      dogExercisePlan: values.dogExercisePlan,
      dogTrainingPlan: values.dogTrainingPlan,
      dogBarkingTolerance: values.dogBarkingTolerance,
      dogDiggingTolerance: values.dogDiggingTolerance,
    }

    try {
      const response = await fetch("/api/adoption-applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Submission failed")

      setResult({ ok: true, message: "Your application has been received.", applicationId: data.applicationId })
      window.scrollTo({ top: 0, behavior: "smooth" })
    } catch (error) {
      setResult({ ok: false, message: error instanceof Error ? error.message : "We could not submit your application." })
      window.scrollTo({ top: 0, behavior: "smooth" })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (result?.ok) {
    return (
      <div className="container-custom section-padding max-w-2xl">
        <Card className="p-8 text-center space-y-4">
          <CheckCircle2 className="h-16 w-16 text-primary mx-auto" />
          <h1 className="text-3xl font-bold">Application Received</h1>
          <p className="text-muted-foreground">Thank you for applying to adopt through Safe Haven Humane Society. Our team will review your application and contact you if we need additional information.</p>
          {result.applicationId && <p className="font-semibold">Application ID: {result.applicationId}</p>}
        </Card>
      </div>
    )
  }

  return (
    <div className="bg-slate-50 min-h-screen">
      <section className="hero-gradient">
        <div className="container-custom section-padding max-w-4xl text-center space-y-4">
          <h1 className="text-4xl md:text-5xl font-bold">Adoption Application</h1>
          <p className="text-lg text-muted-foreground">Complete one application whether you are interested in a specific animal, more than one animal, or want to be pre-approved while you find the right match.</p>
          <p className="text-sm text-muted-foreground">Fields marked required must be completed. Some questions appear only when they apply to your situation.</p>
        </div>
      </section>

      <form onSubmit={onSubmit} className="container-custom max-w-4xl py-10 space-y-8">
        {result && !result.ok && <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-destructive">{result.message}</div>}

        <Section title="Your Adoption Interest">
          <Field label="How are you entering the adoption process? *">
            <select className={selectClass} value={applicationType} onChange={(e) => setApplicationType(e.target.value)} required>
              <option value="Specific Animal(s)">I am interested in one or more specific animals</option>
              <option value="General Pre-Approval">I want to be pre-approved while I find the right animal</option>
            </select>
          </Field>

          {animalName && <div className="rounded-xl bg-primary/5 p-4"><span className="font-semibold">Animal selected:</span> {animalName}</div>}

          <div className="space-y-2">
            <Label>Which species are you considering? *</Label>
            <div className="flex gap-6">
              {['Cat', 'Dog'].map((species) => (
                <label key={species} className="flex items-center gap-2">
                  <input className={checkboxClass} type="checkbox" checked={speciesInterest.includes(species)} onChange={() => toggleSpecies(species)} />
                  {species}
                </label>
              ))}
            </div>
            {speciesInterest.length === 0 && <p className="text-xs text-muted-foreground">Select at least one species before submitting.</p>}
          </div>

          {applicationType === "Specific Animal(s)" && !animalId && (
            <Field label="Which animal or animals are you interested in? *" htmlFor="otherPetsInterestedIn">
              <Input id="otherPetsInterestedIn" name="otherPetsInterestedIn" required placeholder="List one or more animal names" />
            </Field>
          )}
        </Section>

        <Section title="About You">
          <div className="grid md:grid-cols-2 gap-4">
            <Field label="First name *" htmlFor="firstName"><Input id="firstName" name="firstName" required /></Field>
            <Field label="Last name *" htmlFor="lastName"><Input id="lastName" name="lastName" required /></Field>
            <Field label="Email *" htmlFor="email"><Input id="email" name="email" type="email" required /></Field>
            <Field label="Phone *" htmlFor="phone"><Input id="phone" name="phone" required /></Field>
            <Field label="Preferred contact method *"><select name="preferredContact" className={selectClass} required><option value="">Select...</option><option>Phone</option><option>Text</option><option>Email</option></select></Field>
            <Field label="How did you hear about Safe Haven? *"><Input name="howHeardAboutUs" required /></Field>
          </div>
          <label className="flex items-start gap-3"><input className={`${checkboxClass} mt-1`} type="checkbox" name="applicantIs18Plus" required /><span>I confirm that I am 18 years of age or older. *</span></label>
          <div className="grid md:grid-cols-2 gap-4">
            <Field label="Employment status *"><select name="employmentStatus" className={selectClass} required><option value="">Select...</option><option>Employed</option><option>Not Employed</option><option>Retired</option><option>Prefer Not to Say</option></select></Field>
            <Field label="Are you currently in school? *"><select name="inSchool" className={selectClass} required><option value="">Select...</option><option>Yes</option><option>No</option><option>Prefer Not to Say</option></select></Field>
          </div>
        </Section>

        <Section title="Home & Household">
          <Field label="Street address *"><Input name="streetAddress" required /></Field>
          <div className="grid md:grid-cols-3 gap-4">
            <Field label="Unit / Apt"><Input name="unitApt" /></Field>
            <Field label="City *"><Input name="city" required /></Field>
            <Field label="State *"><Input name="state" required defaultValue="IL" /></Field>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            <Field label="ZIP *"><Input name="zip" required /></Field>
            <Field label="Residence type *"><select name="residenceType" className={selectClass} required><option value="">Select...</option><option>House</option><option>Apartment</option><option>Condo</option><option>Mobile Home</option><option>Farm / Rural Property</option><option>Other</option></select></Field>
            <Field label="Do you own or rent? *"><select className={selectClass} value={ownOrRent} onChange={(e) => setOwnOrRent(e.target.value)} required><option value="">Select...</option><option>Own</option><option>Rent</option><option>Other</option></select></Field>
          </div>
          {ownOrRent === "Rent" && <div className="grid md:grid-cols-2 gap-4 rounded-xl bg-primary/5 p-4"><Field label="Landlord / property contact *"><Input name="landlordContact" required /></Field><Field label="Landlord / property phone *"><Input name="landlordPhone" required /></Field></div>}
          <Field label="Other adults in the home *" note="List names/relationships, or enter None."><Textarea name="otherAdultsInHome" required /></Field>
          <Field label="Children in the home *" note="List ages, or enter None."><Textarea name="childrenInHome" required /></Field>
          <Field label="Do all household members agree with adopting a pet? *"><select name="allHouseholdMembersAgree" className={selectClass} required><option value="">Select...</option><option>Yes</option><option>No</option></select></Field>
          <Field label="Household allergies *" note="Describe any known animal allergies, or enter None."><Textarea name="householdAllergies" required /></Field>
        </Section>

        <Section title="Pet Experience & Long-Term Care">
          <Field label="Current or previous pet experience *"><Textarea name="petExperience" required /></Field>
          <Field label="Current pets *" note="List each current pet and basic details, or enter None."><Textarea name="currentPets" required /></Field>
          <Field label="Are you prepared for a long-term commitment? *"><select name="longTermCommitment" className={selectClass} required><option value="">Select...</option><option>Yes</option><option>No</option></select></Field>
          <Field label="If you could no longer keep the pet, what would you do? *"><Textarea name="carePlan" required /></Field>
          <Field label="Can you provide timely veterinary care, including unexpected care? *"><select name="timelyVetCare" className={selectClass} required><option value="">Select...</option><option>Yes</option><option>No</option></select></Field>
        </Section>

        <Section title="Daily Care">
          <div className="grid md:grid-cols-2 gap-4">
            <Field label="Who will be primarily responsible for feeding? *"><Input name="primaryFeedingCaregiver" required /></Field>
            <Field label="Where will the pet sleep? *"><Input name="petSleepLocation" required /></Field>
            <Field label="Where will the pet stay when no one is home? *"><Input name="petLocationWhenAlone" required /></Field>
            <Field label="Longest amount of time the pet will be alone *"><Input name="longestTimeAlone" required /></Field>
          </div>
          <Field label="Who will care for the pet while you are on vacation? *"><Input name="vacationCarePlan" required /></Field>
          <Field label="Are you willing to allow an adjustment period and work through normal transition challenges? *"><select name="willingToAllowAdjustmentTime" className={selectClass} required><option value="">Select...</option><option>Yes</option><option>No</option></select></Field>
        </Section>

        <Section title="Behavior & Expectations">
          <div className="space-y-3">
            <Label>Which behaviors are you willing to work on? Select all that apply. *</Label>
            {['Needs Social Skills','Accidents in the House','Inappropriate Chewing','Excessive Scratching','Separation Anxiety','Other'].map((item) => <label key={item} className="flex items-center gap-2"><input className={checkboxClass} type="checkbox" name="behaviorsWillingToWorkOn" value={item} />{item}</label>)}
          </div>
          <div className="space-y-3">
            <Label>Why do you want to adopt? Select all that apply. *</Label>
            {['Family Companion','Farm Cat / Mouser','For Child','Gift','Companion for Current Pet','Replace a Previous Pet','Other'].map((item) => <label key={item} className="flex items-center gap-2"><input className={checkboxClass} type="checkbox" name="reasonsForAdoption" value={item} />{item}</label>)}
          </div>
          <Field label="If you selected Other, explain"><Input name="otherAdoptionReason" /></Field>
          <Field label="When are you ready to adopt? *"><Input name="readyToAdopt" required placeholder="For example: immediately, within 2 weeks, next month" /></Field>
        </Section>

        {consideringDog && <Section title="Dog-Specific Questions">
          <div className="grid md:grid-cols-2 gap-4">
            <Field label="Do you have a yard? *"><select className={selectClass} value={dogHasYard} onChange={(e) => setDogHasYard(e.target.value)} required><option value="">Select...</option><option>Yes</option><option>No</option></select></Field>
            {dogHasYard === "Yes" && <Field label="Is the yard fenced? *"><select className={selectClass} value={dogYardFenced} onChange={(e) => setDogYardFenced(e.target.value)} required><option value="">Select...</option><option>Yes</option><option>No</option></select></Field>}
            {dogYardFenced === "Yes" && <Field label="Fence height *"><select name="dogFenceHeight" className={selectClass} required><option value="">Select...</option><option>Under 4 Feet</option><option>4 Feet</option><option>5 Feet</option><option>6 Feet</option><option>7 Feet or Higher</option></select></Field>}
            <Field label="Do you plan to walk the dog daily? *"><select name="dogDailyWalkingPlan" className={selectClass} required><option value="">Select...</option><option>Yes</option><option>No</option></select></Field>
            <Field label="Who will usually walk or exercise the dog? *"><Input name="dogPrimaryWalkingCaregiver" required /></Field>
          </div>
          <Field label="Describe your exercise and enrichment plan. *"><Textarea name="dogExercisePlan" required /></Field>
          <Field label="What are your plans for training your new dog? *"><Textarea name="dogTrainingPlan" required /></Field>
          <div className="grid md:grid-cols-2 gap-4">
            <Field label="Are you willing to work on excessive barking? *"><select name="dogBarkingTolerance" className={selectClass} required><option value="">Select...</option><option>Yes</option><option>No</option></select></Field>
            <Field label="Are you willing to work on digging? *"><select name="dogDiggingTolerance" className={selectClass} required><option value="">Select...</option><option>Yes</option><option>No</option></select></Field>
          </div>
        </Section>}

        <Section title="Personal References">
          <p className="text-sm text-muted-foreground">Please provide two non-family references.</p>
          <div className="grid md:grid-cols-3 gap-4"><Field label="Reference 1 name *"><Input name="reference1Name" required /></Field><Field label="Phone *"><Input name="reference1Phone" required /></Field><Field label="Years acquainted *"><Input name="reference1Years" required /></Field></div>
          <label className="flex items-center gap-2"><input className={checkboxClass} type="checkbox" name="reference1NonFamily" required />I confirm Reference 1 is not a family member. *</label>
          <div className="grid md:grid-cols-3 gap-4"><Field label="Reference 2 name *"><Input name="reference2Name" required /></Field><Field label="Phone *"><Input name="reference2Phone" required /></Field><Field label="Years acquainted *"><Input name="reference2Years" required /></Field></div>
          <label className="flex items-center gap-2"><input className={checkboxClass} type="checkbox" name="reference2NonFamily" required />I confirm Reference 2 is not a family member. *</label>
        </Section>

        <Section title="Veterinary History">
          <Field label="Have you used a veterinarian for a current or previous pet? *"><select className={selectClass} value={hasUsedVeterinarian} onChange={(e) => setHasUsedVeterinarian(e.target.value)} required><option value="">Select...</option><option>Yes</option><option>No</option></select></Field>
          {hasUsedVeterinarian === "Yes" && <div className="grid md:grid-cols-2 gap-4 rounded-xl bg-primary/5 p-4"><Field label="Veterinary clinic name *"><Input name="vetClinicName" required /></Field><Field label="Veterinary clinic phone *"><Input name="vetClinicPhone" required /></Field><Field label="Veterinary clinic email"><Input name="vetClinicEmail" type="email" /></Field></div>}
        </Section>

        <Section title="Final Details">
          <Field label="Anything else you would like us to know?"><Textarea name="anythingElse" /></Field>
          <label className="flex items-start gap-3"><input className={`${checkboxClass} mt-1`} type="checkbox" name="authorizationAgreed" required /><span>I certify that the information in this application is accurate and authorize Safe Haven Humane Society to contact my references, landlord/property contact, and veterinary provider as part of the adoption review process. *</span></label>
          <label className="flex items-start gap-3"><input className={`${checkboxClass} mt-1`} type="checkbox" name="marketingOptIn" /><span>I would like to receive occasional Safe Haven news and updates.</span></label>
        </Section>

        <Button type="submit" size="lg" className="w-full" disabled={isSubmitting || speciesInterest.length === 0}>{isSubmitting ? "Submitting Application..." : "Submit Adoption Application"}</Button>
        <p className="text-xs text-center text-muted-foreground">Please note: Safe Haven requires an approved adoption application before an animal can go home.</p>
      </form>
    </div>
  )
}
