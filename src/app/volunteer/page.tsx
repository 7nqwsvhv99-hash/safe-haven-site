import { clinicVolunteerRoles } from "@/lib/clinic-volunteer-roles"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Camera,
  Cat,
  ClipboardList,
  Dog,
  Hammer,
  Heart,
  Leaf,
  PackageOpen,
  Truck,
  Users,
} from "lucide-react"

export default function VolunteerPage() {
  return (
    <div className="flex flex-col">
      <section className="hero-gradient">
        <div className="container-custom section-padding">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
              Volunteer With Us
            </h1>
            <p className="text-lg text-muted-foreground md:whitespace-nowrap">
              Make a real difference in the lives of animals. Find a volunteer role that fits your skills and schedule.
            </p>
            <Button asChild size="lg">
              <Link href="/volunteer-application">Complete the Volunteer Application</Link>
            </Button>
          </div>
        </div>
      </section>

      <section id="roles" className="section-padding bg-white">
        <div className="container-custom">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
            Volunteer Opportunities
          </h2>
          <p className="text-center text-muted-foreground mx-auto mb-12 md:whitespace-nowrap">
            Explore hands-on animal care, events, transportation, creative work, and behind-the-scenes support.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {volunteerRoles.map((role) => (
              <Link
                key={role.title}
                href="/volunteer-application"
                aria-label={`Apply to volunteer: ${role.title}`}
                className="block h-full rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                <Card className="volunteer-role-glow-card relative p-6 space-y-4 h-full cursor-pointer transition-transform duration-200 hover:-translate-y-1">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      {role.icon}
                    </div>
                    <h3 className="font-bold text-lg">{role.title}</h3>
                  </div>
                  <p className="text-sm leading-relaxed text-muted-foreground">{role.description}</p>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="section-padding bg-slate-50">
        <div className="container-custom max-w-4xl">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            How to Get Started
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map((step, index) => (
              <div key={step.title} className="text-center md:text-left">
                <div className="h-10 w-10 rounded-full bg-primary text-white flex items-center justify-center font-bold mx-auto md:mx-0">
                  {index + 1}
                </div>
                <h3 className="font-bold text-lg mt-4 mb-2">{step.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section-padding bg-white">
        <div className="container-custom max-w-3xl">
            <Card className="p-8 md:p-10 text-center bg-primary/5 border-primary/20">
              <p className="mb-3 text-sm font-bold uppercase tracking-widest text-primary">
                Future volunteers
              </p>
              <h2 className="text-3xl font-bold">
                Ready to Make a Difference?
              </h2>
              <p className="mt-4 text-muted-foreground">
                Tell us where you would like to help and when you are available.
              </p>
              <div className="mt-8">
                <Button asChild size="lg">
                  <Link href="/volunteer-application">Complete the Volunteer Application</Link>
                </Button>
              </div>
            </Card>
        </div>
      </section>
    </div>
  )
}

const volunteerRoles = [
  {
    title: "Dog Socializing & Exercise",
    icon: <Dog className="h-5 w-5 text-primary" />,
    description:
      "Walk, play with, socialize, and provide enrichment for dogs while they wait for their new homes.",
  },
  {
    title: "Cat Socializing & Enrichment",
    icon: <Cat className="h-5 w-5 text-primary" />,
    description:
      "Spend time with cats and provide play, attention, socialization, and enrichment while they wait for adoption.",
  },
  {
    title: "Events & Fundraising",
    icon: <Heart className="h-5 w-5 text-primary" />,
    description:
      "Represent Safe Haven at adoption and community events, help with fundraisers, donor outreach, or organize an event that supports our work.",
  },
  ...clinicVolunteerRoles.map(role => ({...role, icon: <Heart className="h-5 w-5 text-primary" />})),
  {
    title: "Transportation",
    icon: <Truck className="h-5 w-5 text-primary" />,
    description:
      "Drive animals to veterinary appointments, foster homes, adoption events, or other approved destinations.",
  },
  {
    title: "Pet Food Pantry",
    icon: <PackageOpen className="h-5 w-5 text-primary" />,
    description:
      "Help organize, prepare, and distribute pet food and supplies for community members.",
  },
  {
    title: "Photography & Social Media",
    icon: <Camera className="h-5 w-5 text-primary" />,
    description:
      "Take photos, create content, write animal stories and bios, and contribute to Safe Haven's social media presence.",
  },
  {
    title: "Gardening & Grounds",
    icon: <Leaf className="h-5 w-5 text-primary" />,
    description:
      "Help maintain welcoming outdoor areas through gardening, seasonal cleanup, and grounds care.",
  },
  {
    title: "Building Maintenance",
    icon: <Hammer className="h-5 w-5 text-primary" />,
    description:
      "Support light maintenance and improvement projects that keep Safe Haven safe and welcoming.",
  },
  {
    title: "Administrative Support",
    icon: <ClipboardList className="h-5 w-5 text-primary" />,
    description:
      "Help with applications, data entry, phone calls, and other behind-the-scenes tasks.",
  },
]

const steps = [
  {
    title: "Complete the Volunteer Application",
    description:
      "Tell us about yourself, your interests, experience, and availability.",
  },
  {
    title: "Connect With Safe Haven",
    description:
      "Our team will review your application and contact you about the next steps.",
  },
  {
    title: "Start Volunteering",
    description:
      "Choose opportunities that match your interests, availability, and Safe Haven's current needs.",
  },
]
