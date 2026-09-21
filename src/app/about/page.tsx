import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  MapPin,
  Phone,
  Mail,
  Heart,
  Shield,
  Users,
  Sparkles,
  PawPrint,
  HandHeart,
  Stethoscope
} from "lucide-react"

const values = [
  {
    title: "Compassion",
    description: "We treat every animal with kindness and respect, no matter their background.",
    icon: Heart,
  },
  {
    title: "Transparency",
    description: "We're open about our work, finances, and challenges. Honesty builds trust.",
    icon: Shield,
  },
  {
    title: "Community",
    description: "We're a hub for animal lovers, working together to create change.",
    icon: Users,
  },
  {
    title: "Hope",
    description: "Every animal can have a better tomorrow. We believe in second chances.",
    icon: Sparkles,
  },
]

const communityWork = [
  {
    title: "Shelter & Foster Care",
    description:
      "Staff, volunteers, and foster families provide daily care, enrichment, and a safe place while animals wait for home.",
    icon: PawPrint,
  },
  {
    title: "Clinic Team",
    description:
      "Veterinary professionals and clinic volunteers work together to make spay/neuter and preventive care more accessible.",
    icon: Stethoscope,
  },
  {
    title: "Community Support",
    description:
      "Adopters, donors, rescue partners, food-distribution volunteers, and community cat caregivers extend Safe Haven's impact far beyond the shelter.",
    icon: HandHeart,
  },
]

export default function AboutPage() {
  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="hero-gradient">
        <div className="container-custom section-padding">
          <div className="max-w-6xl mx-auto text-center space-y-6">
            <p className="text-sm md:text-base font-semibold uppercase tracking-[0.18em] text-primary">
              Serving Jo Daviess County Since 1994
            </p>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight lg:whitespace-nowrap">
              About Safe Haven Humane Society
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-5xl mx-auto leading-relaxed">
              <span className="lg:block">For more than three decades, Safe Haven has brought people together around one shared purpose:</span>
              <span className="lg:block">giving cats and dogs the care, protection, and second chances they deserve.</span>
            </p>
          </div>
        </div>
      </section>

      {/* Mission + Values */}
      <section className="section-padding bg-white">
        <div className="container-custom">
          <div className="grid grid-cols-1 lg:grid-cols-[0.9fr_1.1fr] gap-10 lg:gap-14 items-start max-w-7xl mx-auto">
            <div className="lg:sticky lg:top-24">
              <div className="overflow-hidden rounded-3xl bg-slate-100 shadow-sm">
                <img
                  src="/images/about-safe-haven-community.png"
                  alt="Safe Haven Humane Society volunteers and supporters gathered beside the Safe Haven van"
                  className="w-full h-auto object-cover"
                />
              </div>
              <p className="mt-4 text-sm text-muted-foreground">
                Safe Haven is powered by people who care deeply about animals and the community they share.
              </p>
            </div>

            <div className="space-y-12">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary mb-3">
                  Our Mission
                </p>
                <h2 className="text-3xl lg:text-[32px] xl:text-4xl font-bold mb-6 leading-tight">
                  <span className="lg:block lg:whitespace-nowrap">A haven for animals.</span>
                  <span className="lg:block lg:whitespace-nowrap">A community committed to their future.</span>
                </h2>
                <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
                  Safe Haven&apos;s mission is to provide a haven and any necessary treatment for adoptable
                  cats and dogs, place them in forever homes, increase awareness of the humane treatment of
                  animals, and promote spay and neuter programs to reduce the overpopulation of cats and dogs
                  in Jo Daviess County.
                </p>
                <p className="text-base text-muted-foreground mt-5 leading-relaxed">
                  Safe Haven is a small nonprofit 501(c)(3) organization supported by community donations,
                  memberships, volunteers, adopters, foster families, and partners.
                </p>
              </div>

              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary mb-5">
                  What Guides Us
                </p>
                <div className="divide-y divide-slate-200 border-y border-slate-200">
                  {values.map(({ title, description, icon: Icon }) => (
                    <div key={title} className="grid grid-cols-[auto_1fr] gap-4 py-6">
                      <div className="h-11 w-11 rounded-full bg-primary/10 flex items-center justify-center mt-0.5">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-bold text-xl">{title}</h3>
                        <p className="text-muted-foreground mt-1 leading-relaxed">{description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Impact Number */}
      <section className="py-16 md:py-20 bg-primary text-primary-foreground">
        <div className="container-custom">
          <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-[0.75fr_1.25fr] gap-6 md:gap-12 items-center">
            <div className="text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight">
              4,193
            </div>
            <div>
              <h2 className="text-2xl md:text-3xl font-bold">Animals Adopted Through Safe Haven</h2>
              <p className="mt-3 text-primary-foreground/80 text-lg leading-relaxed">
                More than four thousand cats and dogs have found homes through Safe Haven Humane Society.
                Every adoption represents an animal given another chance and a family changed along the way.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Powered by Community */}
      <section className="section-padding bg-slate-50">
        <div className="container-custom">
          <div className="max-w-3xl mb-10 md:mb-14">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary mb-3">
              How the Work Happens
            </p>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Powered by Our Community</h2>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Safe Haven&apos;s work reaches far beyond the shelter building. It happens because people give
              their time, expertise, homes, resources, and trust to animals in need.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl">
            {communityWork.map(({ title, description, icon: Icon }) => (
              <Card key={title} className="community-card relative p-7 md:p-8 space-y-5 h-full">
                <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Icon className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-xl">{title}</h3>
                  <p className="text-muted-foreground mt-3 leading-relaxed">{description}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Since 1994 */}
      <section className="section-padding bg-white">
        <div className="container-custom">
          <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-[0.7fr_1.3fr] gap-8 md:gap-14 items-start">
            <div>
              <div className="text-6xl md:text-7xl font-bold text-primary">1994</div>
              <p className="mt-2 font-semibold text-lg">Where the story begins</p>
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary mb-3">
                Rooted in Jo Daviess County
              </p>
              <h2 className="text-3xl md:text-4xl font-bold mb-5">More than a shelter</h2>
              <div className="space-y-4 text-lg text-muted-foreground leading-relaxed">
                <p>
                  Since 1994, Safe Haven Humane Society has worked alongside the community to improve the
                  lives of animals through adoption, humane care, education, and population-control efforts.
                </p>
                <p>
                  The organization has grown around the same idea that still drives the work today: lasting
                  change happens when people come together to care for animals and for one another.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Visit Us */}
      <section className="section-padding bg-white">
        <div className="container-custom">
          <div className="text-center mb-10">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary mb-2">
              Come See Us
            </p>
            <h2 className="text-3xl md:text-4xl font-bold">Visit Safe Haven</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
            <Card className="p-6 md:p-7 space-y-5">
              <div className="h-11 w-11 rounded-full bg-primary/10 flex items-center justify-center">
                <MapPin className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-xl">Location</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  1471 US Hwy 20 W<br />Elizabeth, IL 61028
                </p>
              </div>
              <Button asChild className="w-full">
                <a
                  href="https://www.google.com/maps/search/?api=1&query=1471+US+Hwy+20+W+Elizabeth+IL+61028"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Get Directions
                </a>
              </Button>
            </Card>

            <Card className="p-6 md:p-7 space-y-5">
              <div className="h-11 w-11 rounded-full bg-primary/10 flex items-center justify-center">
                <Heart className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-xl">Shelter Hours</h3>
                <dl className="space-y-3 text-sm mt-3">
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Monday through Saturday</dt>
                    <dd className="font-semibold whitespace-nowrap">10 AM to 3 PM</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Sunday</dt>
                    <dd className="font-semibold">Closed</dd>
                  </div>
                </dl>
              </div>
            </Card>

            <Card className="p-6 md:p-7 space-y-5">
              <div className="h-11 w-11 rounded-full bg-primary/10 flex items-center justify-center">
                <Phone className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-xl">Contact Information</h3>
                <div className="space-y-3 mt-3">
                  <div className="flex items-start gap-3">
                    <Phone className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                    <a
                      href="tel:815-858-2265"
                      className="text-sm text-muted-foreground hover:text-primary"
                    >
                      (815) 858-2265
                    </a>
                  </div>
                  <div className="flex items-start gap-3">
                    <Mail className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                    <a
                      href="mailto:safehaven1471@gmail.com"
                      className="text-sm text-muted-foreground hover:text-primary"
                    >
                      safehaven1471@gmail.com
                    </a>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section-padding bg-slate-50">
        <div className="container-custom max-w-3xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary mb-3">
            Be Part of What Comes Next
          </p>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Join Our Community</h2>
          <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
            Whether you adopt, foster, volunteer, or donate, you become part of the network of people making
            second chances possible.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg">
              <Link href="/adopt">Adopt a Pet</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/volunteer">Volunteer</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/donate">Donate</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}
