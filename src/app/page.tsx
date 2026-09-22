import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { FeaturedPets } from "@/components/featured-pets"
import { CommunityImpact } from "@/components/community-impact"
import { Testimonials } from "@/components/testimonials"
import { UpcomingEvents } from "@/components/upcoming-events"
import { Heart, Search, FileCheck, Home as HomeIcon, Users, DollarSign, Instagram, Facebook } from "lucide-react"

export default function HomePage() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="hero-gradient">
        <div className="container-custom py-10 md:py-12 lg:py-14">
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

      {/* Featured Pets */}
      <section className="bg-slate-50 px-4 pt-8 pb-12 md:px-6 md:pt-10 md:pb-16 lg:pt-12 lg:pb-20">
        <div className="container-custom">
          <div className="text-center mb-7 md:mb-8">
            <h2 className="text-3xl md:text-4xl font-bold mb-2">
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

      {/* How Adoption Works */}
      <section className="section-padding bg-white">
        <div className="container-custom">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            How Adoption Works
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

      {/* Ways To Get Involved */}
      <section className="section-padding bg-slate-50">
        <div className="container-custom">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            Ways To Get Involved
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            <Card className="home-involvement-glow-card p-6 md:p-8 text-center space-y-4">
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
            <Card className="home-involvement-glow-card p-6 md:p-8 text-center space-y-4">
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
            <Card className="home-involvement-glow-card p-6 md:p-8 text-center space-y-4">
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

      <UpcomingEvents />

      <CommunityImpact />

      <Testimonials />

      {/* About Safe Haven */}
      <section className="section-padding bg-primary/5">
        <div className="container-custom">
          <div className="grid grid-cols-1 lg:grid-cols-[1.02fr_0.98fr] gap-10 lg:gap-16 items-center max-w-6xl mx-auto">
            <div className="relative pb-16 sm:pb-10 lg:pb-14">
              <div className="overflow-hidden rounded-3xl bg-white shadow-sm">
                <img
                  src="/images/about-safe-haven-community.png"
                  alt="Safe Haven Humane Society volunteers and supporters gathered beside the Safe Haven van"
                  className="aspect-[4/3] w-full object-cover"
                />
              </div>

              <div className="absolute bottom-0 left-5 right-5 rounded-2xl border border-primary/15 bg-white p-5 shadow-lg sm:left-auto sm:right-6 sm:w-[310px] md:p-6">
                <div className="text-4xl md:text-5xl font-bold tracking-tight text-primary">
                  4,193
                </div>
                <h3 className="mt-1 text-base md:text-lg font-bold">
                  Animals Adopted Through Safe Haven
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  More than four thousand cats and dogs have found homes through Safe Haven.
                </p>
              </div>
            </div>

            <div className="text-center lg:text-left">
              <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-primary">
                About Safe Haven Humane Society
              </p>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold leading-tight tracking-tight">
                A safe place for animals.
                <span className="block mt-1">A stronger community for the people who care about them.</span>
              </h2>
              <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
                Safe Haven provides compassionate care for adoptable cats and dogs, helps them find suitable homes, promotes humane treatment, and supports spay/neuter programs that reduce pet overpopulation in our community.
              </p>

              <div className="mt-8">
                <Button asChild variant="outline" size="lg">
                  <Link href="/about">Learn More About Safe Haven</Link>
                </Button>
              </div>
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
                href="https://www.facebook.com/safehavenelizabethil"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-6 py-3 rounded-full bg-white border-2 border-primary text-primary font-semibold hover:bg-primary hover:text-white transition-colors"
              >
                <Facebook className="h-5 w-5" />
                Facebook
              </a>
              <a
                href="https://www.instagram.com/safehaven.animalshelter"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-6 py-3 rounded-full bg-white border-2 border-primary text-primary font-semibold hover:bg-primary hover:text-white transition-colors"
              >
                <Instagram className="h-5 w-5" />
                Instagram
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

