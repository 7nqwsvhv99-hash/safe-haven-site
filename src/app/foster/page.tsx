import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Heart, Home, Clock, HelpCircle } from "lucide-react"

export default function FosterPage() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="hero-gradient">
        <div className="container-custom section-padding">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
              Become a Foster Hero
            </h1>
            <p className="text-lg text-muted-foreground">
              Fostering saves lives. Give a pet a safe, loving home while they wait for their forever family.
            </p>
            <Button asChild size="lg">
              <Link href="#apply">Apply to Foster</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* What is Fostering */}
      <section className="section-padding bg-white">
        <div className="container-custom max-w-4xl">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            What is Fostering?
          </h2>
          <div className="space-y-6 text-lg">
            <p>
              Fostering means temporarily caring for a pet in your home until they find their permanent family. You provide love, shelter, and basic care while we handle medical expenses and support you every step of the way.
            </p>
            <p>
              Foster families are crucial to our mission. They help pets recover from illness, adjust to home life, or simply wait for the right adopter. Without fosters, we couldn't save as many lives.
            </p>
          </div>
        </div>
      </section>

      {/* Why Foster */}
      <section className="section-padding bg-slate-50">
        <div className="container-custom">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            Why Foster?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            <Card className="p-6 text-center space-y-4">
              <div className="flex justify-center">
                <Heart className="h-12 w-12 text-primary" />
              </div>
              <h3 className="font-bold text-xl">Save Lives</h3>
              <p className="text-muted-foreground">
                Every foster opens a spot for another animal in need. You directly save lives by fostering.
              </p>
            </Card>
            <Card className="p-6 text-center space-y-4">
              <div className="flex justify-center">
                <Home className="h-12 w-12 text-primary" />
              </div>
              <h3 className="font-bold text-xl">Try Before Adopting</h3>
              <p className="text-muted-foreground">
                Fostering is a great way to see if you're ready for a pet, or to try different types of animals.
              </p>
            </Card>
            <Card className="p-6 text-center space-y-4">
              <div className="flex justify-center">
                <Clock className="h-12 w-12 text-primary" />
              </div>
              <h3 className="font-bold text-xl">Flexible Commitment</h3>
              <p className="text-muted-foreground">
                Foster lengths vary from a few days to several months. You choose what works for you.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Is Fostering Right for You */}
      <section className="section-padding bg-white">
        <div className="container-custom max-w-3xl">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            Is Fostering Right for You?
          </h2>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <div className="h-2 w-2 rounded-full bg-primary" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">You have a safe, pet-friendly space</h3>
                <p className="text-sm text-muted-foreground">
                  A spare room, quiet corner, or yard where a foster pet can feel secure.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <div className="h-2 w-2 rounded-full bg-primary" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">You can provide daily care and attention</h3>
                <p className="text-sm text-muted-foreground">
                  Feeding, playtime, socialization, and basic training.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <div className="h-2 w-2 rounded-full bg-primary" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">You're ready for the emotional ups and downs</h3>
                <p className="text-sm text-muted-foreground">
                  Saying goodbye is hard, but knowing you saved a life makes it worthwhile.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <div className="h-2 w-2 rounded-full bg-primary" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">You can transport to vet visits or events</h3>
                <p className="text-sm text-muted-foreground">
                  Occasional trips to the shelter or vet (we help coordinate).
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="section-padding bg-slate-50">
        <div className="container-custom max-w-4xl">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            How It Works
          </h2>
          <div className="space-y-8">
            <div className="flex gap-4">
              <div className="h-10 w-10 rounded-full bg-primary text-white flex items-center justify-center font-bold flex-shrink-0">
                1
              </div>
              <div>
                <h3 className="font-bold text-lg mb-2">Apply Online</h3>
                <p className="text-muted-foreground">
                  Fill out our simple foster application. Tell us about your home, schedule, and preferences.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="h-10 w-10 rounded-full bg-primary text-white flex items-center justify-center font-bold flex-shrink-0">
                2
              </div>
              <div>
                <h3 className="font-bold text-lg mb-2">Get Approved & Trained</h3>
                <p className="text-muted-foreground">
                  We'll review your application and provide a brief orientation covering basics of foster care.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="h-10 w-10 rounded-full bg-primary text-white flex items-center justify-center font-bold flex-shrink-0">
                3
              </div>
              <div>
                <h3 className="font-bold text-lg mb-2">Welcome Your Foster</h3>
                <p className="text-muted-foreground">
                  We'll match you with a pet that fits your lifestyle. We provide food, supplies, and medical care.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="h-10 w-10 rounded-full bg-primary text-white flex items-center justify-center font-bold flex-shrink-0">
                4
              </div>
              <div>
                <h3 className="font-bold text-lg mb-2">Ongoing Support</h3>
                <p className="text-muted-foreground">
                  We're here 24/7 for questions, advice, and support. You're never alone in this journey.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="section-padding bg-white">
        <div className="container-custom max-w-3xl">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            Common Questions
          </h2>
          <div className="space-y-6">
            {faqs.map((faq) => (
              <Card key={faq.question} className="p-6">
                <div className="flex gap-3">
                  <HelpCircle className="h-5 w-5 text-primary flex-shrink-0 mt-1" />
                  <div className="space-y-2">
                    <h3 className="font-semibold">{faq.question}</h3>
                    <p className="text-sm text-muted-foreground">{faq.answer}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section id="apply" className="section-padding bg-primary/5">
        <div className="container-custom max-w-2xl text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to Foster?
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Fill out our quick application and we'll be in touch within 48 hours.
          </p>
          <Button size="lg">
            Start Foster Application
          </Button>
          <p className="text-sm text-muted-foreground mt-4">
            Questions? Call us at (815) 858-2265
          </p>
        </div>
      </section>
    </div>
  )
}

const faqs = [
  {
    question: "What if I have to move or my situation changes?",
    answer: "We understand life happens! Just give us as much notice as possible and we'll arrange for the foster pet to return to the shelter or move to another foster home.",
  },
  {
    question: "What if I rent my home?",
    answer: "Many renters foster successfully! We just ask that you have your landlord's permission and that your lease allows pets.",
  },
  {
    question: "What if I already have pets?",
    answer: "That's great! We'll make sure to match you with a foster that gets along with your current pets. A meet-and-greet is always required.",
  },
  {
    question: "How long does fostering last?",
    answer: "It varies! Some pets need just a few days of care, while others may stay for weeks or months. We'll discuss the expected timeline before you commit.",
  },
  {
    question: "What costs do I cover?",
    answer: "Safe Haven covers all medical expenses, food, and supplies. You provide the love and care!",
  },
  {
    question: "Can I adopt my foster pet?",
    answer: "Absolutely! Many foster families end up adopting. We call them 'foster fails' and we love when it happens!",
  },
]
