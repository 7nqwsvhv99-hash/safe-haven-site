"use client"

import { FormEvent, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { CheckCircle2 } from "lucide-react"

const selectClass = "flex h-12 w-full rounded-xl border border-input bg-background px-4 py-3 text-base"

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <Card className="p-6 md:p-8 space-y-6"><h2 className="text-2xl font-bold">{title}</h2>{children}</Card>
}

function Field({ label, children, note }: { label: string; children: React.ReactNode; note?: string }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {note && <p className="text-xs text-muted-foreground">{note}</p>}
      {children}
    </div>
  )
}

export default function FosterApplicationPage() {
  const [species, setSpecies] = useState<string[]>([])
  const [interests, setInterests] = useState<string[]>([])
  const [ownOrRent, setOwnOrRent] = useState("")
  const [usedVet, setUsedVet] = useState("")
  const [dogHasYard, setDogHasYard] = useState("")
  const [dogYardFenced, setDogYardFenced] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; message: string; id?: string } | null>(null)

  const cat = species.includes("Cat")
  const dog = species.includes("Dog")
  const bottle = interests.includes("Bottle Babies")
  const pregnant = interests.includes("Pregnant Mom") || interests.includes("Nursing Mom with Litter")

  const toggle = (value: string, current: string[], setter: (v: string[]) => void) => setter(current.includes(value) ? current.filter((x) => x !== value) : [...current, value])

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setResult(null)
    const form = new FormData(event.currentTarget)
    const v = Object.fromEntries(form.entries()) as Record<string, string>
    const payload = {
      ...v,
      speciesInterest: species,
      fosterInterests: interests,
      ownOrRent,
      hasUsedVeterinarian: usedVet,
      dogHasYard,
      dogYardFenced,
      applicantIs18Plus: form.get("applicantIs18Plus") === "on",
      safeHavenApprovalAcknowledged: form.get("safeHavenApprovalAcknowledged") === "on",
      catSeparateSafeRoomAvailable: form.get("catSeparateSafeRoomAvailable") === "on",
      bottleBabyOvernightCareAcknowledged: form.get("bottleBabyOvernightCareAcknowledged") === "on",
      pregnantMomPrivateSpaceAvailable: form.get("pregnantMomPrivateSpaceAvailable") === "on",
      willingProgressUpdates: "Yes",
      marketingOptIn: form.get("marketingOptIn") === "on",
      authorizationAgreed: form.get("authorizationAgreed") === "on",
    }
    try {
      const response = await fetch("/api/foster-applications", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
      const data = await response.json()
      if (!response.ok) throw new Error(data?.error || "Unable to submit application.")
      setResult({ ok: true, message: "Your foster application has been submitted.", id: data.applicationId })
    } catch (error) {
      setResult({ ok: false, message: error instanceof Error ? error.message : "Unable to submit application." })
    } finally { setSubmitting(false) }
  }

  if (result?.ok) return <div className="container-custom section-padding max-w-2xl"><Card className="p-8 text-center space-y-4"><CheckCircle2 className="h-12 w-12 text-primary mx-auto" /><h1 className="text-3xl font-bold">Application Received</h1><p>{result.message}</p>{result.id && <p className="font-semibold">Reference: {result.id}</p>}</Card></div>

  const options = ["Bottle Babies", "Pregnant Mom", "Nursing Mom with Litter", "Orphaned Litter", "Kittens", "Puppies", "Adult Cat", "Adult Dog", "Pair / Bonded Animals", "Medical Needs", "Behavior Support", "Short-Term / Emergency"]

  return <div className="bg-slate-50">
    <section className="hero-gradient"><div className="container-custom section-padding max-w-5xl text-center space-y-4"><h1 className="text-4xl md:text-5xl font-bold">Foster Application</h1><p className="text-lg text-muted-foreground"><span className="block md:whitespace-nowrap">Tell us about your household and the types of cat or dog foster placements you could support.</span><span className="block">Additional questions appear only for the foster situations you select.</span></p></div></section>
    <form onSubmit={onSubmit} className="container-custom max-w-4xl py-10 space-y-8">
      <Section title="Applicant & Contact"><div className="grid md:grid-cols-2 gap-5"><Field label="First Name *"><Input name="firstName" required /></Field><Field label="Last Name *"><Input name="lastName" required /></Field><Field label="Email *"><Input name="email" type="email" required /></Field><Field label="Phone *"><Input name="phone" required /></Field><Field label="Preferred Contact *"><select name="preferredContact" className={selectClass} required defaultValue=""><option value="" disabled>Select one</option><option>Email</option><option>Phone</option><option>Text</option></select></Field><Field label="Street Address *"><Input name="streetAddress" required /></Field><Field label="Unit / Apt"><Input name="unitApt" /></Field><Field label="City *"><Input name="city" required /></Field><Field label="State *"><Input name="state" required /></Field><Field label="ZIP *"><Input name="zip" required /></Field></div><label className="flex gap-2"><input type="checkbox" name="applicantIs18Plus" required /> I am 18 or older. *</label></Section>

      <Section title="Home & Household"><div className="grid md:grid-cols-2 gap-5"><Field label="Residence Type *"><select name="residenceType" className={selectClass} required defaultValue=""><option value="" disabled>Select one</option><option>House</option><option>Apartment</option><option>Condo / Townhome</option><option>Farm / Rural Property</option><option>Other</option></select></Field><Field label="Own or Rent *"><select className={selectClass} required value={ownOrRent} onChange={(e)=>setOwnOrRent(e.target.value)}><option value="" disabled>Select one</option><option>Own</option><option>Rent</option><option>Other</option></select></Field></div>{ownOrRent === "Rent" && <div className="grid md:grid-cols-2 gap-5"><Field label="Landlord / Property Contact *"><Input name="landlordContact" required /></Field><Field label="Landlord / Property Phone *"><Input name="landlordPhone" required /></Field></div>}<Field label="Other adults in home *" note="List each adult's age, gender, relationship to you, whether they are comfortable with fostering, and whether they expect to help with foster care. Example: Jordan, 42, male, spouse, fully supportive and will help with evening feeding. Enter None if there are no other adults."><Textarea name="otherAdultsInHome" required /></Field><Field label="Children in home *" note="List each child's age and anything relevant to matching a foster, such as comfort with animals, prior experience, or fear of certain animals. Example: 8-year-old child, comfortable with calm cats and has lived with dogs. Enter None if there are no children."><Textarea name="childrenInHome" required /></Field><Field label="Current pets *" note="List each pet's species, breed or mix, age, sex, spay/neuter status if known, and how the pet generally responds to other animals. Example: Dog, Labrador mix, 6 years, neutered male, friendly with calm dogs but has not lived with cats. Enter None if you have no current pets."><Textarea name="currentPets" required /></Field><Field label="Household allergies *" note="List any animal-related allergies in the household and their severity. Enter None if not applicable."><Textarea name="householdAllergies" required /></Field><Field label="Do all household members agree to fostering? *"><select name="allHouseholdMembersAgree" className={selectClass} required defaultValue=""><option value="" disabled>Select one</option><option>Yes</option><option>No</option></select></Field><Field label="Typical schedule and time away from home *" note="Describe a typical weekday and weekend, including work or school hours, how long the home is usually empty at one time, and whether someone is available for midday or overnight care when needed. Example: Mon-Fri away 8:00-4:30, home for lunch most days, evenings and weekends mostly home."><Textarea name="typicalSchedule" required /></Field></Section>

      <Section title="Experience & Foster Preferences"><Field label="Animal or foster-care experience *"><Textarea name="animalExperience" required /></Field><div><Label>Species interest *</Label><div className="flex gap-5 mt-3">{["Cat","Dog"].map(x=><label key={x} className="flex gap-2"><input type="checkbox" checked={species.includes(x)} onChange={()=>toggle(x,species,setSpecies)} />{x}</label>)}</div></div><div><Label>Foster placements you would consider *</Label><div className="grid md:grid-cols-2 gap-3 mt-3">{options.map(x=><label key={x} className="flex gap-2"><input type="checkbox" checked={interests.includes(x)} onChange={()=>toggle(x,interests,setInterests)} />{x}</label>)}</div></div><div className="grid md:grid-cols-2 gap-5"><Field label="When could you begin? *"><select name="readyToFoster" className={selectClass} required defaultValue=""><option value="" disabled>Select one</option><option>Immediately</option><option>Within 1 week</option><option>Within 1 month</option><option>Flexible / Later</option></select></Field><Field label="Medical-needs fosters? *" note="Would you consider fostering an animal that needs medication, recovery care, monitoring, or other extra support? Example: comfortable giving oral medication, but not injections. Choose Maybe if it depends on the animal's needs."><select name="willingMedicalNeeds" className={selectClass} required defaultValue=""><option value="" disabled>Select one</option><option>Yes</option><option>No</option><option>Maybe / Depends on Need</option></select></Field><Field label="Behavior-challenge fosters? *" note="Would you consider fostering an animal that needs extra patience, structure, decompression, or behavior support? Example: comfortable with a shy cat who hides, but not with a dog showing resource guarding. Choose Maybe if it depends on the behavior."><select name="willingBehaviorChallenges" className={selectClass} required defaultValue=""><option value="" disabled>Select one</option><option>Yes</option><option>No</option><option>Maybe / Depends on Need</option></select></Field><Field label="Veterinary transportation *" note="Some foster animals need scheduled veterinary visits. Tell us whether you can provide transportation or would need Safe Haven's help arranging it."><select name="willingVetTransport" className={selectClass} required defaultValue=""><option value="" disabled>Select one</option><option value="Yes">I can provide transportation</option><option value="No">I would need assistance with transportation</option><option value="Maybe">It depends on the date, time, or location</option></select></Field><Field label="Potential adopter visits *" note="If Safe Haven coordinates a meeting with a potential adopter, tell us whether the visit could take place at your foster home or would need to be facilitated at the shelter."><select name="willingAdopterVisits" className={selectClass} required defaultValue=""><option value="" disabled>Select one</option><option value="Yes">I can accommodate coordinated visits at my home</option><option value="No">Visits would need to be facilitated at the shelter</option><option value="Maybe">It depends on timing or circumstances</option></select></Field></div><div className="rounded-xl border bg-slate-50 p-4 text-sm text-muted-foreground"><span className="font-semibold text-foreground">Communication is required during every foster placement.</span> Foster families must provide progress updates, respond to Safe Haven when contacted, and promptly report health, behavior, or safety concerns.</div><label className="flex gap-2"><input type="checkbox" name="safeHavenApprovalAcknowledged" required /> I understand Safe Haven must approve veterinary and placement decisions for foster animals. *</label></Section>

      {cat && <Section title="Cat Foster Questions"><label className="flex gap-2"><input type="checkbox" name="catSeparateSafeRoomAvailable" required /> I have a bathroom, bedroom, or other secure room where foster cat(s) can live safely separated from resident animals. *</label><Field label="I understand foster cats must remain indoors. *"><select name="catIndoorOnlyAgreement" className={selectClass} required defaultValue=""><option value="" disabled>Select one</option><option>Yes</option><option>No</option></select></Field></Section>}

      {dog && <Section title="Dog Foster Questions"><div className="grid md:grid-cols-2 gap-5"><Field label="Do you have a yard? *"><select className={selectClass} required value={dogHasYard} onChange={(e)=>setDogHasYard(e.target.value)}><option value="" disabled>Select one</option><option>Yes</option><option>No</option></select></Field>{dogHasYard === "Yes" && <Field label="Is the yard fenced? *"><select className={selectClass} required value={dogYardFenced} onChange={(e)=>setDogYardFenced(e.target.value)}><option value="" disabled>Select one</option><option>Yes</option><option>No</option></select></Field>}{dogYardFenced === "Yes" && <Field label="Fence height *"><select name="dogFenceHeight" className={selectClass} required defaultValue=""><option value="" disabled>Select one</option><option>Under 4 Feet</option><option>4 Feet</option><option>5 Feet</option><option>6 Feet or Higher</option></select></Field>}<Field label="Daily walking plan *"><select name="dogDailyWalkingPlan" className={selectClass} required defaultValue=""><option value="" disabled>Select one</option><option>Yes</option><option>No</option><option>Depends on Dog</option></select></Field><Field label="Primary exercise caregiver *"><Input name="dogPrimaryExerciseCaregiver" required /></Field></div><Field label="Training and behavior-support plan *"><Textarea name="dogTrainingPlan" required /></Field></Section>}

      {bottle && <Section title="Bottle Baby Readiness"><p className="text-sm text-muted-foreground">Bottle babies require intensive, around-the-clock care. Safe Haven will provide supplies and placement-specific instructions.</p><Field label="Bottle-baby experience *"><select name="bottleBabyExperience" className={selectClass} required defaultValue=""><option value="" disabled>Select one</option><option>No prior experience</option><option>Some experience</option><option>Experienced</option></select></Field><label className="flex gap-2"><input type="checkbox" name="bottleBabyOvernightCareAcknowledged" required /> I understand bottle babies require feeding every 2 hours and must be stimulated to pee/poop after every feeding. *</label></Section>}

      {pregnant && <Section title="Pregnant & Nursing Mom Readiness"><p className="text-sm text-muted-foreground">Pregnant and nursing moms need a quiet, private, low-stress space for nesting, birth, and caring for their litter. Safe Haven will provide placement-specific instructions and coordinate veterinary care as needed.</p><Field label="Pregnant or nursing-mom experience *"><select name="pregnantNursingExperience" className={selectClass} required defaultValue=""><option value="" disabled>Select one</option><option>No prior experience</option><option>Some experience</option><option>Experienced</option></select></Field><label className="flex gap-2"><input type="checkbox" name="pregnantMomPrivateSpaceAvailable" required /> I can provide a quiet, separate area for a pregnant or nursing mom. *</label><Field label="Describe the private space you would use for a pregnant or nursing mom and litter *" note="Tell us which room you would use, how it can be separated from resident pets and children, and what the space is like. Example: spare bedroom with a closing door, washable floor, and enough room for a nesting area, litter box, food, and water."><Textarea name="specialFosterNotes" required /></Field></Section>}

      <Section title="Reference & Veterinary Information"><div className="grid md:grid-cols-2 gap-5"><Field label="Reference Name *"><Input name="referenceName" required /></Field><Field label="Reference Phone *"><Input name="referencePhone" required /></Field><Field label="Reference Email"><Input name="referenceEmail" type="email" /></Field><Field label="Relationship *"><Input name="referenceRelationship" required /></Field><Field label="Years Acquainted *"><Input name="referenceYears" required /></Field><Field label="Have you used a veterinarian before? *"><select className={selectClass} required value={usedVet} onChange={(e)=>setUsedVet(e.target.value)}><option value="" disabled>Select one</option><option>Yes</option><option>No</option></select></Field></div>{usedVet === "Yes" && <div className="grid md:grid-cols-2 gap-5"><Field label="Veterinary Clinic Name *"><Input name="vetClinicName" required /></Field><Field label="Veterinary Clinic Phone *"><Input name="vetClinicPhone" required /></Field><Field label="Veterinary Clinic Email"><Input name="vetClinicEmail" type="email" /></Field></div>}</Section>

      <Section title="Final Details"><Field label="Anything else you would like us to know?"><Textarea name="anythingElse" /></Field><label className="flex gap-2"><input type="checkbox" name="marketingOptIn" /> I would like to receive occasional Safe Haven updates.</label><label className="flex gap-2"><input type="checkbox" name="authorizationAgreed" required /> I certify that the information provided is accurate and agree that Safe Haven may verify application information needed to evaluate foster suitability. *</label></Section>

      {result && !result.ok && <p className="text-sm text-red-600">{result.message}</p>}
      <Button type="submit" size="lg" disabled={submitting || species.length === 0 || interests.length === 0}>{submitting ? "Submitting..." : "Submit Foster Application"}</Button>
    </form>
  </div>
}
