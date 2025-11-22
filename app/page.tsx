import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Heart, Search, FileCheck, Home as HomeIcon, Users, DollarSign, Syringe, TrendingUp, Instagram, Facebook } from "lucide-react"

export default function HomePage() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="hero-gradient">
        <div className="container-custom section-padding">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-balance">
              Find Your New Best Friend This Week
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground text-balance">
              Safe Haven connects pets and people in Jo Daviess County. Adopt, foster, or support low-cost vet care.
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
                Check out available dogs, cats, and other animals
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredPets.map((pet) => (
              <Card key={pet.name} className="overflow-hidden group">
                <div className="aspect-square overflow-hidden bg-slate-200">
                  <img
                    src={pet.image}
                    alt={pet.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <CardContent className="p-5 space-y-3">
                  <div>
                    <h3 className="font-bold text-xl">{pet.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {pet.age} • {pet.gender}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {pet.traits.map((trait) => (
                      <Badge key={trait} variant="default">
                        {trait}
                      </Badge>
                    ))}
                  </div>
                  <Button asChild className="w-full">
                    <Link href={`/adopt#${pet.name.toLowerCase()}`}>
                      Meet {pet.name}
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="text-center mt-10">
            <Button asChild size="lg" variant="outline">
              <Link href="/adopt">View All Adoptable Pets</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Impact Metrics */}
      <section className="section-padding bg-primary/5">
        <div className="container-custom">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            Our Impact This Year
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center space-y-2">
              <div className="flex justify-center">
                <TrendingUp className="h-12 w-12 text-primary" />
              </div>
              <div className="text-4xl md:text-5xl font-bold text-primary">247</div>
              <p className="text-muted-foreground font-medium">Pets Adopted</p>
            </div>
            <div className="text-center space-y-2">
              <div className="flex justify-center">
                <Syringe className="h-12 w-12 text-primary" />
              </div>
              <div className="text-4xl md:text-5xl font-bold text-primary">412</div>
              <p className="text-muted-foreground font-medium">Spay & Neuter Surgeries</p>
            </div>
            <div className="text-center space-y-2">
              <div className="flex justify-center">
                <Users className="h-12 w-12 text-primary" />
              </div>
              <div className="text-4xl md:text-5xl font-bold text-primary">189</div>
              <p className="text-muted-foreground font-medium">Families Helped</p>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="section-padding bg-white">
        <div className="container-custom">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            Happy Tails
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="p-6">
                <div className="space-y-4">
                  <div className="flex gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Heart key={i} className="h-4 w-4 fill-primary text-primary" />
                    ))}
                  </div>
                  <p className="text-sm italic">{testimonial.quote}</p>
                  <p className="text-sm font-semibold">— {testimonial.author}</p>
                </div>
              </Card>
            ))}
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

      {/* Follow Us */}
      <section className="section-padding bg-primary/5">
        <div className="container-custom">
          <div className="max-w-2xl mx-auto text-center space-y-6">
            <h2 className="text-3xl md:text-4xl font-bold">
              Follow Our Journey
            </h2>
            <p className="text-muted-foreground text-lg">
              Get behind-the-scenes content, adoption spotlights, and daily doses of cuteness.
            </p>
            <div className="flex gap-4 justify-center pt-4">
              <a
                href="https://tiktok.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-6 py-3 rounded-full bg-white border-2 border-primary text-primary font-semibold hover:bg-primary hover:text-white transition-colors"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                </svg>
                TikTok
              </a>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-6 py-3 rounded-full bg-white border-2 border-primary text-primary font-semibold hover:bg-primary hover:text-white transition-colors"
              >
                <Instagram className="h-5 w-5" />
                Instagram
              </a>
              <a
                href="https://facebook.com"
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

const featuredPets = [
  {
    name: "Luna",
    age: "2 years",
    gender: "Female",
    image: "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=800&h=800&fit=crop",
    traits: ["Playful", "Good with kids", "House trained"],
  },
  {
    name: "Max",
    age: "3 years",
    gender: "Male",
    image: "https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=800&h=800&fit=crop",
    traits: ["Friendly", "Loves walks", "Loyal"],
  },
  {
    name: "Whiskers",
    age: "1 year",
    gender: "Male",
    image: "https://images.unsplash.com/photo-1574158622682-e40e69881006?w=800&h=800&fit=crop",
    traits: ["Cuddly", "Quiet", "Independent"],
  },
  {
    name: "Bella",
    age: "4 years",
    gender: "Female",
    image: "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=800&h=800&fit=crop",
    traits: ["Gentle", "Good with pets", "Calm"],
  },
  {
    name: "Charlie",
    age: "6 months",
    gender: "Male",
    image: "https://images.unsplash.com/photo-1477884213360-7e9d7dcc1e48?w=800&h=800&fit=crop",
    traits: ["Energetic", "Playful", "Learning fast"],
  },
  {
    name: "Mittens",
    age: "3 years",
    gender: "Female",
    image: "https://images.unsplash.com/photo-1513360371669-4adf3dd7dff8?w=800&h=800&fit=crop",
    traits: ["Sweet", "Lap cat", "Purrs a lot"],
  },
]

const testimonials = [
  {
    quote: "We adopted Max three months ago and he's brought so much joy to our family. The team at Safe Haven made the process so easy!",
    author: "Sarah M.",
  },
  {
    quote: "Fostering through Safe Haven has been the most rewarding experience. They provide everything you need and the support is amazing.",
    author: "Jake T.",
  },
  {
    quote: "The low-cost spay and neuter program helped us when we needed it most. So grateful for this community resource.",
    author: "Maria L.",
  },
]
