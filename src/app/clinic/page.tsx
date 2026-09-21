import Link from "next/link"
import {
  CalendarCheck,
  Cat,
  ClipboardCheck,
  CreditCard,
  FileText,
  HeartPulse,
  ShieldCheck,
  Stethoscope,
  Syringe,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ClinicImpactCarousel } from "@/components/clinic-impact-carousel"

const intakeFormUrl =
  "https://airtable.com/app3AcoD2G64aMsEz/pag18veN4frVCtuOz/form"

const steps = [
  {
    icon: FileText,
    title: "Complete the intake form",
    description:
      "Tell us about you, your cat, and the services you are requesting.",
  },
  {
    icon: ClipboardCheck,
    title: "We review your request",
    description:
      "A clinic volunteer reviews the information, available space, and your cat's needs, then responds within 72 hours.",
  },
  {
    icon: CalendarCheck,
    title: "Watch for confirmation",
    description:
      "We will contact you when an appointment is available and provide the clinic date and drop-off instructions.",
  },
]

export default function ClinicPage() {
  return (
    <div className="flex flex-col">
      <section className="hero-gradient">
        <div className="container-custom py-12 md:py-14 lg:py-16">
          <div className="mx-auto max-w-4xl text-center">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-white/80 px-4 py-2 text-sm font-semibold text-primary shadow-sm">
              <HeartPulse className="h-4 w-4" />
              Low-cost care for local animals
            </div>
            <h1 className="text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl">
              Spay &amp; Neuter Clinic
            </h1>
            <p className="mx-auto mt-6 max-w-3xl text-lg leading-relaxed text-muted-foreground md:text-xl">
              Safe Haven Humane Society provides low-cost spay/neuter services
              for cats, with select add-on services available when appropriate.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
              <Button asChild size="lg">
                <a href={intakeFormUrl} target="_blank" rel="noopener noreferrer">
                  Complete the Cat Intake Form
                </a>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="#services">View Services</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white section-padding">
        <div className="container-custom max-w-5xl">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <p className="mb-3 text-sm font-bold uppercase tracking-widest text-primary">
              How it works
            </p>
            <h2 className="text-3xl font-bold md:text-4xl">
              Start with one simple request
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {steps.map((step, index) => {
              const Icon = step.icon
              return (
                <Card key={step.title} className="community-card relative p-6 h-full">
                  <div className="mb-5 flex items-center justify-between">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <span className="text-4xl font-bold text-primary/15">
                      {index + 1}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold">{step.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                    {step.description}
                  </p>
                </Card>
              )
            })}
          </div>
        </div>
      </section>

      <section className="bg-white py-10 md:py-12">
        <div className="container-custom max-w-5xl">
          <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-[0.72fr_1fr] lg:gap-10">
            <div className="mx-auto w-full max-w-[330px]">
              <div className="overflow-hidden rounded-3xl border bg-black shadow-lg">
                <video
                  className="aspect-[9/16] w-full object-cover"
                  controls
                  muted
                  playsInline
                  preload="metadata"
                  aria-label="Safe Haven spay and neuter clinic video"
                >
                  <source
                    src="/videos/spay-neuter-clinic-promo-web.mp4"
                    type="video/mp4"
                  />
                  Your browser does not support embedded video.
                </video>
              </div>
            </div>

            <div className="rounded-3xl bg-primary/5 p-7 md:p-9">
              <p className="mb-3 text-sm font-bold uppercase tracking-widest text-primary">
                Inside the clinic
              </p>
              <h2 className="text-3xl font-bold md:text-4xl">
                See the Clinic in Action
              </h2>
              <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
                Safe Haven&apos;s spay/neuter clinics bring veterinary professionals
                and volunteers together to provide thoughtful, affordable care for
                cats in our community.
              </p>
              <p className="mt-4 leading-relaxed text-muted-foreground">
                Take a quick look behind the scenes at the people, patients, and
                teamwork that make each clinic day possible.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white pb-10 md:pb-12">
        <div className="container-custom max-w-5xl">
          <Card className="border-primary/15 bg-primary/5 p-7 text-center md:p-9">
            <p className="mx-auto max-w-4xl text-lg italic leading-relaxed text-foreground md:text-xl">
              “We love Safe Haven because it is a miraculous true Safe Haven for these precious animals and all of the people there are truly angels for all these animals! They are both out of their box and snuggled together in the living room in their favorite place! Thank you so much for being such wonderful people! Xo”
            </p>
            <p className="mt-4 text-sm font-semibold text-primary">
              Dawn M. · Clinic Client
            </p>
          </Card>
        </div>
      </section>

      <section id="services" className="bg-white section-padding scroll-mt-24">
        <div className="container-custom max-w-5xl">
          <div className="mx-auto mb-10 max-w-3xl text-center">
            <p className="mb-3 text-sm font-bold uppercase tracking-widest text-primary">
              Available services
            </p>
            <h2 className="text-3xl font-bold md:text-4xl">
              Focused care for cats
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <Card className="p-7">
              <Cat className="mb-4 h-9 w-9 text-primary" />
              <h3 className="text-xl font-bold">Spay &amp; Neuter</h3>
              <p className="mt-3 leading-relaxed text-muted-foreground">
                Surgical sterilization for cats through scheduled clinic days.
                Clinics are currently held four times each month, typically on
                two Wednesdays and two Saturdays.
              </p>
            </Card>

            <Card className="p-7">
              <Syringe className="mb-4 h-9 w-9 text-primary" />
              <h3 className="text-xl font-bold">Additional Services</h3>
              <p className="mt-3 leading-relaxed text-muted-foreground">
                Rabies, FVRCP, microchipping, FeLV/FIV testing, and parasite
                treatment are available.
              </p>
            </Card>
          </div>
        </div>
      </section>

      <ClinicImpactCarousel />

      <section className="bg-slate-50 section-padding">
        <div className="container-custom max-w-6xl">
          <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-[0.82fr_1.18fr] lg:gap-14">
            <div className="lg:sticky lg:top-24">
              <div className="overflow-hidden rounded-3xl bg-white shadow-sm">
                <img
                  src="/images/clinic-vet-cat-square.JPG"
                  alt="Safe Haven clinic team providing veterinary care"
                  className="aspect-square w-full object-cover"
                />
              </div>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                Clinic days depend on skilled veterinary care, careful preparation,
                and volunteers working together for each patient.
              </p>
            </div>

            <div>
              <div className="mb-8">
                <p className="mb-3 text-sm font-bold uppercase tracking-widest text-primary">
                  Important to know
                </p>
                <h2 className="text-3xl font-bold md:text-4xl">
                  Before you submit the intake form
                </h2>
              </div>

              <div className="grid grid-cols-1 gap-6">
                <Card className="flex gap-4 p-6">
                  <ShieldCheck className="h-7 w-7 shrink-0 text-primary" />
                  <div>
                    <h3 className="text-lg font-bold">Clinic requirements</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      You will review fasting requirements, general animal health,
                      rabies vaccination status, and cancellation information before
                      submitting.
                    </p>
                  </div>
                </Card>

                <Card className="flex gap-4 p-6">
                  <CreditCard className="h-7 w-7 shrink-0 text-primary" />
                  <div>
                    <h3 className="text-lg font-bold">Payment at check-in</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      If an appointment is scheduled, payment is due at check-in.
                      Safe Haven accepts cash, check, credit card, or Venmo at
                      @safehaven1471.
                    </p>
                  </div>
                </Card>

                <Card className="flex gap-4 p-6">
                  <Stethoscope className="h-7 w-7 shrink-0 text-primary" />
                  <div>
                    <h3 className="text-lg font-bold">Medical authorization</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      The form includes consent for requested services, treatment of
                      unforeseen medical conditions, medical risk acknowledgement,
                      and liability release.
                    </p>
                  </div>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-primary text-primary-foreground section-padding">
        <div className="container-custom max-w-3xl text-center">
          <h2 className="text-3xl font-bold md:text-4xl">
            Ready to request an appointment?
          </h2>
          <p className="mx-auto mt-4 max-w-2xl leading-relaxed text-primary-foreground/85">
            <span className="block">
              Complete the intake form and our clinic team will review your request.
            </span>
            <span className="mt-1 block">
              Please wait for confirmation before making plans for a clinic day.
            </span>
          </p>
          <Button
            asChild
            size="lg"
            variant="secondary"
            className="mt-8"
          >
            <a href={intakeFormUrl} target="_blank" rel="noopener noreferrer">
              Complete the Cat Intake Form
            </a>
          </Button>
        </div>
      </section>
    </div>
  )
}
