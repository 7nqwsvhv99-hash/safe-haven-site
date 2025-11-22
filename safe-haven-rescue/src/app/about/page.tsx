import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { MapPin, Clock, Phone, Mail, Heart, Shield, Users, Sparkles } from "lucide-react"

export default function AboutPage() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="hero-gradient">
        <div className="container-custom section-padding">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
              About Safe Haven
            </h1>
            <p className="text-lg text-muted-foreground">
              Since 1994, we've been connecting pets and people in Jo Daviess County. Learn our story and meet the team making it happen.
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
              Safe Haven Animal Rescue was founded in 1994 by a small group of volunteers who saw a need for compassionate animal welfare services in Jo Daviess County. What started as a handful of foster homes has grown into a full-service shelter and clinic serving thousands of animals each year.
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
              <div className="flex justify-center">
                <Heart className="h-12 w-12 text-primary" />
              </div>
              <h3 className="font-bold text-lg">Compassion</h3>
              <p className="text-sm text-muted-foreground">
                We treat every animal with kindness and respect, no matter their background.
              </p>
            </Card>
            <Card className="p-6 text-center space-y-4">
              <div className="flex justify-center">
                <Shield className="h-12 w-12 text-primary" />
              </div>
              <h3 className="font-bold text-lg">Transparency</h3>
              <p className="text-sm text-muted-foreground">
                We're open about our work, finances, and challenges. Honesty builds trust.
              </p>
            </Card>
            <Card className="p-6 text-center space-y-4">
              <div className="flex justify-center">
                <Users className="h-12 w-12 text-primary" />
              </div>
              <h3 className="font-bold text-lg">Community</h3>
              <p className="text-sm text-muted-foreground">
                We're a hub for animal lovers, working together to create change.
              </p>
            </Card>
            <Card className="p-6 text-center space-y-4">
              <div className="flex justify-center">
                <Sparkles className="h-12 w-12 text-primary" />
              </div>
              <h3 className="font-bold text-lg">Hope</h3>
              <p className="text-sm text-muted-foreground">
                Every animal can have a better tomorrow. We believe in second chances.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Meet the Team */}
      <section className="section-padding bg-white">
        <div className="container-custom">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            Meet Our Team
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {teamMembers.map((member) => (
              <div key={member.name} className="text-center space-y-3">
                <div className="aspect-square rounded-full overflow-hidden bg-slate-200 max-w-xs mx-auto">
                  <img
                    src={member.image}
                    alt={member.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <h3 className="font-bold text-lg">{member.name}</h3>
                  <p className="text-primary text-sm font-medium">{member.role}</p>
                  <p className="text-sm text-muted-foreground mt-2">{member.bio}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Visit Us */}
      <section className="section-padding bg-slate-50">
        <div className="container-custom">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            Visit Safe Haven
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <Card className="p-6 space-y-4">
              <h3 className="font-bold text-xl">Location & Hours</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">Address</p>
                    <p className="text-sm text-muted-foreground">
                      123 Main Street<br />
                      Elizabeth, IL 61028
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Clock className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">Hours</p>
                    <p className="text-sm text-muted-foreground">
                      Monday - Friday: 10am - 5pm<br />
                      Saturday: 10am - 4pm<br />
                      Sunday: Closed
                    </p>
                  </div>
                </div>
              </div>
            </Card>
            <Card className="p-6 space-y-4">
              <h3 className="font-bold text-xl">Contact Information</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Phone className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">Phone</p>
                    <a href="tel:815-858-2265" className="text-sm text-muted-foreground hover:text-primary">
                      (815) 858-2265
                    </a>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Mail className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">Email</p>
                    <a href="mailto:info@safehavenforpets.org" className="text-sm text-muted-foreground hover:text-primary">
                      info@safehavenforpets.org
                    </a>
                  </div>
                </div>
              </div>
              <div className="pt-2">
                <Button asChild className="w-full">
                  <a href="https://maps.google.com" target="_blank" rel="noopener noreferrer">
                    Get Directions
                  </a>
                </Button>
              </div>
            </Card>
          </div>
          <div className="mt-8 rounded-2xl overflow-hidden bg-slate-200 h-96 max-w-4xl mx-auto">
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2975.123456789!2d-90.2262!3d42.3168!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zNDLCsDE5JzAwLjUiTiA5MMKwMTMnMzQuMyJX!5e0!3m2!1sen!2sus!4v1234567890"
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              title="Safe Haven Location Map"
            />
          </div>
        </div>
      </section>

      {/* Get Involved CTA */}
      <section className="section-padding bg-white">
        <div className="container-custom max-w-2xl text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Join Our Community
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Whether you adopt, foster, volunteer, or donate, you're part of our mission to save lives and build families.
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

const teamMembers = [
  {
    name: "Sarah Johnson",
    role: "Executive Director",
    image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop",
    bio: "Sarah has dedicated 15 years to animal welfare and leads our team with compassion and vision.",
  },
  {
    name: "Mike Rodriguez",
    role: "Shelter Manager",
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop",
    bio: "Mike ensures our shelter runs smoothly and our animals receive the best care possible.",
  },
  {
    name: "Emily Chen",
    role: "Veterinary Technician",
    image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop",
    bio: "Emily brings her expertise and gentle touch to every animal that comes through our doors.",
  },
]
