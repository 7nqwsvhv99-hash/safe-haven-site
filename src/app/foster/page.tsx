import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Heart, Home, PawPrint, HelpCircle } from "lucide-react"

export default function FosterPage() {
  return (
    <div className="flex flex-col">
      <section className="hero-gradient">
        <div className="container-custom section-padding">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">Become a Foster Home</h1>
            <p className="text-lg text-muted-foreground">
              Give a cat or dog a safe, temporary home while they wait for the right permanent family. Foster families expand Safe Haven's ability to care for more animals in our community.
            </p>
            <Button asChild size="lg"><a href="#apply">Learn About Fostering</a></Button>
          </div>
        </div>
      </section>

      <section className="section-padding bg-white">
        <div className="container-custom">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Why Foster?</h2>
            <p className="text-lg text-muted-foreground">
              Foster care gives animals time to adjust, build confidence, and show us who they are outside the shelter environment.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            <Card className="p-6 text-center space-y-4">
              <div className="flex justify-center"><Heart className="h-12 w-12 text-primary" /></div>
              <h3 className="font-bold text-xl">Expand Safe Haven's Capacity</h3>
              <p className="text-muted-foreground">Every foster home creates more room for Safe Haven to help another animal in need.</p>
            </Card>
            <Card className="p-6 text-center space-y-4">
              <div className="flex justify-center"><Home className="h-12 w-12 text-primary" /></div>
              <h3 className="font-bold text-xl">Help an Animal Thrive</h3>
              <p className="text-muted-foreground">Home life can provide routine, socialization, and valuable insight into an animal's personality and needs.</p>
            </Card>
            <Card className="p-6 text-center space-y-4">
              <div className="flex justify-center"><PawPrint className="h-12 w-12 text-primary" /></div>
              <h3 className="font-bold text-xl">Support the Right Match</h3>
              <p className="text-muted-foreground">What you learn about your foster can help Safe Haven find a permanent home that fits the animal well.</p>
            </Card>
          </div>
        </div>
      </section>

      <section className="section-padding bg-slate-50">
        <div className="container-custom max-w-5xl">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">What Foster Families Do</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {responsibilities.map((item) => (
              <div key={item.title} className="rounded-2xl border bg-white p-6">
                <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section-padding bg-white">
        <div className="container-custom">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">What to Expect</h2>
            <p className="text-muted-foreground">We want foster families to understand the commitment before accepting a placement and to have the practical support needed to care for the animal.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="p-6 space-y-3">
              <h3 className="font-bold text-xl">Food &amp; Supplies Provided</h3>
              <p className="text-muted-foreground">Safe Haven provides the food and supplies needed for foster care.</p>
            </Card>
            <Card className="p-6 space-y-3">
              <h3 className="font-bold text-xl">Veterinary Care Covered</h3>
              <p className="text-muted-foreground">Safe Haven covers veterinary expenses for foster animals.</p>
            </Card>
            <Card className="p-6 space-y-3">
              <h3 className="font-bold text-xl">Expectations Discussed Up Front</h3>
              <p className="text-muted-foreground">Some placements are short and others last several weeks or longer. We will discuss the animal's needs and expected commitment before placement.</p>
            </Card>
          </div>
        </div>
      </section>

      <section className="section-padding bg-slate-50">
        <div className="container-custom max-w-4xl">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">Is Fostering Right for You?</h2>
          <div className="space-y-5">
            {fitItems.map((item) => (
              <div key={item.title} className="flex items-start gap-3">
                <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5"><div className="h-2 w-2 rounded-full bg-primary" /></div>
                <div><h3 className="font-semibold mb-1">{item.title}</h3><p className="text-sm text-muted-foreground">{item.description}</p></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section-padding bg-white">
        <div className="container-custom max-w-4xl">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {steps.map((step, index) => (
              <div key={step.title} className="space-y-3">
                <div className="h-10 w-10 rounded-full bg-primary text-white flex items-center justify-center font-bold">{index + 1}</div>
                <h3 className="font-bold text-lg">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section-padding bg-slate-50">
        <div className="container-custom max-w-3xl">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">Common Questions</h2>
          <div className="space-y-6">
            {faqs.map((faq) => (
              <Card key={faq.question} className="p-6">
                <div className="flex gap-3">
                  <HelpCircle className="h-5 w-5 text-primary flex-shrink-0 mt-1" />
                  <div className="space-y-2"><h3 className="font-semibold">{faq.question}</h3><p className="text-sm text-muted-foreground">{faq.answer}</p></div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section id="apply" className="section-padding bg-primary/5">
        <div className="container-custom max-w-2xl text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Foster?</h2>
          <p className="text-lg text-muted-foreground mb-3">We are building one streamlined foster application for cats and dogs, with species-specific questions shown only when they apply.</p>
          <p className="text-sm text-muted-foreground mb-8">Until that application is connected here, contact Safe Haven to get started.</p>
          <p className="font-semibold">(815) 858-2265</p>
        </div>
      </section>
    </div>
  )
}

const responsibilities = [
  { title: "Provide daily care", description: "Give your foster animal a safe environment, food, water, affection, exercise or play, and age-appropriate care." },
  { title: "Observe and share what you learn", description: "Help Safe Haven understand the animal's personality, habits, comfort level, and the kind of home where they may thrive." },
  { title: "Follow the care plan", description: "Follow the instructions provided for the individual animal and stay in communication with Safe Haven about concerns or changes." },
  { title: "Help with the path to adoption", description: "Share updates and work with Safe Haven when a potential adopter may be a good match." },
]

const fitItems = [
  { title: "You have a safe, pet-friendly home", description: "We will ask about your household, current pets, housing situation, and any space or yard considerations so we can make an appropriate match." },
  { title: "You can provide consistent daily care", description: "Foster animals need routine, attention, feeding, exercise or play, and time to adjust to a new environment." },
  { title: "You are comfortable communicating with Safe Haven", description: "Fosters may be asked to share progress and report concerns so we know how the animal is doing at home." },
  { title: "You are open to being matched thoughtfully", description: "The foster application helps Safe Haven understand your experience, household, preferences, and the types of animals you are comfortable caring for." },
]

const steps = [
  { title: "Apply", description: "Tell us about your household, experience, schedule, and the kinds of animals or needs you are comfortable fostering." },
  { title: "Review & Match", description: "Safe Haven reviews the application and works with you to identify a foster placement that fits your household and the animal's needs." },
  { title: "Welcome Your Foster", description: "Bring the animal into your home with the food, supplies, and care information needed for the placement." },
  { title: "Stay Connected", description: "Share updates, communicate concerns, and help Safe Haven learn what kind of permanent home may be the best fit." },
]

const faqs = [
  { question: "What does Safe Haven provide?", answer: "Safe Haven provides foster food and supplies and covers veterinary expenses for foster animals." },
  { question: "How long does fostering last?", answer: "It varies by animal and situation. Some placements are short, while others last several weeks or longer. We will discuss the expected commitment before you agree to a placement." },
  { question: "What if I rent my home?", answer: "Renters may be able to foster if their housing allows pets. The foster application asks about your housing situation so Safe Haven can confirm that a placement is appropriate." },
  { question: "What if I already have pets or children?", answer: "That does not automatically prevent you from fostering. We use information about your household and current animals to help determine which placements may be a good fit." },
  { question: "Do I need previous foster experience?", answer: "Not necessarily. The application asks about your animal experience, comfort with different needs, and preferences so Safe Haven can make an appropriate match." },
]
