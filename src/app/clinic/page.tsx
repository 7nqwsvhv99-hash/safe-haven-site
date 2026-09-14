import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Scissors, Syringe, Heart, ClipboardCheck, Clock3, CreditCard } from "lucide-react"

export default function ClinicPage() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="hero-gradient">
        <div className="container-custom section-padding">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
              Affordable Spay & Neuter Care
            </h1>
            <p className="text-lg text-muted-foreground">
              Safe Haven Humane Society provides low-cost spay/neuter services for cats and dogs, with select add-on services available when appropriate.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg">
                <a href="https://airtable.com/app3AcoD2G64aMsEz/pag18veN4frVCtuOz/form" target="_blank" rel="noopener noreferrer">
                  Complete the Intake Form
                </a>
              </Button>
              <Button asChild variant="outline" size="lg"><Link href="#pricing">View Pricing</Link></Button>
            </div>
            <p className="text-sm text-muted-foreground">
              The current public intake form is for cat spay/neuter requests. A dog intake form will be added later.
            </p>
          </div>
        </div>
      </section>

      {/* Services Offered */}
      <section className="section-padding bg-white">
        <div className="container-custom">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">Clinic Services</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 max-w-4xl mx-auto">
            <Card className="p-6 text-center space-y-4">
              <div className="flex justify-center"><Scissors className="h-12 w-12 text-primary" /></div>
              <h3 className="font-bold text-xl">Spay & Neuter</h3>
              <p className="text-muted-foreground text-sm">
                Surgical sterilization for cats and dogs through scheduled clinic days. Availability and eligibility vary by clinic date.
              </p>
            </Card>
            <Card className="p-6 text-center space-y-4">
              <div className="flex justify-center"><Syringe className="h-12 w-12 text-primary" /></div>
              <h3 className="font-bold text-xl">Select Add-On Services</h3>
              <p className="text-muted-foreground text-sm">
                Rabies, FVRCP, DAPP, microchipping, FeLV/FIV testing, and parasite treatment may be available depending on the animal and appointment.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* How Intake Works */}
      <section className="section-padding bg-slate-50">
        <div className="container-custom">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">How to Request a Clinic Appointment</h2>
            <p className="text-muted-foreground">
              Start with the online intake form. A submitted form is a request for care, not a confirmed appointment.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 max-w-5xl mx-auto">
            <Card className="p-6 space-y-4">
              <ClipboardCheck className="h-10 w-10 text-primary" />
              <p className="text-sm font-semibold uppercase tracking-wide text-primary">Step 1</p>
              <h3 className="font-bold text-xl">Complete the Intake Form</h3>
              <p className="text-muted-foreground text-sm">
                Share your contact information, your cat&apos;s information, requested services, and required acknowledgements.
              </p>
            </Card>
            <Card className="p-6 space-y-4">
              <Clock3 className="h-10 w-10 text-primary" />
              <p className="text-sm font-semibold uppercase tracking-wide text-primary">Step 2</p>
              <h3 className="font-bold text-xl">Watch for Follow-Up</h3>
              <p className="text-muted-foreground text-sm">
                A clinic volunteer will review your request and respond within 72 hours with availability and next steps.
              </p>
            </Card>
            <Card className="p-6 space-y-4">
              <CreditCard className="h-10 w-10 text-primary" />
              <p className="text-sm font-semibold uppercase tracking-wide text-primary">Step 3</p>
              <h3 className="font-bold text-xl">Prepare for Check-In</h3>
              <p className="text-muted-foreground text-sm">
                If an appointment is scheduled, payment is due at check-in. Safe Haven accepts cash, check, credit card, or Venmo at @safehaven1471.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Why Spay/Neuter */}
      <section className="section-padding bg-slate-50">
        <div className="container-custom max-w-4xl">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">Why Spay or Neuter?</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h3 className="font-bold text-xl flex items-center gap-2"><Heart className="h-5 w-5 text-primary" />For Animals & Families</h3>
              <ul className="space-y-2 text-muted-foreground">
                <li>• Prevents unwanted litters</li>
                <li>• Can reduce certain reproductive health risks</li>
                <li>• Helps more families access an essential veterinary service</li>
              </ul>
            </div>
            <div className="space-y-4">
              <h3 className="font-bold text-xl flex items-center gap-2"><Heart className="h-5 w-5 text-primary" />For Our Community</h3>
              <ul className="space-y-2 text-muted-foreground">
                <li>• Helps reduce pet overpopulation</li>
                <li>• Supports rescue and community cat efforts</li>
                <li>• Helps reduce future shelter intake</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="section-padding bg-white">
        <div className="container-custom max-w-4xl">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">Current Clinic Pricing</h2>
          <p className="text-center text-muted-foreground mb-10">These are Safe Haven&apos;s current clinic prices. Availability and pricing may change.</p>
          <Card className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
              <div className="flex justify-between items-center py-3 border-b"><span>Cat Spay</span><span className="font-semibold text-primary">$70</span></div>
              <div className="flex justify-between items-center py-3 border-b"><span>Cat Neuter</span><span className="font-semibold text-primary">$50</span></div>
              <div className="flex justify-between items-center py-3 border-b"><span>Dog Spay</span><span className="font-semibold text-primary">$200</span></div>
              <div className="flex justify-between items-center py-3 border-b"><span>Dog Neuter</span><span className="font-semibold text-primary">$125</span></div>
              <div className="flex justify-between items-center py-3 border-b"><span>Rabies Vaccine</span><span className="font-semibold text-primary">$10</span></div>
              <div className="flex justify-between items-center py-3 border-b"><span>FVRCP / DAPP Vaccine</span><span className="font-semibold text-primary">$10</span></div>
              <div className="flex justify-between items-center py-3 border-b"><span>Microchip</span><span className="font-semibold text-primary">$20</span></div>
              <div className="flex justify-between items-center py-3 border-b"><span>FeLV/FIV Test</span><span className="font-semibold text-primary">$35</span></div>
            </div>
          </Card>
        </div>
      </section>

      {/* Financial Help */}
      <section className="section-padding bg-slate-50">
        <div className="container-custom max-w-3xl text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">Concerned About Cost?</h2>
          <p className="text-muted-foreground mb-8">
            Safe Haven may be able to help when financial hardship makes clinic care difficult. Contact us to ask about current options and eligibility.
          </p>
          <Button asChild variant="outline"><a href="mailto:safehaven1471@gmail.com">Ask About Financial Help</a></Button>
        </div>
      </section>
    </div>
  )
}
