import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Calendar,
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

const volunteerCalendarUrl =
  "https://www.calendarwiz.com/calendars/calendar.php?crd=safehavenil&nolog=0&cid[]=all"

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
              <Card key={role.title} className="volunteer-role-glow-card relative p-6 space-y-4 h-full">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    {role.icon}
                  </div>
                  <h3 className="font-bold text-lg">{role.title}</h3>
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">{role.description}</p>
              </Card>
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
        <div className="container-custom max-w-6xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-8 md:p-10 text-center h-full">
              <p className="mb-3 text-sm font-bold uppercase tracking-widest text-primary">
                Current volunteers
              </p>
              <h2 className="text-3xl font-bold tracking-tight lg:text-[2rem] lg:whitespace-nowrap">
                Already Volunteering With Safe Haven?
              </h2>
              <p className="mt-4 text-muted-foreground">
                View upcoming volunteer coverage or log the hours you have completed.
              </p>
              <div className="mt-8 flex flex-col gap-3">
                <Button asChild variant="outline" size="lg">
                  <a href={volunteerCalendarUrl} target="_blank" rel="noreferrer">
                    View Volunteer Calendar
                  </a>
                </Button>
                <Button asChild size="lg">
                  <Link href="/volunteer-hours">Log Volunteer Hours</Link>
                </Button>
              </div>
            </Card>

            <Card className="p-8 md:p-10 text-center h-full bg-primary/5 border-primary/20">
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
                <Button asChild size="lg" className="w-full">
                  <Link href="/volunteer-application">Complete the Volunteer Application</Link>
                </Button>
              </div>
            </Card>
          </div>
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
