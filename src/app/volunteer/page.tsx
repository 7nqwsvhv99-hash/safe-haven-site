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
  PackageHeart,
  Share2,
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
            <p className="text-lg text-muted-foreground space-y-1">
              <span className="block">Make a real difference in the lives of animals.</span>
              <span className="block">Find a volunteer role that fits your skills and schedule.</span>
            </p>
            <Button asChild size="lg">
              <Link href="#roles">See Volunteer Roles</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="section-padding bg-white">
        <div className="container-custom max-w-4xl">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-6">
            Why Volunteer at Safe Haven?
          </h2>
          <p className="text-center text-muted-foreground mb-12 text-lg">
            Our volunteers are the heart of everything we do. You&apos;ll gain hands-on experience, meet amazing people, and directly impact animal welfare in our community.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center space-y-2">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <Heart className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold">Make an Impact</h3>
              <p className="text-sm text-muted-foreground">
                See the direct results of your work in the lives of animals
              </p>
            </div>
            <div className="text-center space-y-2">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold">Join a Community</h3>
              <p className="text-sm text-muted-foreground">
                Connect with other animal lovers and build lasting friendships
              </p>
            </div>
            <div className="text-center space-y-2">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <Calendar className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold">Flexible Schedule</h3>
              <p className="text-sm text-muted-foreground">
                Choose opportunities that work with your life and commitments
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="roles" className="section-padding bg-slate-50">
        <div className="container-custom">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
            Volunteer Opportunities
          </h2>
          <p className="text-center text-muted-foreground max-w-2xl mx-auto mb-12">
            Explore hands-on animal care, events, transportation, creative work, and behind-the-scenes support.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {volunteerRoles.map((role) => (
              <Card key={role.title} className="p-6 space-y-4 hover:shadow-lg transition-shadow">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    {role.icon}
                  </div>
                  <h3 className="font-bold text-lg">{role.title}</h3>
                </div>
                <p className="text-sm text-muted-foreground">{role.description}</p>
                {role.time && (
                  <div className="pt-2">
                    <p className="text-xs text-muted-foreground">
                      <strong>Time commitment:</strong> {role.time}
                    </p>
                  </div>
                )}
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="section-padding bg-white">
        <div className="container-custom max-w-4xl">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            How to Get Started
          </h2>
          <div className="space-y-8">
            <div className="flex gap-4">
              <div className="h-10 w-10 rounded-full bg-primary text-white flex items-center justify-center font-bold flex-shrink-0">1</div>
              <div>
                <h3 className="font-bold text-lg mb-2">Complete the Volunteer Application</h3>
                <p className="text-muted-foreground">
                  Tell us about yourself, your interests, experience, and availability.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="h-10 w-10 rounded-full bg-primary text-white flex items-center justify-center font-bold flex-shrink-0">2</div>
              <div>
                <h3 className="font-bold text-lg mb-2">Connect With Safe Haven</h3>
                <p className="text-muted-foreground">
                  Our team will review your application and contact you about next steps.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="h-10 w-10 rounded-full bg-primary text-white flex items-center justify-center font-bold flex-shrink-0">3</div>
              <div>
                <h3 className="font-bold text-lg mb-2">Start Volunteering</h3>
                <p className="text-muted-foreground">
                  Choose opportunities that match your interests and schedule.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="calendar" className="section-padding bg-slate-50">
        <div className="container-custom">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
            Volunteer Calendar
          </h2>
          <p className="text-center text-muted-foreground max-w-2xl mx-auto mb-8">
            Current volunteers can use the calendar to view upcoming volunteer coverage and activities.
          </p>
          <Card className="overflow-hidden">
            <iframe
              src="https://www.calendarwiz.com/calendars/calendar.php?crd=safehavenil&nolog=0&cid[]=all"
              title="Safe Haven volunteer calendar"
              className="w-full h-[720px] border-0"
              loading="lazy"
            />
          </Card>
          <div className="text-center mt-6">
            <Button asChild variant="outline">
              <a
                href="https://www.calendarwiz.com/calendars/calendar.php?crd=safehavenil&nolog=0&cid[]=all"
                target="_blank"
                rel="noreferrer"
              >
                Open Calendar in a New Window
              </a>
            </Button>
          </div>
        </div>
      </section>

      <section className="section-padding bg-primary/5">
        <div className="container-custom max-w-2xl text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to Make a Difference?
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Join our team of dedicated volunteers and help animals in our community.
          </p>
          <Button asChild size="lg">
            <Link href="/volunteer-application">Complete the Volunteer Application</Link>
          </Button>
        </div>
      </section>
    </div>
  )
}

const volunteerRoles = [
  {
    title: "Shelter Care",
    icon: <Dog className="h-5 w-5 text-primary" />,
    description: "Help with animal socialization by spending time with cats and walking dogs. Perfect for hands-on animal lovers.",
    time: "2-3 hours/month",
  },
  {
    title: "Adoption & Community Events",
    icon: <Calendar className="h-5 w-5 text-primary" />,
    description: "Represent Safe Haven at adoption and community events. Share pet stories and help families find their match.",
    time: "2 hours/month",
  },
  {
    title: "Host an Event or Fundraiser",
    icon: <Heart className="h-5 w-5 text-primary" />,
    description: "Organize an event or fundraiser that supports Safe Haven and introduces our work to more people.",
    time: "Flexible",
  },
  {
    title: "Transportation",
    icon: <Truck className="h-5 w-5 text-primary" />,
    description: "Drive animals to vet appointments, foster homes, or adoption events.",
    time: "As needed",
  },
  {
    title: "Gardening & Grounds",
    icon: <Leaf className="h-5 w-5 text-primary" />,
    description: "Help maintain welcoming outdoor areas through gardening, seasonal cleanup, and grounds care.",
  },
  {
    title: "Dog Socializing & Exercise",
    icon: <Dog className="h-5 w-5 text-primary" />,
    description: "Walk, play with, and provide enrichment for dogs while they wait for their new homes.",
  },
  {
    title: "Cat Socializing & Enrichment",
    icon: <Cat className="h-5 w-5 text-primary" />,
    description: "Spend time with cats and provide play, attention, and enrichment while they wait for adoption.",
  },
  {
    title: "Pet Food Pantry",
    icon: <PackageHeart className="h-5 w-5 text-primary" />,
    description: "Help organize, prepare, and distribute pet food and supplies for community members.",
  },
  {
    title: "Building Maintenance",
    icon: <Hammer className="h-5 w-5 text-primary" />,
    description: "Support light maintenance and improvement projects that keep Safe Haven safe and welcoming.",
  },
  {
    title: "Photography",
    icon: <Camera className="h-5 w-5 text-primary" />,
    description: "Take engaging photos of adoptable animals, events, and everyday life at Safe Haven.",
    time: "Flexible",
  },
  {
    title: "Social Media & Content",
    icon: <Share2 className="h-5 w-5 text-primary" />,
    description: "Love animals and TikTok? Create content, take photos, write bios, and contribute to our social media presence.",
    time: "Flexible, remote",
  },
  {
    title: "Administrative Support",
    icon: <ClipboardList className="h-5 w-5 text-primary" />,
    description: "Help with applications, data entry, phone calls, and other behind-the-scenes tasks.",
    time: "Flexible",
  },
  {
    title: "Fundraising & Event Support",
    icon: <Users className="h-5 w-5 text-primary" />,
    description: "Help plan fundraisers, support donor outreach, and assist with Safe Haven events.",
    time: "Flexible",
  },
]
