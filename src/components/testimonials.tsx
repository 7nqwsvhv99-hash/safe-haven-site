"use client"

import { useEffect, useRef, useState } from "react"
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
}

export function Testimonials() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [paused, setPaused] = useState(false)
  const carouselRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false

    async function loadTestimonials() {
      try {
        const response = await fetch("/api/testimonials", { cache: "no-store" })
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || "Could not load testimonials")
        if (!cancelled) {
          setTestimonials(Array.isArray(data.testimonials) ? data.testimonials : [])
        }
      } catch (error) {
        console.error("Could not load testimonials", error)
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    loadTestimonials()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const carousel = carouselRef.current
    if (!carousel || testimonials.length < 2) return

    const positionAtMiddleSet = () => {
      const cycleWidth = carousel.scrollWidth / 3
      carousel.scrollLeft = cycleWidth
    }

    const frame = requestAnimationFrame(positionAtMiddleSet)
    window.addEventListener("resize", positionAtMiddleSet)

    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener("resize", positionAtMiddleSet)
    }
  }, [testimonials.length])

  useEffect(() => {
    if (paused || testimonials.length < 2) return

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (reduceMotion) return

    const timer = window.setInterval(() => {
      scrollByCard(1)
    }, 5200)

    return () => window.clearInterval(timer)
  }, [paused, testimonials.length])

  function handleCarouselScroll() {
    const carousel = carouselRef.current
    if (!carousel || testimonials.length < 2) return

    const cycleWidth = carousel.scrollWidth / 3
    if (!cycleWidth) return

    if (carousel.scrollLeft < cycleWidth * 0.5) {
      carousel.scrollLeft += cycleWidth
    } else if (carousel.scrollLeft > cycleWidth * 1.5) {
      carousel.scrollLeft -= cycleWidth
    }
  }

  function scrollByCard(direction: 1 | -1) {
    const carousel = carouselRef.current
    if (!carousel) return

    const card = carousel.querySelector<HTMLElement>("[data-testimonial-card]")
    if (!card) return

    const styles = window.getComputedStyle(carousel)
    const gap = Number.parseFloat(styles.columnGap || styles.gap || "0")
    carousel.scrollBy({
      left: direction * (card.offsetWidth + gap),
      behavior: "smooth",
    })
  }

  if (!isLoading && testimonials.length === 0) return null

  const loopedTestimonials =
    testimonials.length > 1
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
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocusCapture={() => setPaused(true)}
          onBlurCapture={() => setPaused(false)}
        >
          <button
            type="button"
            aria-label="Previous adoption story"
            onClick={() => scrollByCard(-1)}
            className="absolute left-2 md:left-5 top-1/2 z-10 -translate-y-1/2 h-11 w-11 rounded-full border bg-white/95 shadow-md flex items-center justify-center hover:bg-white"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <div
            ref={carouselRef}
            onScroll={handleCarouselScroll}
            onPointerDown={() => setPaused(true)}
            onPointerUp={() => setPaused(false)}
            onPointerCancel={() => setPaused(false)}
            className="flex gap-5 md:gap-6 overflow-x-auto px-4 md:px-8 lg:px-10 pb-4 snap-x snap-mandatory scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {loopedTestimonials.map((testimonial, index) => {
              const copyIndex =
                testimonials.length > 1
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

          <button
            type="button"
            aria-label="Next adoption story"
            onClick={() => scrollByCard(1)}
            className="absolute right-2 md:right-5 top-1/2 z-10 -translate-y-1/2 h-11 w-11 rounded-full border bg-white/95 shadow-md flex items-center justify-center hover:bg-white"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      )}
    </section>
  )
}
