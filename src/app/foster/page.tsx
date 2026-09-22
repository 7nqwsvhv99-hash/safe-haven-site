import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Heart, Home, PawPrint, Baby, ShieldCheck, ClipboardCheck, Eye, HouseHeart, HeartHandshake } from "lucide-react"
import { ExclusiveFaq } from "@/components/exclusive-faq"

export default function FosterPage() {
  return (
    <div className="flex flex-col">
      <section className="hero-gradient">
        <div className="container-custom py-10 md:py-12 lg:py-14">
          <div className="max-w-5xl mx-auto text-center space-y-6">
            <p className="text-sm md:text-base font-semibold uppercase tracking-[0.18em] text-primary">
              Foster With Safe Haven
            </p>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight">Become a Foster Home</h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
              Give a cat or dog a safe, temporary home while they wait for the right permanent family. Foster families expand Safe Haven's ability to care for more animals in our community.
            </p>
            <Button asChild size="lg"><Link href="/foster-application">Apply to Foster</Link></Button>
          </div>
        </div>
      </section>

      <section className="section-padding bg-white">
        <div className="container-custom">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Why Foster?</h2>
            <p className="text-lg text-muted-foreground">Foster care gives animals time to adjust, build confidence, and show us who they are outside the shelter environment.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            <Card className="community-card relative p-6 text-center space-y-4 h-full"><div className="flex justify-center"><Heart className="h-12 w-12 text-primary" /></div><h3 className="font-bold text-xl">Expand Safe Haven's Capacity</h3><p className="text-muted-foreground">Every foster home creates more room for Safe Haven to help another animal in need.</p></Card>
            <Card className="community-card relative p-6 text-center space-y-4 h-full"><div className="flex justify-center"><Home className="h-12 w-12 text-primary" /></div><h3 className="font-bold text-xl">Help an Animal Thrive</h3><p className="text-muted-foreground">Home life can provide routine, socialization, and valuable insight into an animal's personality and needs.</p></Card>
            <Card className="community-card relative p-6 text-center space-y-4 h-full"><div className="flex justify-center"><PawPrint className="h-12 w-12 text-primary" /></div><h3 className="font-bold text-xl">Support the Right Match</h3><p className="text-muted-foreground">What you learn about your foster can help Safe Haven find a permanent home that fits the animal well.</p></Card>
          </div>
        </div>
      </section>

      <section className="section-padding bg-slate-50">
        <div className="container-custom max-w-6xl">
          <div className="mx-auto max-w-3xl text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold">What Foster Families Do</h2>
            <p className="mt-4 text-muted-foreground">
              Foster care is a simple progression: care for the animal, learn what they need, follow the plan, and help Safe Haven prepare them for the right home.
            </p>
          </div>

          <div className="relative grid grid-cols-1 gap-8 md:grid-cols-4">
            <div className="absolute left-[12.5%] right-[12.5%] top-6 hidden h-px bg-primary/20 md:block" aria-hidden="true" />
            {responsibilities.map((item, index) => {
              const Icon = responsibilityIcons[index]
              return (
                <div key={item.title} className="relative text-center md:text-left">
                  <div className="relative z-10 mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white border border-primary/20 shadow-sm md:mx-0">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="mt-4 font-bold text-lg">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.description}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <section className="section-padding bg-white">
        <div className="container-custom max-w-5xl">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Special Foster Care</h2>
            <p className="text-muted-foreground">Many Safe Haven foster placements involve bottle babies or pregnant and nursing moms. These placements can be especially rewarding, but they also require more hands-on care.</p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-6 md:p-8 space-y-4">
              <div className="flex items-center gap-3"><Baby className="h-8 w-8 text-primary" /><h3 className="font-bold text-2xl">Bottle Babies</h3></div>
              <p className="text-muted-foreground">Very young kittens may need round-the-clock support until they can eat on their own.</p>
              <ul className="space-y-2 text-sm text-muted-foreground list-disc pl-5">
                <li>Be prepared for frequent feeding, including overnight depending on age and condition.</li>
                <li>Keep babies warm and follow Safe Haven's feeding and care instructions closely.</li>
                <li><strong>Formula matters:</strong> use <a href="https://www.amazon.com/s?k=kitten+milk+replacer+KMR" target="_blank" rel="noopener noreferrer" className="font-semibold text-primary underline underline-offset-2 hover:no-underline">kitten milk replacer (KMR)</a>. Never use cow's milk.</li>
                <li>Young babies may need help eliminating after feeding.</li>
                <li>Monitor weight, appetite, energy, stool, and other changes and report concerns promptly.</li>
              </ul>
              <p className="text-xs text-muted-foreground">Safe Haven provides supplies and placement-specific instructions. Contact Safe Haven before changing formula, feeding amounts, medications, or veterinary plans.</p>
            </Card>
            <Card className="p-6 md:p-8 space-y-4">
              <div className="flex items-center gap-3"><ShieldCheck className="h-8 w-8 text-primary" /><h3 className="font-bold text-2xl">Pregnant & Nursing Moms</h3></div>
              <p className="text-muted-foreground">A pregnant mom needs a quiet, secure place where she can settle before delivery and care for her litter afterward.</p>
              <ul className="space-y-2 text-sm text-muted-foreground list-disc pl-5">
                <li>Provide a private, low-stress room away from other pets and unnecessary activity.</li>
                <li>Offer an appropriate nesting area and keep food, water, and litter or potty access nearby.</li>
                <li>Observe the mom without disturbing her more than necessary, especially around labor and newborns.</li>
                <li>Track appetite, behavior, nursing, and the condition of the babies and contact Safe Haven when something seems wrong.</li>
              </ul>
              <p className="text-xs text-muted-foreground">Safe Haven coordinates veterinary care and provides instructions for each placement. Foster caregivers should contact Safe Haven for concerns about labor, nursing, illness, or treatment.</p>
            </Card>
          </div>
        </div>
      </section>

      <section className="section-padding bg-slate-50">
        <div className="container-custom">
          <div className="max-w-3xl mx-auto text-center mb-12"><h2 className="text-3xl md:text-4xl font-bold mb-4">What to Expect</h2><p className="text-muted-foreground">We want foster families to understand the commitment before accepting a placement and to have the practical support needed to care for the animal.</p></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="soft-gray-glow-card relative p-6 space-y-3 h-full"><h3 className="font-bold text-xl">Food &amp; Supplies Provided</h3><p className="text-muted-foreground">Safe Haven provides the food, supplies, medications, crates, bedding, toys, and other items needed for each foster placement.</p></Card>
            <Card className="soft-gray-glow-card relative p-6 space-y-3 h-full"><h3 className="font-bold text-xl">Veterinary Care Covered</h3><p className="text-muted-foreground">Safe Haven covers medical expenses for foster animals. If you need to buy something for your foster in a pinch, save the receipt and Safe Haven will reimburse you. Contact Safe Haven before arranging non-emergency veterinary care.</p></Card>
            <Card className="soft-gray-glow-card relative p-6 space-y-3 h-full"><h3 className="font-bold text-xl">After-Hours Support</h3><p className="text-muted-foreground">Foster families receive direct after-hours contact information and an emergency veterinary plan based on where they live.</p></Card>
            <Card className="soft-gray-glow-card relative p-6 space-y-3 h-full"><h3 className="font-bold text-xl">Expectations Discussed Up Front</h3><p className="text-muted-foreground">Some placements are short and others last several weeks or longer. We will discuss the animal's needs and expected commitment before placement.</p></Card>
          </div>
        </div>
      </section>

      <section className="section-padding bg-white"><div className="container-custom max-w-4xl"><h2 className="text-3xl md:text-4xl font-bold text-center mb-12">How It Works</h2><div className="grid grid-cols-1 md:grid-cols-4 gap-6">{steps.map((step, index) => <div key={step.title} className="space-y-3"><div className="h-10 w-10 rounded-full bg-primary text-white flex items-center justify-center font-bold">{index + 1}</div><h3 className="font-bold text-lg">{step.title}</h3><p className="text-sm text-muted-foreground">{step.description}</p></div>)}</div></div></section>

      <section className="section-padding bg-slate-50">
        <div className="container-custom max-w-3xl">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">Common Questions</h2>
          <ExclusiveFaq faqs={faqs} />
        </div>
      </section>

      <section id="apply" className="section-padding bg-primary/5"><div className="container-custom max-w-2xl text-center"><h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Foster?</h2><p className="text-lg text-muted-foreground mb-8">Tell us about your household and the types of foster placements you could support.</p><Button asChild size="lg"><Link href="/foster-application">Start Foster Application</Link></Button><p className="text-sm text-muted-foreground mt-4">Questions? Call us at (815) 858-2265.</p></div></section>
    </div>
  )
}

const responsibilities = [
  { title: "Provide Daily Care", description: "Give your foster animal a safe environment, food, water, affection, exercise or play, and age-appropriate care." },
  { title: "Observe & Learn", description: "Help Safe Haven understand the animal's personality, habits, comfort level, and the kind of home where they may thrive." },
  { title: "Follow the Care Plan", description: "Follow the instructions provided for the individual animal and stay in communication with Safe Haven about concerns or changes." },
  { title: "Help With Adoption", description: "Share updates and work with Safe Haven when a potential adopter may be a good match." },
]

const responsibilityIcons = [HouseHeart, Eye, ClipboardCheck, HeartHandshake]

const steps = [
  { title: "Apply", description: "Tell us about your household, experience, schedule, and the kinds of animals or needs you are comfortable fostering." },
  { title: "Review & Match", description: "Safe Haven reviews the application and identifies a foster placement that fits your household and the animal's needs." },
  { title: "Welcome Your Foster", description: "Bring the animal into your home with the food, supplies, care instructions, direct contact information, and emergency veterinary plan needed for the placement." },
  { title: "Stay Connected", description: "Share updates, communicate concerns, and help Safe Haven learn what kind of permanent home may be the best fit." },
]

const faqs = [
  { question: "What does Safe Haven provide?", answer: "Safe Haven provides the food, supplies, medications, crates, bedding, toys, and other items needed for each foster placement. Safe Haven also covers medical expenses for foster animals. Foster families receive direct contact information for questions, including after-hours support, and an emergency veterinary plan based on where they live." },
  { question: "What if I need help after hours?", answer: "Foster families receive direct after-hours contact information when a placement begins. Safe Haven also helps determine which emergency veterinary clinic is appropriate based on where the foster family lives." },
  { question: "How long does fostering last?", answer: "It varies by animal and situation. Some placements are short, while others last several weeks or longer. We will discuss the expected commitment before you agree to a placement." },
  { question: "What if I rent my home?", answer: "Renters may be able to foster if their housing allows pets. The application asks about your housing situation so Safe Haven can confirm that a placement is appropriate." },
  { question: "What if I already have pets or children?", answer: "That does not automatically prevent you from fostering. We use information about your household and current animals to help determine which placements may be a good fit." },
  { question: "Do I need previous foster experience?", answer: "Not necessarily. The application asks about your experience, comfort with different needs, and preferences so Safe Haven can make an appropriate match." },
]
