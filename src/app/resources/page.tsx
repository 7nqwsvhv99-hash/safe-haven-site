import Link from "next/link"
import {
  CircleAlert,
  ExternalLink,
  HeartHandshake,
  House,
  Mail,
  PawPrint,
  Phone,
  Stethoscope,
  ArrowRight,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

const financialResources = [
  {
    name: "Best Friends Financial Assistance Directory",
    description:
      "A broad starting point with national resources and state-by-state listings, including options for Illinois and nearby states.",
    href: "https://resources.bestfriends.org/article/financial-aid-pets",
    label: "Search the Directory",
  },
  {
    name: "RedRover Relief Urgent Care Grants",
    description:
      "Small grants for eligible pet guardians facing financial hardship when a pet needs urgent or life-saving veterinary care.",
    href: "https://redrover.org/relief/urgent-care-grants/",
    label: "Review Grant Requirements",
  },
  {
    name: "The Pet Fund",
    description:
      "Financial assistance for eligible non-basic, non-urgent veterinary care. This program does not fund emergency treatment and may have a wait list.",
    href: "https://www.thepetfund.com/for-pet-owners",
    label: "Visit The Pet Fund",
  },
  {
    name: "CareCredit",
    description:
      "A healthcare financing option that may be accepted by veterinary providers. This is credit, not financial assistance, and approval and financing terms apply.",
    href: "https://www.carecredit.com/vetmed/",
    label: "Learn About CareCredit",
  },
]

export default function ResourcesPage() {
  return (
    <div className="flex flex-col">
      <section className="hero-gradient">
        <div className="container-custom py-10 md:py-12 lg:py-14">
          <div className="max-w-6xl mx-auto text-center space-y-6">
            <p className="text-sm md:text-base font-semibold uppercase tracking-[0.18em] text-primary">
              Community Resources
            </p>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight">
              Help for Pet Owners
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-6xl mx-auto lg:whitespace-nowrap">
              Find trusted starting points for veterinary costs, low-cost spay and neuter services, and responsible rehoming.
            </p>
          </div>
        </div>
      </section>

      <section className="section-padding bg-white">
        <div className="container-custom max-w-6xl">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-bold mb-3">What do you need help with?</h2>
            <p className="text-muted-foreground">Choose the option that best fits your situation.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="p-7 text-center space-y-4">
              <HeartHandshake className="h-11 w-11 text-primary mx-auto" />
              <h3 className="font-bold text-xl">Veterinary Costs</h3>
              <p className="text-sm text-muted-foreground">
                Explore outside assistance programs and a clearly labeled financing option.
              </p>
              <Button asChild variant="outline" className="w-full">
                <a href="#financial-assistance">View Financial Resources</a>
              </Button>
            </Card>
            <Card className="p-7 text-center space-y-4">
              <Stethoscope className="h-11 w-11 text-primary mx-auto" />
              <h3 className="font-bold text-xl">Spay &amp; Neuter</h3>
              <p className="text-sm text-muted-foreground">
                Learn about Safe Haven&apos;s affordable spay/neuter clinic and how to request care.
              </p>
              <Button asChild variant="outline" className="w-full">
                <Link href="/clinic">Visit the Clinic Page</Link>
              </Button>
            </Card>
            <Card className="p-7 text-center space-y-4">
              <House className="h-11 w-11 text-primary mx-auto" />
              <h3 className="font-bold text-xl">Rehoming a Pet</h3>
              <p className="text-sm text-muted-foreground">
                Find practical next steps when keeping your pet is no longer possible.
              </p>
              <Button asChild variant="outline" className="w-full">
                <a href="#rehoming">See Rehoming Options</a>
              </Button>
            </Card>
          </div>
        </div>
      </section>

      <section id="financial-assistance" className="section-padding bg-slate-50 scroll-mt-24">
        <div className="container-custom max-w-6xl">
          <div className="max-w-3xl mb-10">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary mb-2">
              Veterinary Financial Assistance
            </p>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">A shorter list of useful places to start</h2>
            <p className="text-muted-foreground leading-relaxed">
              Safe Haven cannot pay veterinary bills for privately owned pets, but these outside resources may help you explore assistance or financing. Each program has its own rules, application process, and funding limits.
            </p>
          </div>

          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6 mb-8 flex items-start gap-4">
            <CircleAlert className="h-6 w-6 text-primary shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold mb-1">If your pet needs emergency care</h3>
              <p className="text-sm text-muted-foreground">
                Contact a veterinarian or emergency hospital right away. Do not delay urgent treatment while waiting for a grant decision.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {financialResources.map((resource) => (
              <Card key={resource.name} className="p-7 flex flex-col gap-4">
                <div className="flex-1">
                  <h3 className="font-bold text-xl mb-3">{resource.name}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{resource.description}</p>
                </div>
                <Button asChild variant="outline" className="w-full sm:w-fit">
                  <a href={resource.href} target="_blank" rel="noopener noreferrer">
                    {resource.label}
                    <ExternalLink className="h-4 w-4 ml-2" />
                  </a>
                </Button>
              </Card>
            ))}
          </div>

          <p className="text-xs text-muted-foreground mt-7 leading-relaxed">
            Safe Haven Humane Society does not administer these programs, determine eligibility, or guarantee that assistance will be available. Program details can change, so confirm current requirements directly with each provider.
          </p>
        </div>
      </section>

      <section id="rehoming" className="section-padding bg-white scroll-mt-24">
        <div className="container-custom max-w-6xl">
          <div className="grid grid-cols-1 lg:grid-cols-[1.05fr_0.95fr] gap-8 lg:gap-12 items-start">
            <div className="space-y-6">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary mb-2">
                  Need to Rehome Your Pet?
                </p>
                <h2 className="text-3xl md:text-4xl font-bold mb-4">Start with the safest next step</h2>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  We understand that circumstances can change. Sometimes finding a new home is the safest or most responsible choice for a pet and the people who love them.
                </p>
              </div>

              <div className="space-y-4">
                <h3 className="font-bold text-xl">If keeping your pet may still be possible</h3>
                <div className="space-y-3">
                  <div className="flex gap-3">
                    <HeartHandshake className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <p className="text-sm text-muted-foreground">
                      If veterinary costs are the main concern, review the <a href="#financial-assistance" className="font-semibold text-primary hover:underline">financial resources above</a>.
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <Stethoscope className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <p className="text-sm text-muted-foreground">
                      If your pet needs to be spayed or neutered, learn about <Link href="/clinic" className="font-semibold text-primary hover:underline">Safe Haven&apos;s low-cost clinic</Link>.
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <PawPrint className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <p className="text-sm text-muted-foreground">
                      If food or supplies are the main challenge, contact Safe Haven to ask about current help or local referrals.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Button asChild variant="outline">
                  <a href="tel:815-858-2265"><Phone className="h-4 w-4 mr-2" />Call Safe Haven</a>
                </Button>
                <Button asChild variant="outline">
                  <a href="mailto:safehaven1471@gmail.com?subject=Pet%20Owner%20Resources"><Mail className="h-4 w-4 mr-2" />Email Safe Haven</a>
                </Button>
              </div>
            </div>

            <Card className="p-7 md:p-8 border-primary/20 bg-primary/5 space-y-5">
              <div className="h-14 w-14 rounded-full bg-white flex items-center justify-center">
                <House className="h-7 w-7 text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-2xl mb-3">Rehome by Adopt-a-Pet</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Rehome helps owners create a pet profile, review potential adopters, and move a dog or cat directly from one home to another instead of placing the pet in a shelter.
                </p>
              </div>
              <div className="rounded-xl bg-white p-4 text-sm text-muted-foreground">
                Rehome currently accepts dogs and cats that are already spayed or neutered. If your pet is not altered, visit our clinic page before starting a listing.
              </div>
              <Button asChild size="lg" className="w-full">
                <a href="https://rehome.adoptapet.com/list-a-pet/step-1" target="_blank" rel="noopener noreferrer">
                  Start a Rehome Listing
                  <ExternalLink className="h-4 w-4 ml-2" />
                </a>
              </Button>
              <Button asChild variant="outline" className="w-full bg-white">
                <Link href="/clinic">Learn About Spay &amp; Neuter</Link>
              </Button>
            </Card>
          </div>
        </div>
      </section>

      <section id="newsletters" className="py-14 md:py-16 bg-primary/5">
        <div className="container-custom max-w-6xl">
          <div className="mb-8">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary mb-2">
              Stay Connected
            </p>
            <h2 className="text-3xl md:text-4xl font-bold">Past Newsletters</h2>
            <p className="text-muted-foreground mt-2 max-w-2xl">
              Read previous issues and see the animals, people, and community support behind Safe Haven&apos;s work.
            </p>
          </div>

          <div className="divide-y divide-primary/15 border-y border-primary/15">
            {[
              ["Summer 2026", "/newsletters/safe-haven-summer-2026.pdf"],
              ["Spring 2026", "/newsletters/safe-haven-spring-2026.pdf"],
              ["Summer/Fall 2025", "/newsletters/safe-haven-summer-fall-2025.pdf"],
              ["Spring/Summer 2025", "/newsletters/safe-haven-spring-summer-2025.pdf"],
            ].map(([title, href]) => (
              <a
                key={title}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center justify-between gap-6 py-5"
              >
                <span className="font-semibold text-lg group-hover:text-primary transition-colors">
                  {title}
                </span>
                <span className="inline-flex items-center gap-2 text-sm font-semibold text-primary">
                  Read Newsletter
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </span>
              </a>
            ))}
          </div>
        </div>
      </section>

    </div>
  )
}
