import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { FeaturedPets } from "@/components/featured-pets"
import { CommunityImpact } from "@/components/community-impact"
import { Testimonials } from "@/components/testimonials"
import { Heart, Search, FileCheck, Home as HomeIcon, Users, DollarSign, Instagram, Facebook } from "lucide-react"

export default function HomePage() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="hero-gradient">
        <div className="container-custom section-padding">
          <div className="max-w-5xl mx-auto text-center space-y-6">
            <p className="text-sm md:text-base font-semibold uppercase tracking-[0.18em] text-primary">
              Safe Haven Humane Society
            </p>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight">
              <span className="block md:whitespace-nowrap">Find Your New Best Friend</span>
              <span className="block">This Week</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground text-balance max-w-3xl mx-auto">
              Safe Haven Humane Society connects pets and people across Jo Daviess County through adoption, fostering, community support, and affordable spay/neuter services.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Button asChild size="lg">
                <Link href="/adopt">See Adoptable Pets</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/foster">Foster a Pet</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/donate">Donate</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="section-padding bg-white">
        <div className="container-custom">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            How It Works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 md:gap-8">
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Search className="h-8 w-8 text-primary" />
              </div>
              <h3 className="font-semibold text-lg">Browse Pets</h3>
              <p className="text-sm text-muted-foreground">
                Check out available dogs and cats
              </p>
            </div>
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <FileCheck className="h-8 w-8 text-primary" />
              </div>
              <h3 className="font-semibold text-lg">Submit Application</h3>
              <p className="text-sm text-muted-foreground">
                Quick and simple online form
              </p>
            </div>
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Heart className="h-8 w-8 text-primary" />
              </div>
              <h3 className="font-semibold text-lg">Meet at the Shelter</h3>
              <p className="text-sm text-muted-foreground">
                Spend time together and ask questions
              </p>
            </div>
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <HomeIcon className="h-8 w-8 text-primary" />
              </div>
              <h3 className="font-semibold text-lg">Welcome Them Home</h3>
              <p className="text-sm text-muted-foreground">
                Start your journey together
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Pets */}
      <section className="section-padding bg-slate-50">
        <div className="container-custom">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-3">
              Meet Some Friends
            </h2>
            <p className="text-muted-foreground">
              These pets are ready for their forever homes
            </p>
          </div>
          <FeaturedPets />
          <div className="text-center mt-10">
            <Button asChild size="lg" variant="outline">
              <Link href="/adopt">View All Adoptable Pets</Link>
            </Button>
          </div>
        </div>
      </section>

      <CommunityImpact />

      <Testimonials />

      {/* Ways To Get Involved */}
      <section className="section-padding bg-slate-50">
        <div className="container-custom">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            Ways To Get Involved
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            <Card className="p-6 md:p-8 text-center space-y-4 hover:shadow-lg transition-shadow">
              <div className="flex justify-center">
                <Heart className="h-12 w-12 text-primary" />
              </div>
              <h3 className="font-bold text-xl">Adopt or Foster</h3>
              <p className="text-muted-foreground">
                Give a pet a loving home, whether permanent or temporary.
              </p>
              <div className="space-y-2 pt-2">
                <Button asChild className="w-full">
                  <Link href="/adopt">See Adoptable Pets</Link>
                </Button>
                <Button asChild variant="outline" className="w-full">
                  <Link href="/foster">Learn About Fostering</Link>
                </Button>
              </div>
            </Card>
            <Card className="p-6 md:p-8 text-center space-y-4 hover:shadow-lg transition-shadow">
              <div className="flex justify-center">
                <Users className="h-12 w-12 text-primary" />
              </div>
              <h3 className="font-bold text-xl">Volunteer</h3>
              <p className="text-muted-foreground">
                Help with shelter care, events, social media, or transport.
              </p>
              <div className="pt-2">
                <Button asChild className="w-full">
                  <Link href="/volunteer">Get Started</Link>
                </Button>
              </div>
            </Card>
            <Card className="p-6 md:p-8 text-center space-y-4 hover:shadow-lg transition-shadow">
              <div className="flex justify-center">
                <DollarSign className="h-12 w-12 text-primary" />
              </div>
              <h3 className="font-bold text-xl">Donate or Sponsor</h3>
              <p className="text-muted-foreground">
                Support medical care, food, and supplies for animals in need.
              </p>
              <div className="pt-2">
                <Button asChild className="w-full">
                  <Link href="/donate">Make a Difference</Link>
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* About Safe Haven */}
      <section className="section-padding bg-primary/5">
        <div className="container-custom">
          <div className="grid grid-cols-1 md:grid-cols-[320px_1fr] gap-8 md:gap-14 items-center max-w-6xl mx-auto">
            <div className="flex justify-center">
              <img
                src="/images/safe-haven-logo-header.png"
                alt="Safe Haven Humane Society"
                width={320}
                height={320}
                className="h-60 w-60 md:h-72 md:w-72 object-contain mix-blend-multiply"
              />
            </div>
            <div className="space-y-5 text-center md:text-left">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary mb-2">
                  About Safe Haven Humane Society
                </p>
                <h2 className="text-3xl md:text-4xl font-bold">
                  A safe place for animals. A stronger community for the people who care about them.
                </h2>
              </div>
              <p className="text-lg text-muted-foreground">
                Safe Haven provides compassionate care for adoptable cats and dogs, helps them find suitable homes, promotes humane treatment, and supports spay/neuter programs that reduce pet overpopulation in our community.
              </p>
              <div className="rounded-2xl border border-primary/20 bg-white/70 p-5 text-center md:text-left">
                <div className="text-4xl md:text-5xl font-bold text-primary">4,193</div>
                <h3 className="text-lg font-bold mt-1">Animals Adopted Through Safe Haven</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  More than four thousand cats and dogs have found homes through Safe Haven Humane Society.
                </p>
              </div>
              <Button asChild variant="outline" size="lg">
                <Link href="/about">Learn More About Safe Haven</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Follow Us */}
      <section className="section-padding bg-white">
        <div className="container-custom">
          <div className="max-w-2xl mx-auto text-center space-y-6">
            <h2 className="text-3xl md:text-4xl font-bold">
              Follow Our Journey
            </h2>
            <p className="text-muted-foreground text-lg">
              Get behind-the-scenes content, adoption spotlights, and daily doses of cuteness.
            </p>
            <div className="flex flex-wrap gap-4 justify-center pt-4">
              <a
                href="https://www.instagram.com/safehaven.animalshelter"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-6 py-3 rounded-full bg-white border-2 border-primary text-primary font-semibold hover:bg-primary hover:text-white transition-colors"
              >
                <Instagram className="h-5 w-5" />
                Instagram
              </a>
              <a
                href="https://www.facebook.com/safehavenelizabethil"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-6 py-3 rounded-full bg-white border-2 border-primary text-primary font-semibold hover:bg-primary hover:text-white transition-colors"
              >
                <Facebook className="h-5 w-5" />
                Facebook
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

