import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { MapPin, Phone, Mail, Heart, Shield, Users, Sparkles, PawPrint, HandHeart, Stethoscope } from "lucide-react"

export default function AboutPage() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="hero-gradient">
        <div className="container-custom section-padding">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
              About Safe Haven Humane Society
            </h1>
            <p className="text-lg text-muted-foreground">
              Since 1994, we've been connecting pets and people in Jo Daviess County and working alongside our community to improve the lives of animals.
            </p>
          </div>
        </div>
      </section>

      {/* Our Story */}
      <section className="section-padding bg-white">
        <div className="container-custom max-w-4xl">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            Our Story
          </h2>
          <div className="space-y-6 text-lg text-muted-foreground">
            <p>
              Safe Haven Humane Society was founded in 1994 by a small group of volunteers who saw a need for compassionate animal welfare services in Jo Daviess County. What started as a handful of foster homes has grown into a full-service shelter and clinic serving thousands of animals each year.
            </p>
            <p>
              We believe every animal deserves a second chance. Whether they come to us as strays, surrenders, or transfers from overcrowded shelters, each one receives medical care, love, and the time they need to find the perfect home.
            </p>
            <p>
              Today, Safe Haven operates a shelter, low-cost spay/neuter clinic, and active foster network. We work with local veterinarians, rescue partners, and community members to reduce pet overpopulation and ensure no animal is left behind.
            </p>
          </div>
        </div>
      </section>

      {/* Our Values */}
      <section className="section-padding bg-slate-50">
        <div className="container-custom">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            Our Values
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="p-6 text-center space-y-4">
              <div className="flex justify-center"><Heart className="h-12 w-12 text-primary" /></div>
              <h3 className="font-bold text-lg">Compassion</h3>
              <p className="text-sm text-muted-foreground">We treat every animal with kindness and respect, no matter their background.</p>
            </Card>
            <Card className="p-6 text-center space-y-4">
              <div className="flex justify-center"><Shield className="h-12 w-12 text-primary" /></div>
              <h3 className="font-bold text-lg">Transparency</h3>
              <p className="text-sm text-muted-foreground">We're open about our work, finances, and challenges. Honesty builds trust.</p>
            </Card>
            <Card className="p-6 text-center space-y-4">
              <div className="flex justify-center"><Users className="h-12 w-12 text-primary" /></div>
              <h3 className="font-bold text-lg">Community</h3>
              <p className="text-sm text-muted-foreground">We're a hub for animal lovers, working together to create change.</p>
            </Card>
            <Card className="p-6 text-center space-y-4">
              <div className="flex justify-center"><Sparkles className="h-12 w-12 text-primary" /></div>
              <h3 className="font-bold text-lg">Hope</h3>
              <p className="text-sm text-muted-foreground">Every animal can have a better tomorrow. We believe in second chances.</p>
            </Card>
          </div>
        </div>
      </section>

      {/* Powered by Community */}
      <section className="section-padding bg-white">
        <div className="container-custom">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-3">Powered by Our Community</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Safe Haven's work is made possible by people who give their time, expertise, homes, and support to animals in need.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            <Card className="p-6 text-center space-y-4">
              <div className="flex justify-center"><PawPrint className="h-12 w-12 text-primary" /></div>
              <h3 className="font-bold text-lg">Shelter & Foster Care</h3>
              <p className="text-sm text-muted-foreground">Staff, volunteers, and foster families provide daily care, enrichment, and a safe place while animals wait for home.</p>
            </Card>
            <Card className="p-6 text-center space-y-4">
              <div className="flex justify-center"><Stethoscope className="h-12 w-12 text-primary" /></div>
              <h3 className="font-bold text-lg">Clinic Team</h3>
              <p className="text-sm text-muted-foreground">Veterinary professionals and clinic volunteers work together to make spay/neuter and preventive care more accessible.</p>
            </Card>
            <Card className="p-6 text-center space-y-4">
              <div className="flex justify-center"><HandHeart className="h-12 w-12 text-primary" /></div>
              <h3 className="font-bold text-lg">Community Support</h3>
              <p className="text-sm text-muted-foreground">Adopters, donors, rescue partners, food-distribution volunteers, and community cat caregivers extend Safe Haven's impact far beyond the shelter.</p>
            </Card>
          </div>
        </div>
      </section>

      {/* Visit Us */}
      <section className="section-padding bg-slate-50">
        <div className="container-custom">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">Visit Safe Haven</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <Card className="p-6 space-y-4">
              <h3 className="font-bold text-xl">Location</h3>
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Address</p>
                  <p className="text-sm text-muted-foreground">1471 US Hwy 20 W<br />Elizabeth, IL 61028</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">For current visiting hours or questions before your trip, please call or email us.</p>
            </Card>
            <Card className="p-6 space-y-4">
              <h3 className="font-bold text-xl">Contact Information</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Phone className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">Phone</p>
                    <a href="tel:815-858-2265" className="text-sm text-muted-foreground hover:text-primary">(815) 858-2265</a>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Mail className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">Email</p>
                    <a href="mailto:safehaven1471@gmail.com" className="text-sm text-muted-foreground hover:text-primary">safehaven1471@gmail.com</a>
                  </div>
                </div>
              </div>
              <div className="pt-2">
                <Button asChild className="w-full">
                  <a href="https://www.google.com/maps/search/?api=1&query=1471+US+Hwy+20+W+Elizabeth+IL+61028" target="_blank" rel="noopener noreferrer">Get Directions</a>
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Get Involved CTA */}
      <section className="section-padding bg-white">
        <div className="container-custom max-w-2xl text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Join Our Community</h2>
          <p className="text-lg text-muted-foreground mb-8">Whether you adopt, foster, volunteer, or donate, you're part of our mission to save lives and build families.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg"><Link href="/adopt">Adopt a Pet</Link></Button>
            <Button asChild variant="outline" size="lg"><Link href="/volunteer">Volunteer</Link></Button>
            <Button asChild variant="outline" size="lg"><Link href="/donate">Donate</Link></Button>
          </div>
        </div>
      </section>
    </div>
  )
}
