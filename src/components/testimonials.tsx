"use client"

import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { Card } from "@/components/ui/card"
import { ChevronLeft, ChevronRight, Heart } from "lucide-react"
import { legacyAdoptionStories, withLegacyAdoptionStories } from "@/lib/legacy-adoption-stories"

type Testimonial = {
  id: string
  animalName: string
  quote: string
  personName: string
  relationshipLabel: string
  image: string
  displayOrder: number | null
}

// Measure between matching cards, excluding the track's outer padding.
function cycleWidth(carousel: HTMLDivElement, count: number) {
  const cards = carousel.querySelectorAll<HTMLElement>("[data-testimonial-card]")
  if (!cards[count]) return 0
  return cards[count].getBoundingClientRect().left - cards[0].getBoundingClientRect().left
}

function normalizeLoop(carousel: HTMLDivElement, count: number) {
  const width = cycleWidth(carousel, count)
  if (!width) return
  const left = carousel.scrollLeft
  if (left < width - 1 || left >= width * 2 - 1) {
    // Explicitly instant: this reset must never animate across the other copies.
    carousel.scrollTo({ left: left < width - 1 ? left + width : left - width, behavior: "instant" })
  }
}

function advanceCard(carousel: HTMLDivElement, direction: 1 | -1) {
  const cards = carousel.querySelectorAll<HTMLElement>("[data-testimonial-card]")
  if (cards.length < 2) return
  const step = cards[1].getBoundingClientRect().left - cards[0].getBoundingClientRect().left
  const target = (Math.round(carousel.scrollLeft / step) + direction) * step
  carousel.scrollTo({
    left: target,
    behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
  })
}

export function Testimonials() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const [interacting, setInteracting] = useState(false)
  const paused = hovered || focused || interacting
  const [isDesktop, setIsDesktop] = useState(false)
  const carouselRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const media = window.matchMedia("(min-width: 768px)")
    const update = () => setIsDesktop(media.matches)
    update()
    media.addEventListener("change", update)
    return () => media.removeEventListener("change", update)
  }, [])

  useEffect(() => {
    let cancelled = false

    async function loadTestimonials() {
      try {
        const response = await fetch("/api/testimonials", { cache: "no-store" })
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || "Could not load testimonials")
        if (!cancelled) {
          setTestimonials(withLegacyAdoptionStories<Testimonial>(Array.isArray(data.testimonials) ? data.testimonials : []))
        }
      } catch (error) {
        console.error("Could not load testimonials", error)
        if (!cancelled) setTestimonials(legacyAdoptionStories)
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    loadTestimonials()
    return () => {
      cancelled = true
    }
  }, [])

  const shouldLoop = testimonials.length > (isDesktop ? 3 : 1)

  useLayoutEffect(() => {
    const carousel = carouselRef.current
    if (!carousel || !shouldLoop || isLoading) return

    let settleTimer: ReturnType<typeof setTimeout>
    let touching = false
    const settle = () => {
      if (!touching) normalizeLoop(carousel, testimonials.length)
    }
    const scheduleSettle = () => {
      clearTimeout(settleTimer)
      settleTimer = setTimeout(settle, 180)
    }
    const startTouch = () => { touching = true }
    const endTouch = () => { touching = false; scheduleSettle() }
    const positionAtMiddleSet = () => {
      clearTimeout(settleTimer)
      carousel.scrollTo({ left: cycleWidth(carousel, testimonials.length), behavior: "instant" })
    }

    positionAtMiddleSet()
    // Rebase only once native scrolling and snap have settled, never mid-animation.
    carousel.addEventListener("scroll", scheduleSettle, { passive: true })
    carousel.addEventListener("pointerdown", startTouch, { passive: true })
    window.addEventListener("pointerup", endTouch)
    window.addEventListener("pointercancel", endTouch)
    window.addEventListener("resize", positionAtMiddleSet)
    return () => {
      clearTimeout(settleTimer)
      carousel.removeEventListener("scroll", scheduleSettle)
      carousel.removeEventListener("pointerdown", startTouch)
      window.removeEventListener("pointerup", endTouch)
      window.removeEventListener("pointercancel", endTouch)
      window.removeEventListener("resize", positionAtMiddleSet)
    }
  }, [shouldLoop, testimonials.length, isLoading])

  useEffect(() => {
    if (paused || !shouldLoop || isLoading) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    const timer = window.setInterval(() => {
      if (document.hidden) return
      const carousel = carouselRef.current
      if (carousel) advanceCard(carousel, 1)
    }, 8000)
    return () => window.clearInterval(timer)
  }, [paused, shouldLoop, testimonials.length, isLoading])

  function scrollByCard(direction: 1 | -1) {
    const carousel = carouselRef.current
    if (carousel) advanceCard(carousel, direction)
  }

  if (!isLoading && testimonials.length === 0) return null

  const loopedTestimonials = shouldLoop
    ? [...testimonials, ...testimonials, ...testimonials]
    : testimonials

  return (
    <section className="bg-white py-14 md:py-16">
      <div className="container-custom">
        <div className="text-center mb-8 md:mb-10">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary mb-3">
            Adoption Stories
          </p>
          <h2 className="text-3xl md:text-4xl font-bold mb-3">
            Real Families. Real Second Chances.
          </h2>
          <p className="text-muted-foreground">
            Adoption changes more than one life.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="px-4 md:px-8 lg:px-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {Array.from({ length: 3 }).map((_, index) => (
              <Card key={index} className="overflow-hidden">
                <div className="aspect-square bg-slate-200 animate-pulse" />
                <div className="p-6 space-y-3">
                  <div className="h-4 w-full rounded bg-slate-200 animate-pulse" />
                  <div className="h-4 w-5/6 rounded bg-slate-200 animate-pulse" />
                  <div className="h-4 w-1/2 rounded bg-slate-200 animate-pulse" />
                </div>
              </Card>
            ))}
          </div>
        </div>
      ) : (
        <div
          className="relative"
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          onFocusCapture={() => setFocused(true)}
          onBlurCapture={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false)
          }}
        >
          {shouldLoop && (
            <button
              type="button"
              aria-label="Previous adoption story"
              onClick={() => scrollByCard(-1)}
              className="absolute left-2 md:left-5 top-1/2 z-10 -translate-y-1/2 h-11 w-11 rounded-full border bg-white/95 shadow-md flex items-center justify-center hover:bg-white"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          )}

          <div
            ref={carouselRef}
            onPointerDown={() => setInteracting(true)}
            className="flex gap-5 md:gap-6 overflow-x-auto px-4 md:px-8 lg:px-10 pb-4 snap-x snap-mandatory scroll-auto scroll-px-4 md:scroll-px-8 lg:scroll-px-10 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {loopedTestimonials.map((testimonial, index) => {
              const copyIndex =
                shouldLoop
                  ? Math.floor(index / testimonials.length)
                  : 1

              return (
                <Card
                  key={`${testimonial.id}-${index}`}
                  data-testimonial-card
                  aria-hidden={copyIndex !== 1 ? true : undefined}
                  className="overflow-hidden flex-none w-[86%] sm:w-[64%] md:w-[calc((100%-3rem)/3)] lg:w-[calc((100%-3rem)/3)] snap-start shadow-sm"
                >
                  {testimonial.image && (
                    <div className="aspect-square overflow-hidden bg-slate-100">
                      <img
                        src={testimonial.image}
                        alt={testimonial.animalName || "Safe Haven adoption story"}
                        className="h-full w-full object-contain"
                      />
                    </div>
                  )}
                  <div className="p-5 md:p-6 space-y-4">
                    <div className="flex gap-1" aria-hidden="true">
                      {Array.from({ length: 5 }).map((_, heartIndex) => (
                        <Heart
                          key={heartIndex}
                          className="h-4 w-4 fill-primary text-primary"
                        />
                      ))}
                    </div>
                    <p className="text-sm md:text-base italic leading-relaxed">
                      “{testimonial.quote}”
                    </p>
                    <div>
                      {testimonial.animalName && (
                        <p className="font-semibold text-lg">{testimonial.animalName}</p>
                      )}
                      <p className="text-sm text-muted-foreground">
                        {testimonial.personName}
                        {testimonial.personName && testimonial.relationshipLabel ? ", " : ""}
                        {testimonial.relationshipLabel}
                      </p>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>

          {shouldLoop && (
            <button
              type="button"
              aria-label="Next adoption story"
              onClick={() => scrollByCard(1)}
              className="absolute right-2 md:right-5 top-1/2 z-10 -translate-y-1/2 h-11 w-11 rounded-full border bg-white/95 shadow-md flex items-center justify-center hover:bg-white"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          )}
        </div>
      )}
    </section>
  )
}
