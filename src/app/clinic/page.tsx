import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Stethoscope, Scissors, Syringe, Heart, Calendar } from "lucide-react"

export default function ClinicPage() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="hero-gradient">
        <div className="container-custom section-padding">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
              Affordable Vet Care for Our Community
            </h1>
            <p className="text-lg text-muted-foreground">
              Quality spay/neuter services and basic veterinary care at prices everyone can afford.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg">
                <Link href="#book">Book an Appointment</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="#assistance">Financial Assistance</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Services Offered */}
      <section className="section-padding bg-white">
        <div className="container-custom">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            Our Services
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            <Card className="p-6 text-center space-y-4">
              <div className="flex justify-center">
                <Scissors className="h-12 w-12 text-primary" />
              </div>
              <h3 className="font-bold text-xl">Spay & Neuter</h3>
              <p className="text-muted-foreground text-sm">
                Professional surgical sterilization for cats and dogs. Prevents unwanted litters and health issues.
              </p>
              <div className="pt-2">
                <p className="font-semibold text-primary">Starting at $45</p>
              </div>
            </Card>
            <Card className="p-6 text-center space-y-4">
              <div className="flex justify-center">
                <Syringe className="h-12 w-12 text-primary" />
              </div>
              <h3 className="font-bold text-xl">Vaccinations</h3>
              <p className="text-muted-foreground text-sm">
                Core vaccines for puppies, kittens, and adult pets. Keep your pet healthy and protected.
              </p>
              <div className="pt-2">
                <p className="font-semibold text-primary">Starting at $15</p>
              </div>
            </Card>
            <Card className="p-6 text-center space-y-4">
              <div className="flex justify-center">
                <Stethoscope className="h-12 w-12 text-primary" />
              </div>
              <h3 className="font-bold text-xl">Wellness Exams</h3>
              <p className="text-muted-foreground text-sm">
                Basic health checks and consultations. Early detection keeps pets healthier longer.
              </p>
              <div className="pt-2">
                <p className="font-semibold text-primary">Starting at $25</p>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Why Spay/Neuter */}
      <section className="section-padding bg-slate-50">
        <div className="container-custom max-w-4xl">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            Why Spay or Neuter Your Pet?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h3 className="font-bold text-xl flex items-center gap-2">
                <Heart className="h-5 w-5 text-primary" />
                Health Benefits
              </h3>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex gap-2">
                  <span>•</span>
                  <span>Reduces risk of certain cancers</span>
                </li>
                <li className="flex gap-2">
                  <span>•</span>
                  <span>Prevents uterine infections</span>
                </li>
                <li className="flex gap-2">
                  <span>•</span>
                  <span>May increase lifespan</span>
                </li>
                <li className="flex gap-2">
                  <span>•</span>
                  <span>Reduces aggression and roaming</span>
                </li>
              </ul>
            </div>
            <div className="space-y-4">
              <h3 className="font-bold text-xl flex items-center gap-2">
                <Heart className="h-5 w-5 text-primary" />
                Community Benefits
              </h3>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex gap-2">
                  <span>•</span>
                  <span>Prevents pet overpopulation</span>
                </li>
                <li className="flex gap-2">
                  <span>•</span>
                  <span>Reduces shelter intake</span>
                </li>
                <li className="flex gap-2">
                  <span>•</span>
                  <span>Fewer stray animals</span>
                </li>
                <li className="flex gap-2">
                  <span>•</span>
                  <span>Saves taxpayer dollars</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing & Who Qualifies */}
      <section className="section-padding bg-white">
        <div className="container-custom max-w-4xl">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            Affordable Pricing
          </h2>
          <div className="space-y-6">
            <Card className="p-6">
              <h3 className="font-bold text-lg mb-4">Standard Pricing</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex justify-between items-center py-2 border-b">
                  <span>Cat Spay/Neuter</span>
                  <span className="font-semibold text-primary">$45-65</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span>Dog Spay/Neuter (under 50lbs)</span>
                  <span className="font-semibold text-primary">$75-95</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span>Rabies Vaccine</span>
                  <span className="font-semibold text-primary">$15</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span>DHPP/FVRCP Vaccine</span>
                  <span className="font-semibold text-primary">$20</span>
                </div>
              </div>
            </Card>
            <div className="text-center">
              <p className="text-muted-foreground">
                All surgeries include pain medication and post-op care instructions.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Financial Assistance */}
      <section id="assistance" className="section-padding bg-slate-50">
        <div className="container-custom max-w-3xl">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-6">
            Need Financial Help?
          </h2>
          <p className="text-center text-muted-foreground mb-12">
            We never want cost to be a barrier to care. We offer sliding scale pricing and payment plans for families who qualify.
          </p>
          <Card className="p-8 text-center space-y-4">
            <h3 className="font-bold text-xl">Financial Assistance Available</h3>
            <p className="text-muted-foreground">
              If you receive public assistance, are a senior citizen on a fixed income, or are facing financial hardship, you may qualify for reduced rates.
            </p>
            <p className="text-sm text-muted-foreground">
              We understand that asking for help can feel uncomfortable. Our team is compassionate and discreet. Everyone deserves access to quality vet care for their pets.
            </p>
            <Button size="lg">
              Inquire About Assistance
            </Button>
          </Card>
        </div>
      </section>

      {/* Book Appointment */}
      <section id="book" className="section-padding bg-white">
        <div className="container-custom max-w-2xl text-center">
          <Calendar className="h-16 w-16 text-primary mx-auto mb-6" />
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Book Your Appointment
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Call us at <a href="tel:815-858-2265" className="text-primary font-semibold hover:underline">(815) 858-2265</a> to schedule your pet's appointment. We're here Monday through Friday, 9am to 5pm.
          </p>
          <div className="bg-slate-50 rounded-2xl p-6 text-left space-y-3">
            <h3 className="font-semibold">What to bring:</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex gap-2">
                <span>•</span>
                <span>Your pet's vaccination records (if available)</span>
              </li>
              <li className="flex gap-2">
                <span>•</span>
                <span>Proof of income (for financial assistance)</span>
              </li>
              <li className="flex gap-2">
                <span>•</span>
                <span>Your pet in a carrier (cats) or on a leash (dogs)</span>
              </li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  )
}
