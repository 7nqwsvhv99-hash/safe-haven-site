"use client"

import { FormEvent, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { CheckCircle2 } from "lucide-react"

const selectClass = "flex h-12 w-full rounded-xl border border-input bg-background px-4 py-3 text-base"
const checkboxClass = "h-4 w-4 rounded border-input accent-primary"

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <Card className="p-6 md:p-8 space-y-6"><h2 className="text-2xl font-bold">{title}</h2>{children}</Card>
}

function Field({ label, children, note }: { label: string; children: React.ReactNode; note?: string }) {
  return <div className="space-y-2"><Label>{label}</Label>{note && <p className="text-xs text-muted-foreground">{note}</p>}{children}</div>
}

const interestOptions = [
  "Shelter Care",
  "Adoption & Community Events",
  "Host an Event or Fundraiser",
  "Transportation",
  "Gardening & Grounds",
  "Dog Socializing & Exercise",
  "Cat Socializing & Enrichment",
  "Pet Food Pantry",
  "Building Maintenance",
  "Photography",
  "Social Media & Content",
  "Administrative Support",
  "Fundraising & Event Support",
]

export default function VolunteerApplicationPage() {
  const [interests, setInterests] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; message: string; id?: string } | null>(null)

  function toggleInterest(value: string) {
    setInterests((current) => current.includes(value) ? current.filter((item) => item !== value) : [...current, value])
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (interests.length === 0) {
      setResult({ ok: false, message: "Please select at least one volunteer interest." })
      return
    }

    setSubmitting(true)
    setResult(null)
    const form = new FormData(event.currentTarget)
    const values = Object.fromEntries(form.entries()) as Record<string, string>
    const payload = {
      ...values,
      daysAvailable: form.getAll("daysAvailable").map(String),
      timesAvailable: form.getAll("timesAvailable").map(String),
      volunteerInterests: interests,
      authorizationAgreed: form.get("authorizationAgreed") === "on",
    }

    try {
      const response = await fetch("/api/volunteer-applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data?.error || "Unable to submit your application.")
      setResult({ ok: true, message: "Your volunteer application has been submitted.", id: data.applicationId })
      window.scrollTo({ top: 0, behavior: "smooth" })
    } catch (error) {
      setResult({ ok: false, message: error instanceof Error ? error.message : "Unable to submit your application." })
      window.scrollTo({ top: 0, behavior: "smooth" })
    } finally {
      setSubmitting(false)
    }
  }

  if (result?.ok) {
    return <div className="container-custom section-padding max-w-2xl"><Card className="p-8 text-center space-y-4"><CheckCircle2 className="h-12 w-12 text-primary mx-auto" /><h1 className="text-3xl font-bold">Application Received</h1><p>{result.message}</p>{result.id && <p className="font-semibold">Reference: {result.id}</p>}<Button asChild><Link href="/volunteer">Return to Volunteer Page</Link></Button></Card></div>
  }

  return (
    <div className="bg-slate-50 min-h-screen">
      <section className="hero-gradient">
        <div className="container-custom section-padding max-w-3xl text-center space-y-4">
          <h1 className="text-4xl md:text-5xl font-bold">Volunteer Application</h1>
          <p className="text-lg text-muted-foreground">Tell us about yourself, when you are available, and how you would like to help Safe Haven.</p>
        </div>
      </section>

      <form onSubmit={onSubmit} className="container-custom max-w-4xl py-10 space-y-8">
        {result && !result.ok && <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-destructive">{result.message}</div>}

        <Section title="Applicant & Contact Information">
          <div className="grid md:grid-cols-2 gap-5">
            <Field label="First Name *"><Input name="firstName" required /></Field>
            <Field label="Last Name *"><Input name="lastName" required /></Field>
            <Field label="Age Range *"><select name="ageRange" className={selectClass} required defaultValue=""><option value="" disabled>Select one</option><option>Under 18</option><option>18-21</option><option>22-24</option><option>25-34</option><option>35-44</option><option>45-54</option><option>55-64</option><option>65-69</option><option>70-74</option><option>75+</option></select></Field>
            <Field label="Email Address *"><Input name="email" type="email" required /></Field>
            <Field label="Street Address *"><Input name="streetAddress" required /></Field>
            <Field label="Suite / Apt / Unit"><Input name="unitApt" /></Field>
            <Field label="City *"><Input name="city" required /></Field>
            <Field label="State / Province *"><Input name="state" required defaultValue="IL" /></Field>
            <Field label="ZIP / Postal Code *"><Input name="zip" required /></Field>
            <Field label="Home Phone"><Input name="homePhone" type="tel" /></Field>
            <Field label="Work Phone"><Input name="workPhone" type="tel" /></Field>
            <Field label="Cell Phone *"><Input name="cellPhone" type="tel" required /></Field>
            <Field label="Preferred Method of Contact *"><select name="preferredContact" className={selectClass} required defaultValue=""><option value="" disabled>Select one</option><option>Email</option><option>Home Phone</option><option>Work Phone</option><option>Cell Phone</option><option>Text</option></select></Field>
          </div>
        </Section>

        <Section title="Employment, School & Referral">
          <div className="grid md:grid-cols-2 gap-5">
            <Field label="Are You Employed? *"><select name="employmentStatus" className={selectClass} required defaultValue=""><option value="" disabled>Select one</option><option>Yes, full time</option><option>Yes, part time</option><option>No</option><option>Retired</option></select></Field>
            <Field label="Employer"><Input name="employer" /></Field>
            <Field label="Are You in School? *"><select name="schoolStatus" className={selectClass} required defaultValue=""><option value="" disabled>Select one</option><option>Yes, full time</option><option>Yes, part time</option><option>No</option></select></Field>
            <Field label="How Did You Hear About Us? *"><select name="howHeard" className={selectClass} required defaultValue=""><option value="" disabled>Select one</option><option>Adopted from Safe Haven before</option><option>Internet search</option><option>Adoption event</option><option>Friend</option><option>Shelter</option><option>Another rescue</option><option>Facebook</option><option>Instagram</option><option>TikTok</option><option>Petfinder</option><option>Adopt-a-Pet</option><option>Other</option></select></Field>
          </div>
          <Field label="Referral Details" note="If a person, shelter, rescue, or other source referred you, tell us who."><Input name="howHeardDetails" /></Field>
        </Section>

        <Section title="Availability">
          <Field label="When Are You Ready to Volunteer? *"><Input name="readyToVolunteer" required placeholder="For example: immediately, next month, or after a specific date" /></Field>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-3"><Label>Days Available</Label>{["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"].map((day)=><label key={day} className="flex items-center gap-2"><input className={checkboxClass} type="checkbox" name="daysAvailable" value={day} />{day}</label>)}</div>
            <div className="space-y-3"><Label>Best Times of Day</Label>{["Morning","Afternoon","Evening","Flexible"].map((time)=><label key={time} className="flex items-center gap-2"><input className={checkboxClass} type="checkbox" name="timesAvailable" value={time} />{time}</label>)}</div>
          </div>
        </Section>

        <Section title="Animal & Volunteer Experience">
          <Field label="Have You Volunteered With an Animal Rescue Before? *"><select name="previousRescueVolunteer" className={selectClass} required defaultValue=""><option value="" disabled>Select one</option><option>Yes</option><option>No</option></select></Field>
          <Field label="Previous Organization(s)"><Input name="previousOrganizations" /></Field>
          <Field label="Previous Volunteer Duties"><Textarea name="previousDuties" /></Field>
          <div className="grid md:grid-cols-2 gap-5">
            <Field label="Do You Currently Have a Dog? *"><select name="currentDog" className={selectClass} required defaultValue=""><option value="" disabled>Select one</option><option>Yes</option><option>No</option></select></Field>
            <Field label="Have You Had a Dog in the Past? *"><select name="pastDog" className={selectClass} required defaultValue=""><option value="" disabled>Select one</option><option>Yes</option><option>No</option></select></Field>
            <Field label="Dog Breed Experience"><Input name="dogBreedExperience" /></Field>
            <Field label="Do You Currently Have a Cat? *"><select name="currentCat" className={selectClass} required defaultValue=""><option value="" disabled>Select one</option><option>Yes</option><option>No</option></select></Field>
            <Field label="Have You Had a Cat in the Past? *"><select name="pastCat" className={selectClass} required defaultValue=""><option value="" disabled>Select one</option><option>Yes</option><option>No</option></select></Field>
          </div>
          <Field label="Animal Handling, Training, Grooming, or Other Relevant Experience"><Textarea name="animalExperience" /></Field>
        </Section>

        <Section title="How Would You Like to Help?">
          <p className="text-sm text-muted-foreground">Select all that interest you. *</p>
          <div className="grid md:grid-cols-2 gap-3">
            {interestOptions.map((interest)=><label key={interest} className="flex items-center gap-2"><input className={checkboxClass} type="checkbox" value={interest} checked={interests.includes(interest)} onChange={()=>toggleInterest(interest)} />{interest}</label>)}
          </div>
          <Field label="Anything Else You Would Like Us to Know?"><Textarea name="anythingElse" /></Field>
        </Section>

        <Section title="Volunteer Authorization">
          <p className="text-sm text-muted-foreground leading-6">
            As a volunteer of this rescue, I agree to abide by the policies and procedures. I understand that I will be volunteering at my own risk and that the rescue, its Board of Directors, other volunteers, employees and affiliates, cannot assume any responsibility for any liability for any accident, injury or health problem which may arise from any volunteer work I perform for the rescue. I agree that all the work I do is on a volunteer basis and I am not eligible to receive any monetary payment or reward.
          </p>
          <label className="flex items-start gap-3"><input className={checkboxClass + " mt-1"} type="checkbox" name="authorizationAgreed" required /><span>I agree to the volunteer authorization above. *</span></label>
        </Section>

        <Button type="submit" size="lg" className="w-full" disabled={submitting || interests.length === 0}>{submitting ? "Submitting Application..." : "Submit Volunteer Application"}</Button>
      </form>
    </div>
  )
}
