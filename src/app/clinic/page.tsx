import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Scissors, Syringe, Heart, Calendar, Phone, Mail } from "lucide-react"

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
              Safe Haven Humane Society provides low-cost spay/neuter services, with select vaccines and other clinic services available when appropriate.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg"><Link href="#contact">Ask About an Appointment</Link></Button>
              <Button asChild variant="outline" size="lg"><Link href="#pricing">View Pricing</Link></Button>
            </div>
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
                Rabies, FVRCP, DAPP, microchipping, FeLV/FIV testing, parasite treatment, and other services may be available depending on the animal and appointment.
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
          <p className="text-center text-muted-foreground mb-10">Pricing shown reflects the current ClinicDay service catalog and may change as services are updated.</p>
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

      {/* Contact */}
      <section id="contact" className="section-padding bg-white">
        <div className="container-custom max-w-2xl text-center">
          <Calendar className="h-16 w-16 text-primary mx-auto mb-6" />
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Ask About a Clinic Appointment</h2>
          <p className="text-lg text-muted-foreground mb-8">
            Clinic dates and availability vary. Contact Safe Haven for current scheduling information.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg"><a href="tel:815-858-2265"><Phone className="h-4 w-4 mr-2" />(815) 858-2265</a></Button>
            <Button asChild variant="outline" size="lg"><a href="mailto:safehaven1471@gmail.com"><Mail className="h-4 w-4 mr-2" />Email Safe Haven</a></Button>
          </div>
          <p className="text-sm text-muted-foreground mt-8">
            Safe Haven's clinic is focused on spay/neuter services and does not replace a full-service veterinary practice or provide after-hours care.
          </p>
        </div>
      </section>
    </div>
  )
}
