import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Heart, ShoppingBag, Wallet, Mail, MapPin, Stethoscope, PackageOpen, PawPrint, Gift, Landmark, Building2, FileHeart } from "lucide-react"

const paypalBusinessEmail = "safehavenbookkeeper1471@gmail.com"

export default function DonatePage() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="hero-gradient">
        <div className="container-custom section-padding">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <p className="text-sm md:text-base font-semibold uppercase tracking-[0.18em] text-primary">
              Support Safe Haven
            </p>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
              Make a Gift. Make a Difference.
            </h1>
            <p className="text-lg text-muted-foreground">
              Your support helps Safe Haven care for animals, make spay/neuter services more accessible, and provide food and other support across our community.
            </p>
          </div>
        </div>
      </section>

      {/* Give Now */}
      <section className="section-padding bg-white">
        <div className="container-custom">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-3">Choose the Way You Want to Give</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Give online, by mail, or by sending supplies Safe Haven needs most.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
            <Card className="p-7 text-center space-y-5 border-primary/20">
              <div className="flex justify-center">
                <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                  <Wallet className="h-7 w-7 text-primary" />
                </div>
              </div>
              <div>
                <h3 className="font-bold text-xl mb-2">Give with Venmo</h3>
                <p className="text-sm text-muted-foreground">Fast, simple, and easy from your phone.</p>
              </div>
              <p className="text-xl font-bold text-primary">@safehaven1471</p>
              <Button asChild size="lg" className="w-full">
                <a href="https://venmo.com/u/safehaven1471" target="_blank" rel="noopener noreferrer">
                  Open Venmo
                </a>
              </Button>
            </Card>

            <Card className="p-7 text-center space-y-5 border-primary/20">
              <div className="flex justify-center">
                <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                  <Heart className="h-7 w-7 text-primary" />
                </div>
              </div>
              <div>
                <h3 className="font-bold text-xl mb-2">Give with PayPal</h3>
                <p className="text-sm text-muted-foreground">Choose your own amount and complete your gift securely through PayPal.</p>
              </div>
              <form action="https://www.paypal.com/cgi-bin/webscr" method="post" target="_blank">
                <input type="hidden" name="cmd" value="_donations" />
                <input type="hidden" name="business" value={paypalBusinessEmail} />
                <input type="hidden" name="item_name" value="Safe Haven Humane Society" />
                <input type="hidden" name="currency_code" value="USD" />
                <Button type="submit" size="lg" className="w-full">
                  Donate with PayPal
                </Button>
              </form>
              <p className="text-xs text-muted-foreground">You will finish your donation on PayPal.</p>
            </Card>

            <Card className="p-7 text-center space-y-5">
              <div className="flex justify-center">
                <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                  <Mail className="h-7 w-7 text-primary" />
                </div>
              </div>
              <div>
                <h3 className="font-bold text-xl mb-2">Cash or Check</h3>
                <p className="text-sm text-muted-foreground">Make checks payable to Safe Haven Humane Society.</p>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                1471 US Hwy 20 W<br />Elizabeth, IL 61028
              </p>
              <Button asChild variant="outline" size="lg" className="w-full">
                <a href="https://www.google.com/maps/search/?api=1&query=1471+US+Hwy+20+W+Elizabeth+IL+61028" target="_blank" rel="noopener noreferrer">
                  <MapPin className="h-4 w-4 mr-2" />Get Directions
                </a>
              </Button>
              <p className="text-xs text-muted-foreground">For cash donations, please call ahead for current hours.</p>
            </Card>

            <Card className="p-7 text-center space-y-5">
              <div className="flex justify-center">
                <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                  <ShoppingBag className="h-7 w-7 text-primary" />
                </div>
              </div>
              <div>
                <h3 className="font-bold text-xl mb-2">Send Needed Supplies</h3>
                <p className="text-sm text-muted-foreground">Purchase food, cleaning supplies, toys, and other items Safe Haven needs.</p>
              </div>
              <Button asChild variant="outline" size="lg" className="w-full">
                <a href="https://www.amazon.com/hz/wishlist/ls/MICZ1RISU5X1" target="_blank" rel="noopener noreferrer">
                  View Our Amazon Wishlist
                </a>
              </Button>
              <p className="text-xs text-muted-foreground">Purchase items directly from Safe Haven's current Amazon Wishlist.</p>
            </Card>
          </div>
        </div>
      </section>

      {/* Directed Giving */}
      <section className="section-padding bg-primary/5">
        <div className="container-custom max-w-5xl">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-bold mb-3">Direct Your Donation</h2>
            <p className="text-muted-foreground max-w-3xl mx-auto">
              Want your gift to support a specific part of Safe Haven's work? Add the fund name to your Venmo note, PayPal note, or check memo. Gifts without a designation can be used where they are needed most.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <Card className="p-6 text-center space-y-3">
              <Stethoscope className="h-10 w-10 text-primary mx-auto" />
              <h3 className="font-bold">Spay/Neuter Fund</h3>
              <p className="text-sm text-muted-foreground">Support surgeries and related clinic care that help prevent pet overpopulation.</p>
            </Card>
            <Card className="p-6 text-center space-y-3">
              <PackageOpen className="h-10 w-10 text-primary mx-auto" />
              <h3 className="font-bold">Food Bank</h3>
              <p className="text-sm text-muted-foreground">Help provide pet food for families, community partners, and animals in need.</p>
            </Card>
            <Card className="p-6 text-center space-y-3">
              <PawPrint className="h-10 w-10 text-primary mx-auto" />
              <h3 className="font-bold">Sponsor-A-Pet</h3>
              <p className="text-sm text-muted-foreground">Help support the care of animals waiting for their homes.</p>
            </Card>
            <Card className="p-6 text-center space-y-3">
              <Gift className="h-10 w-10 text-primary mx-auto" />
              <h3 className="font-bold">Memorial or Honor Gift</h3>
              <p className="text-sm text-muted-foreground">Give in memory or honor of a person or beloved animal.</p>
            </Card>
          </div>
        </div>
      </section>

      {/* What Your Gift Can Do */}
      <section className="section-padding bg-white">
        <div className="container-custom max-w-6xl">
          <div className="text-center mb-10">
            <Heart className="h-12 w-12 text-primary mx-auto mb-4" />
            <h2 className="text-3xl md:text-4xl font-bold mb-3">What Your Gift Can Do</h2>
            <p className="text-muted-foreground max-w-3xl mx-auto">
              Every gift helps Safe Haven provide food, shelter, medical care, spay/neuter services, and everyday supplies. These are examples of the kinds of needs donations can help support.
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              ["$10", "Everyday medical or care supplies"],
              ["$25", "Vaccines and preventive-care needs"],
              ["$50", "Microchips, testing, or medical supplies"],
              ["$100", "Diagnostic or veterinary-care support"],
              ["$250", "A meaningful contribution toward surgery or treatment"],
              ["$500+", "Help with major medical or shelter-care needs"],
            ].map(([amount, description]) => (
              <Card key={amount} className="p-5 text-center space-y-2">
                <p className="text-2xl font-bold text-primary">{amount}</p>
                <p className="text-sm text-muted-foreground">{description}</p>
              </Card>
            ))}
          </div>
          <p className="text-xs text-muted-foreground text-center mt-6 max-w-3xl mx-auto">
            Examples are illustrative. Actual costs and needs vary, and unrestricted gifts may be used where they can do the most good.
          </p>
        </div>
      </section>

      {/* More Ways to Give */}
      <section className="section-padding bg-primary/5">
        <div className="container-custom max-w-6xl">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-bold mb-3">More Ways to Give</h2>
            <p className="text-muted-foreground max-w-3xl mx-auto">
              Some gifts need a little more coordination. Safe Haven can help you get started.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="p-7 space-y-4">
              <Building2 className="h-10 w-10 text-primary" />
              <h3 className="font-bold text-xl">Employer Matching</h3>
              <p className="text-sm text-muted-foreground">
                Your employer may match charitable gifts, which can increase the impact of your donation. Check with your employer's benefits or giving program.
              </p>
            </Card>
            <Card className="p-7 space-y-4">
              <Landmark className="h-10 w-10 text-primary" />
              <h3 className="font-bold text-xl">Appreciated Securities</h3>
              <p className="text-sm text-muted-foreground">
                Gifts of appreciated securities may be an option for some donors. Contact Safe Haven before initiating a transfer, and consult your financial or tax advisor about your situation.
              </p>
            </Card>
            <Card className="p-7 space-y-4">
              <FileHeart className="h-10 w-10 text-primary" />
              <h3 className="font-bold text-xl">Planned & Estate Gifts</h3>
              <p className="text-sm text-muted-foreground">
                You may choose to include Safe Haven in a will, trust, beneficiary designation, or other estate plan. Contact us for organization information and consult your advisor for legal or tax guidance.
              </p>
            </Card>
          </div>
          <div className="text-center mt-8">
            <Button asChild variant="outline" size="lg">
              <a href="mailto:safehaven1471@gmail.com?subject=Giving%20to%20Safe%20Haven">Contact Safe Haven About Giving</a>
            </Button>
          </div>
        </div>
      </section>

      {/* Nonprofit note */}
      <section className="section-padding bg-white">
        <div className="container-custom max-w-5xl">
          <div className="rounded-2xl bg-slate-50 p-6 md:p-8 text-center">
            <p className="text-sm md:text-base text-muted-foreground">
              Safe Haven Humane Society is a 501(c)(3) nonprofit organization. Questions about giving or directing a larger gift? Call <a href="tel:815-858-2265" className="font-semibold text-primary hover:underline">(815) 858-2265</a> or email <a href="mailto:safehaven1471@gmail.com" className="font-semibold text-primary hover:underline">safehaven1471@gmail.com</a>.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
