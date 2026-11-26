"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Card } from "@/components/ui/card"
import { ChevronLeft, ChevronRight, Heart } from "lucide-react"

type Testimonial = {
  id: string
  animalName: string
  quote: string
  personName: string
  relationshipLabel: string
  image: string
  displayOrder: number | null
  publishedAt?: string
}

export function Testimonials() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeIndex, setActiveIndex] = useState(0)
  const carouselRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false
    async function loadTestimonials() {
      try {
        const response = await fetch("/api/testimonials", { cache: "no-store" })
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || "Could not load adoption stories")
        if (!cancelled) setTestimonials(Array.isArray(data.testimonials) ? data.testimonials : [])
      } catch (error) {
        console.error("Could not load testimonials", error)
        // Airtable is authoritative. Failing closed prevents a withdrawn story
        // from resurfacing through a stale hard-coded public fallback.
        if (!cancelled) setTestimonials([])
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    loadTestimonials()
    return () => { cancelled = true }
  }, [])

  const move = useCallback((direction: 1 | -1) => {
    const carousel = carouselRef.current
    if (!carousel || testimonials.length < 2) return
    const target = (activeIndex + direction + testimonials.length) % testimonials.length
    const cards = carousel.querySelectorAll<HTMLElement>("[data-testimonial-card]")
    const card = cards[target]
    if (!card) return
    const wraps = Math.abs(target - activeIndex) > testimonials.length / 2
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const left = card.offsetLeft - carousel.offsetLeft
    carousel.scrollTo({ left, behavior: reducedMotion || wraps ? "instant" : "smooth" })
    setActiveIndex(target)
  }, [activeIndex, testimonials.length])

  function updateActiveIndex() {
    const carousel = carouselRef.current
    if (!carousel) return
    const cards = Array.from(carousel.querySelectorAll<HTMLElement>("[data-testimonial-card]"))
    if (!cards.length) return
    const nearest = cards.reduce((best, card, index) => {
      const distance = Math.abs(card.getBoundingClientRect().left - carousel.getBoundingClientRect().left - 16)
      return distance < best.distance ? { index, distance } : best
    }, { index: 0, distance: Number.POSITIVE_INFINITY })
    setActiveIndex(nearest.index)
  }

  if (!isLoading && testimonials.length === 0) return null

  return (
    <section className="bg-white py-14 md:py-16">
      <div className="container-custom">
        <div className="mb-8 text-center md:mb-10">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-primary">Adoption Stories</p>
          <h2 className="mb-3 text-3xl font-bold md:text-4xl">Real Families. Real Second Chances.</h2>
          <p className="text-muted-foreground">Adoption changes more than one life.</p>
        </div>
      </div>

      {isLoading ? (
        <div className="px-4 md:px-8 lg:px-10"><div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => <Card key={index} className="overflow-hidden"><div className="aspect-square animate-pulse bg-slate-200"/><div className="space-y-3 p-6"><div className="h-4 w-full rounded bg-slate-200"/><div className="h-4 w-5/6 rounded bg-slate-200"/><div className="h-4 w-1/2 rounded bg-slate-200"/></div></Card>)}
        </div></div>
      ) : (
        <div className="relative" onKeyDown={(event) => {
          if (event.key === "ArrowLeft") { event.preventDefault(); move(-1) }
          if (event.key === "ArrowRight") { event.preventDefault(); move(1) }
        }}>
          {testimonials.length > 1 && <button type="button" aria-label="Previous adoption story" onClick={() => move(-1)} className="absolute left-2 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border bg-white/95 shadow-md hover:bg-white md:left-5"><ChevronLeft className="h-5 w-5"/></button>}
          <div ref={carouselRef} onScroll={updateActiveIndex} tabIndex={0} role="region" aria-label="Adoption stories" aria-roledescription="carousel" className="flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-smooth px-4 pb-4 md:gap-6 md:px-8 lg:px-10 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {testimonials.map((testimonial, index) => <Card key={testimonial.id} data-testimonial-card role="group" aria-roledescription="slide" aria-label={`${index + 1} of ${testimonials.length}: ${testimonial.animalName}`} className="flex-none snap-start overflow-hidden shadow-sm w-[86%] sm:w-[64%] md:w-[calc((100%-3rem)/3)] lg:w-[calc((100%-3rem)/3)]">
              {testimonial.image && <div className="aspect-square overflow-hidden bg-slate-100"><img src={testimonial.image} alt={testimonial.animalName || "Safe Haven adoption story"} loading={Math.abs(index-activeIndex)<=1?"eager":"lazy"} fetchPriority={index===activeIndex?"high":"auto"} decoding="async" className="h-full w-full object-contain"/></div>}
              <div className="space-y-4 p-5 md:p-6"><div className="flex gap-1" aria-hidden="true">{Array.from({ length: 5 }).map((_, heartIndex) => <Heart key={heartIndex} className="h-4 w-4 fill-primary text-primary"/>)}</div>
                <p className="text-sm italic leading-relaxed md:text-base">“{testimonial.quote}”</p>
                <div>{testimonial.animalName&&<p className="text-lg font-semibold">{testimonial.animalName}</p>}<p className="text-sm text-muted-foreground">{testimonial.personName}{testimonial.personName&&testimonial.relationshipLabel?", ":""}{testimonial.relationshipLabel}</p></div>
              </div>
            </Card>)}
          </div>
          {testimonials.length > 1 && <button type="button" aria-label="Next adoption story" onClick={() => move(1)} className="absolute right-2 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border bg-white/95 shadow-md hover:bg-white md:right-5"><ChevronRight className="h-5 w-5"/></button>}
          {testimonials.length > 1 && <p className="mt-2 text-center text-xs text-muted-foreground" aria-live="polite">Story {activeIndex + 1} of {testimonials.length}</p>}
        </div>
      )}
    </section>
  )
}
