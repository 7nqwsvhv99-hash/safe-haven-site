"use client"

import { useEffect, useState } from "react"
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

  if (!isLoading && testimonials.length === 0) return null

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
          <div className="flex gap-6 overflow-x-auto pb-4 snap-x snap-mandatory">
            {testimonials.map((testimonial) => (
              <Card
                key={testimonial.id}
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
                    {Array.from({ length: 5 }).map((_, index) => (
                      <Heart key={index} className="h-4 w-4 fill-primary text-primary" />
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
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
