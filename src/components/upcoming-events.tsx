"use client"

import { useEffect, useState } from "react"
import { CalendarDays, MapPin } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

type EventItem = {
  id: string
  name: string
  type: string
  start: string
  end: string
  allDay: boolean
  locationName: string
  streetAddress: string
  city: string
  state: string
  zip: string
  description: string
  image: string
  ctaLabel: string
  ctaUrl: string
}

function formatDate(start: string, allDay: boolean) {
  const date = new Date(start)
  if (Number.isNaN(date.getTime())) return ""
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    weekday: "short",
    month: "short",
    day: "numeric",
    ...(allDay ? {} : { hour: "numeric", minute: "2-digit" }),
  }).format(date)
}

export function UpcomingEvents() {
  const [events, setEvents] = useState<EventItem[]>([])

  useEffect(() => {
    let active = true

    async function loadEvents() {
      try {
        const response = await fetch("/api/events", { cache: "no-store" })
        if (!response.ok) return
        const data = await response.json()
        if (active && Array.isArray(data.events)) setEvents(data.events)
      } catch {
        // If events cannot load, keep the section hidden rather than leaving an unfinished block.
      }
    }

    loadEvents()
    return () => {
      active = false
    }
  }, [])

  if (events.length === 0) return null

  return (
    <section className="section-padding bg-white">
      <div className="container-custom">
        <div className="text-center mb-10">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary mb-3">
            What&apos;s Happening
          </p>
          <h2 className="text-3xl md:text-4xl font-bold">Upcoming Events</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {events.map((event) => {
            const location = [event.locationName, event.city, event.state].filter(Boolean).join(" · ")
            return (
              <Card key={event.id} className="overflow-hidden flex flex-col">
                {event.image && (
                  <div className="aspect-[16/9] overflow-hidden bg-slate-100">
                    <img src={event.image} alt="" className="h-full w-full object-cover" />
                  </div>
                )}
                <div className="p-6 flex flex-col flex-1">
                  <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                    <CalendarDays className="h-4 w-4" />
                    {formatDate(event.start, event.allDay)}
                  </div>
                  <h3 className="mt-3 text-xl font-bold">{event.name}</h3>
                  {location && (
                    <p className="mt-2 flex items-start gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4 shrink-0 mt-0.5" />
                      <span>{location}</span>
                    </p>
                  )}
                  {event.description && (
                    <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                      {event.description}
                    </p>
                  )}
                  {event.ctaUrl && (
                    <Button asChild variant="outline" className="mt-6 w-full">
                      <a href={event.ctaUrl} target="_blank" rel="noopener noreferrer">
                        {event.ctaLabel || "Event Details"}
                      </a>
                    </Button>
                  )}
                </div>
              </Card>
            )
          })}
        </div>
      </div>
    </section>
  )
}
