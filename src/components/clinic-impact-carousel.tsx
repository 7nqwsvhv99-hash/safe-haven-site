"use client"

import { useEffect, useMemo, useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"

type ClinicImpactData = {
  year: number
  clinicDays: number
  animalsServed: number
  surgeries: number
  servicesProvided: number
  rabiesVaccines: number
  safeHavenCostsAvoided: number
  communitySavings: number
  towns: number
  counties: number
  states: number
}

const FALLBACK_2026: ClinicImpactData = {
  year: 2026,
  clinicDays: 34,
  animalsServed: 482,
  surgeries: 362,
  servicesProvided: 1144,
  rabiesVaccines: 273,
  safeHavenCostsAvoided: 3671,
  communitySavings: 56401,
  towns: 29,
  counties: 11,
  states: 3,
}

export function ClinicImpactCarousel() {
  const [impact, setImpact] = useState<ClinicImpactData>(FALLBACK_2026)
  const [activeIndex, setActiveIndex] = useState(0)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    let active = true

    async function loadImpact() {
      try {
        const response = await fetch("/api/clinic-impact", { cache: "no-store" })
        if (!response.ok) return
        const data = (await response.json()) as ClinicImpactData
        if (active) setImpact(data)
      } catch (error) {
        console.error("Unable to load clinic impact", error)
      }
    }

    loadImpact()

    return () => {
      active = false
    }
  }, [])

  const slides = useMemo(
    () => [
      { value: impact.clinicDays.toLocaleString(), label: "Clinic Days" },
      { value: impact.animalsServed.toLocaleString(), label: "Animals Served" },
      { value: impact.surgeries.toLocaleString(), label: "Spay/Neuter Surgeries" },
      { value: impact.servicesProvided.toLocaleString(), label: "Veterinary Services Provided" },
      { value: impact.rabiesVaccines.toLocaleString(), label: "Rabies Vaccines Administered" },
      {
        value: impact.safeHavenCostsAvoided.toLocaleString("en-US", {
          style: "currency",
          currency: "USD",
          maximumFractionDigits: 0,
        }),
        label: "Estimated Veterinary Costs Avoided for Safe Haven Animals",
      },
      {
        value: impact.communitySavings.toLocaleString("en-US", {
          style: "currency",
          currency: "USD",
          maximumFractionDigits: 0,
        }),
        label: "Estimated Veterinary Savings for Our Community",
      },
      { value: impact.towns.toLocaleString(), label: "Towns Served" },
      { value: impact.counties.toLocaleString(), label: "Counties Served" },
      { value: impact.states.toLocaleString(), label: "States Served" },
    ],
    [impact]
  )

  useEffect(() => {
    if (paused) return
    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % slides.length)
    }, 3800)

    return () => window.clearInterval(timer)
  }, [paused, slides.length])

  function goTo(index: number) {
    setActiveIndex((index + slides.length) % slides.length)
  }

  return (
    <section className="section-padding bg-primary/5">
      <div className="container-custom max-w-5xl">
        <div className="text-center mb-3">
          <p className="mb-3 text-sm font-bold uppercase tracking-widest text-primary">
            Community Impact {impact.year}
          </p>
          <h2 className="text-3xl md:text-4xl font-bold">The Clinic by the Numbers</h2>
        </div>

        <div
          className="relative mx-auto w-full max-w-[820px] overflow-hidden rounded-3xl border bg-white shadow-sm"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocusCapture={() => setPaused(true)}
          onBlurCapture={() => setPaused(false)}
        >
          <div className="min-h-[135px] md:min-h-[150px] flex items-center justify-center px-8 py-3 md:px-16 md:py-4">
            <div className="text-center max-w-3xl" aria-live="polite">
              <div className="text-6xl md:text-8xl font-bold tracking-tight text-primary">
                {slides[activeIndex].value}
              </div>
              <p className="mt-2 text-xl md:text-2xl font-semibold leading-snug">
                {slides[activeIndex].label}
              </p>
            </div>
          </div>

          <button
            type="button"
            aria-label="Previous clinic impact statistic"
            onClick={() => goTo(activeIndex - 1)}
            className="absolute left-4 top-1/2 -translate-y-1/2 h-11 w-11 rounded-full border bg-white/90 shadow-sm flex items-center justify-center hover:bg-white"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <button
            type="button"
            aria-label="Next clinic impact statistic"
            onClick={() => goTo(activeIndex + 1)}
            className="absolute right-4 top-1/2 -translate-y-1/2 h-11 w-11 rounded-full border bg-white/90 shadow-sm flex items-center justify-center hover:bg-white"
          >
            <ChevronRight className="h-5 w-5" />
          </button>

          <div className="flex justify-center gap-2 px-6 pb-2" aria-label="Clinic impact slides">
            {slides.map((slide, index) => (
              <button
                key={slide.label}
                type="button"
                aria-label={`Show ${slide.label}`}
                aria-current={index === activeIndex ? "true" : undefined}
                onClick={() => goTo(index)}
                className={`h-2.5 rounded-full transition-all ${
                  index === activeIndex ? "w-7 bg-primary" : "w-2.5 bg-primary/25 hover:bg-primary/45"
                }`}
              />
            ))}
          </div>
        </div>

        <p className="mt-2 text-center text-xs leading-relaxed text-muted-foreground">
          Figures update from Safe Haven&apos;s ClinicDay records. Savings figures are estimates based on Safe Haven pricing and full-service veterinary comparison benchmarks.
        </p>
      </div>
    </section>
  )
}
