"use client"

import { useEffect, useRef, useState } from "react"
import { Card } from "@/components/ui/card"
import { Heart } from "lucide-react"

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

  if (!isLoading && testimonials.length === 0) return null

  const loopedTestimonials =
    testimonials.length > 1
      ? [...testimonials, ...testimonials, ...testimonials]
      : testimonials

  return (
    <section className="section-padding bg-white">
      <div className="container-custom">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-3">
            Real Families. Real Second Chances.
          </h2>
          <p className="text-muted-foreground">
            Adoption changes more than one life.
          </p>
        </div>

        {isLoading ? (
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
        ) : (
          <div
            ref={carouselRef}
            onScroll={handleCarouselScroll}
            className="flex gap-6 overflow-x-auto pb-4 snap-x snap-mandatory"
          >
            {loopedTestimonials.map((testimonial, index) => {
              const copyIndex =
                testimonials.length > 1
                  ? Math.floor(index / testimonials.length)
                  : 1

              return (
                <Card
                  key={`${testimonial.id}-${index}`}
                  aria-hidden={copyIndex !== 1 ? true : undefined}
                  className="overflow-hidden flex-none w-[88%] sm:w-[70%] md:w-[32%] snap-start"
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
                  <div className="p-6 space-y-4">
                    <div className="flex gap-1" aria-hidden="true">
                      {Array.from({ length: 5 }).map((_, heartIndex) => (
                        <Heart
                          key={heartIndex}
                          className="h-4 w-4 fill-primary text-primary"
                        />
                      ))}
                    </div>
                    <p className="text-sm italic">“{testimonial.quote}”</p>
                    <div>
                      {testimonial.animalName && (
                        <p className="font-semibold">{testimonial.animalName}</p>
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
        )}
      </div>
    </section>
  )
}
