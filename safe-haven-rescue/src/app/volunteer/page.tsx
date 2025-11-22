import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Heart, Camera, Truck, Users, Dog, Calendar } from "lucide-react"

export default function VolunteerPage() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="hero-gradient">
        <div className="container-custom section-padding">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
              Volunteer With Us
            </h1>
            <p className="text-lg text-muted-foreground">
              Make a real difference in the lives of animals. Find a volunteer role that fits your skills and schedule.
            </p>
            <Button asChild size="lg">
              <Link href="#roles">See Volunteer Roles</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Why Volunteer */}
      <section className="section-padding bg-white">
        <div className="container-custom max-w-4xl">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-6">
            Why Volunteer at Safe Haven?
          </h2>
          <p className="text-center text-muted-foreground mb-12 text-lg">
            Our volunteers are the heart of everything we do. You'll gain hands-on experience, meet amazing people, and directly impact animal welfare in our community.
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
                Choose shifts that work with your life and commitments
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Volunteer Roles */}
      <section id="roles" className="section-padding bg-slate-50">
        <div className="container-custom">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            Volunteer Roles
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {volunteerRoles.map((role) => (
              <Card key={role.title} className="p-6 space-y-4 hover:shadow-lg transition-shadow">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    {role.icon}
                  </div>
                  <h3 className="font-bold text-lg">{role.title}</h3>
                </div>
                <p className="text-sm text-muted-foreground">{role.description}</p>
                <div className="pt-2">
                  <p className="text-xs text-muted-foreground">
                    <strong>Time commitment:</strong> {role.time}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Requirements */}
      <section className="section-padding bg-white">
        <div className="container-custom max-w-3xl">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            Volunteer Requirements
          </h2>
          <div className="space-y-4">
            <Card className="p-6">
              <h3 className="font-semibold mb-3">Age Requirements</h3>
              <p className="text-sm text-muted-foreground">
                Volunteers must be at least 16 years old. Ages 16-17 require a parent or guardian present during shifts.
              </p>
            </Card>
            <Card className="p-6">
              <h3 className="font-semibold mb-3">Orientation & Training</h3>
              <p className="text-sm text-muted-foreground">
                All volunteers attend a 2-hour orientation covering safety, animal handling, and shelter procedures. Role-specific training is provided.
              </p>
            </Card>
            <Card className="p-6">
              <h3 className="font-semibold mb-3">Commitment</h3>
              <p className="text-sm text-muted-foreground">
                We ask for a minimum commitment of one 3-hour shift per week for at least 3 months. This helps animals build trust and routine.
              </p>
            </Card>
            <Card className="p-6">
              <h3 className="font-semibold mb-3">Background Check</h3>
              <p className="text-sm text-muted-foreground">
                For safety, all volunteers undergo a basic background check. This is standard for organizations working with vulnerable populations.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* How to Get Started */}
      <section className="section-padding bg-slate-50">
        <div className="container-custom max-w-4xl">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            How to Get Started
          </h2>
          <div className="space-y-8">
            <div className="flex gap-4">
              <div className="h-10 w-10 rounded-full bg-primary text-white flex items-center justify-center font-bold flex-shrink-0">
                1
              </div>
              <div>
                <h3 className="font-bold text-lg mb-2">Fill Out Interest Form</h3>
                <p className="text-muted-foreground">
                  Tell us about yourself, your interests, and your availability. Takes about 5 minutes.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="h-10 w-10 rounded-full bg-primary text-white flex items-center justify-center font-bold flex-shrink-0">
                2
              </div>
              <div>
                <h3 className="font-bold text-lg mb-2">Attend Orientation</h3>
                <p className="text-muted-foreground">
                  Join us for a volunteer orientation. We hold them monthly on the first Saturday from 10am-12pm.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="h-10 w-10 rounded-full bg-primary text-white flex items-center justify-center font-bold flex-shrink-0">
                3
              </div>
              <div>
                <h3 className="font-bold text-lg mb-2">Start Volunteering!</h3>
                <p className="text-muted-foreground">
                  Choose your shifts and dive in. We'll pair you with an experienced volunteer for your first few times.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section-padding bg-primary/5">
        <div className="container-custom max-w-2xl text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to Make a Difference?
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Join our team of dedicated volunteers and start changing lives today.
          </p>
          <Button size="lg">
            Submit Volunteer Interest Form
          </Button>
          <p className="text-sm text-muted-foreground mt-4">
            Questions? Email us at volunteer@safehavenforpets.org
          </p>
        </div>
      </section>
    </div>
  )
}

const volunteerRoles = [
  {
    title: "Shelter Care",
    icon: <Dog className="h-5 w-5 text-primary" />,
    description: "Help with daily animal care: feeding, cleaning, socializing, and walking dogs. Perfect for hands-on animal lovers.",
    time: "3-4 hours/week",
  },
  {
    title: "Adoption Events",
    icon: <Calendar className="h-5 w-5 text-primary" />,
    description: "Represent Safe Haven at weekend adoption events. Share pet stories and help families find their match.",
    time: "4 hours/month",
  },
  {
    title: "Social Media & Content",
    icon: <Camera className="h-5 w-5 text-primary" />,
    description: "Love animals and TikTok? Create content, take photos, write bios, and manage our social presence.",
    time: "Flexible, remote",
  },
  {
    title: "Transport",
    icon: <Truck className="h-5 w-5 text-primary" />,
    description: "Drive animals to vet appointments, foster homes, or adoption events. Must have reliable vehicle.",
    time: "As needed",
  },
  {
    title: "Administrative Support",
    icon: <Users className="h-5 w-5 text-primary" />,
    description: "Help with applications, data entry, phone calls, and office tasks. Work from home or at the shelter.",
    time: "Flexible",
  },
  {
    title: "Fundraising & Events",
    icon: <Heart className="h-5 w-5 text-primary" />,
    description: "Plan fundraisers, donor outreach, and community events. Great for organized, creative people.",
    time: "Flexible",
  },
]
