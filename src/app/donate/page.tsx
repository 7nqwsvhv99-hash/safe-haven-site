import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { DonationForm } from "@/components/donation-form"
import { DollarSign, Heart, Repeat, Gift, ShoppingBag } from "lucide-react"

export default function DonatePage() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="hero-gradient">
        <div className="container-custom section-padding">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
              Turn Abandoned Pets Into Loved Family Members
            </h1>
            <p className="text-lg text-muted-foreground">
              Your support provides food, medical care, and second chances for animals in need across Jo Daviess County.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg">
                <Link href="#donate">Make a Gift</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="#monthly">Give Monthly</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Impact Section */}
      <section className="section-padding bg-white">
        <div className="container-custom max-w-4xl">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            Your Impact
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {impactLevels.map((level) => (
              <Card key={level.amount} className="p-6 space-y-4 hover:shadow-lg transition-shadow">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                    ${level.amount}
                  </div>
                  <h3 className="font-bold text-lg">{level.title}</h3>
                </div>
                <p className="text-sm text-muted-foreground">{level.description}</p>
                <ul className="space-y-1 text-sm">
                  {level.impact.map((item) => (
                    <li key={item} className="flex gap-2 text-muted-foreground">
                      <span>•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Monthly Giving */}
      <section id="monthly" className="section-padding bg-slate-50">
        <div className="container-custom max-w-3xl">
          <div className="text-center mb-12">
            <Repeat className="h-16 w-16 text-primary mx-auto mb-4" />
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Become a Monthly Hero
            </h2>
            <p className="text-lg text-muted-foreground">
              Monthly donors provide stable, predictable funding that helps us plan and save more lives. It's the most powerful way to give.
            </p>
          </div>
          <Card className="p-8 space-y-6">
            <h3 className="font-bold text-xl text-center">Monthly Donor Benefits</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex gap-3">
                <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <div className="h-2 w-2 rounded-full bg-primary" />
                </div>
                <span className="text-sm">Exclusive email updates from our director</span>
              </div>
              <div className="flex gap-3">
                <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <div className="h-2 w-2 rounded-full bg-primary" />
                </div>
                <span className="text-sm">Monthly impact reports</span>
              </div>
              <div className="flex gap-3">
                <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <div className="h-2 w-2 rounded-full bg-primary" />
                </div>
                <span className="text-sm">Recognition on our donor wall</span>
              </div>
              <div className="flex gap-3">
                <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <div className="h-2 w-2 rounded-full bg-primary" />
                </div>
                <span className="text-sm">Invite to annual appreciation event</span>
              </div>
            </div>
            <div className="text-center pt-4">
              <Button size="lg">
                Start Monthly Giving
              </Button>
            </div>
          </Card>
        </div>
      </section>

      {/* Other Ways to Give */}
      <section className="section-padding bg-white">
        <div className="container-custom">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            Other Ways to Support
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            <Card className="p-6 text-center space-y-4">
              <div className="flex justify-center">
                <Heart className="h-12 w-12 text-primary" />
              </div>
              <h3 className="font-bold text-xl">Sponsor a Pet</h3>
              <p className="text-sm text-muted-foreground">
                Cover the care costs for a specific animal until they find their home. Get updates on your sponsored pet!
              </p>
              <Button variant="outline" className="w-full">
                View Pets Needing Sponsors
              </Button>
            </Card>
            <Card className="p-6 text-center space-y-4">
              <div className="flex justify-center">
                <ShoppingBag className="h-12 w-12 text-primary" />
              </div>
              <h3 className="font-bold text-xl">Wishlist Items</h3>
              <p className="text-sm text-muted-foreground">
                Donate supplies we need most: food, toys, bedding, cleaning supplies, and more.
              </p>
              <Button variant="outline" className="w-full">
                See Our Wishlist
              </Button>
            </Card>
            <Card className="p-6 text-center space-y-4">
              <div className="flex justify-center">
                <Gift className="h-12 w-12 text-primary" />
              </div>
              <h3 className="font-bold text-xl">Honor & Memorial Gifts</h3>
              <p className="text-sm text-muted-foreground">
                Make a gift in honor or memory of a loved one or beloved pet. We'll send a card to notify them.
              </p>
              <Button variant="outline" className="w-full">
                Make a Tribute Gift
              </Button>
            </Card>
          </div>
        </div>
      </section>

      {/* Success Story */}
      <section className="section-padding bg-slate-50">
        <div className="container-custom max-w-3xl">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            Where Your Donation Goes
          </h2>
          <Card className="p-8 space-y-4">
            <h3 className="font-bold text-xl">Max's Story</h3>
            <div className="aspect-video bg-slate-200 rounded-lg overflow-hidden">
              <img
                src="https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=800&h=600&fit=crop"
                alt="Max"
                className="w-full h-full object-cover"
              />
            </div>
            <p className="text-muted-foreground">
              Max arrived at Safe Haven malnourished and scared after being found as a stray. Thanks to donors like you, we were able to provide him with:
            </p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex gap-2">
                <strong className="text-foreground">$180</strong> - Medical exam, vaccines, and flea treatment
              </li>
              <li className="flex gap-2">
                <strong className="text-foreground">$95</strong> - Neuter surgery
              </li>
              <li className="flex gap-2">
                <strong className="text-foreground">$120</strong> - Food and supplies during his 6-week stay
              </li>
            </ul>
            <p className="text-muted-foreground">
              Today, Max is thriving in his forever home with a loving family. Your donations make stories like Max's possible every single day.
            </p>
          </Card>
        </div>
      </section>

      {/* Donate Form */}
      <section id="donate" className="section-padding bg-primary/5">
        <div className="container-custom max-w-2xl">
          <div className="text-center mb-8">
            <DollarSign className="h-16 w-16 text-primary mx-auto mb-6" />
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Make Your Gift Today
            </h2>
            <p className="text-lg text-muted-foreground">
              Every dollar goes directly to caring for animals in need. Safe Haven is a 501(c)(3) nonprofit. Your donation is tax-deductible.
            </p>
          </div>

          <Card className="p-6 md:p-8">
            <DonationForm />
          </Card>

          <div className="mt-8 bg-white rounded-xl p-6 space-y-3">
            <h3 className="font-semibold text-center mb-3">Other Ways to Donate</h3>
            <p className="text-sm text-muted-foreground">
              <strong>By Mail:</strong> Safe Haven Animal Rescue, 123 Main St, Elizabeth, IL 61028
            </p>
            <p className="text-sm text-muted-foreground">
              <strong>By Phone:</strong> Call us at (815) 858-2265 to make a donation
            </p>
            <p className="text-sm text-muted-foreground">
              <strong>Employer Matching:</strong> Check if your employer matches charitable gifts
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}

const impactLevels = [
  {
    amount: 25,
    title: "Feed a Friend",
    description: "Provides food and basic supplies for one pet for a week",
    impact: [
      "Premium pet food",
      "Treats for training",
      "Basic supplies",
    ],
  },
  {
    amount: 50,
    title: "Vaccine a Pet",
    description: "Covers complete vaccination series for a puppy or kitten",
    impact: [
      "Core vaccines",
      "Deworming",
      "Flea/tick prevention",
    ],
  },
  {
    amount: 100,
    title: "Spay or Neuter",
    description: "Funds a spay/neuter surgery to prevent overpopulation",
    impact: [
      "Surgery and anesthesia",
      "Pain medication",
      "Post-op care",
    ],
  },
  {
    amount: 250,
    title: "Emergency Care",
    description: "Covers urgent vet care for a sick or injured animal",
    impact: [
      "Emergency exam",
      "Diagnostic tests",
      "Treatment and medication",
    ],
  },
]
