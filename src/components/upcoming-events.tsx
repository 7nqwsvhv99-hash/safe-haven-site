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
  registrationUrl: string
  hasPaidReservations: boolean
  hasFreeRsvp: boolean
  hasRegistrationOptions: boolean
  startingPrice: number | null
  hasSponsorship: boolean
  visitorAction: string
  cancelled: boolean
  cancellationReason: string
  cancellationContact: string
  hasCancellationNotice: boolean
  showRescheduleBanner: boolean
  rescheduleNotice: string
  previousStart: string
  previousLocation: string
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

export function UpcomingEvents({ fullPage = false }: { fullPage?: boolean }) {
  const [state, setState] = useState("loading")
  const [events, setEvents] = useState<EventItem[]>([])

  useEffect(() => {
    let active = true

    async function loadEvents() {
      try {
        const response = await fetch(fullPage ? "/api/events?all=1" : "/api/events", { cache: "no-store" })
        if (!response.ok) throw new Error("Events unavailable")
        const data = await response.json()
        if (active && Array.isArray(data.events)) { setEvents(data.events); setState("ready") }
      } catch {
        if (active) setState("error")
      }
    }

    loadEvents()
    return () => {
      active = false
    }
  }, [fullPage])

  if (events.length === 0) return fullPage ? <p role="status" className="container-custom py-12 text-center text-muted-foreground">{state === "loading" ? "Loading events…" : state === "error" ? "We could not load events. Please refresh the page to try again." : "No upcoming events are posted. Please check back soon."}</p> : null

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
                  {event.hasCancellationNotice&&<div role="status" className="event-notice-glow mt-4 rounded-xl border border-orange-300 bg-orange-50 p-4"><p className="font-bold uppercase text-orange-900">Cancelled</p>{event.cancellationReason&&<p className="mt-1 text-sm text-orange-950">{event.cancellationReason}</p>}{event.cancellationContact&&<p className="mt-1 text-xs text-orange-950">Questions? {event.cancellationContact}</p>}</div>}
                  {event.showRescheduleBanner&&!event.cancelled&&<div role="status" className="event-notice-glow mt-4 rounded-xl border border-orange-300 bg-orange-50 p-4"><p className="font-bold uppercase text-orange-900">Rescheduled</p><p className="mt-1 text-sm text-orange-950">{event.rescheduleNotice}</p>{event.previousStart&&<p className="mt-1 text-xs text-orange-950">Previously {formatDate(event.previousStart,event.allDay)}{event.previousLocation?` at ${event.previousLocation}`:""}</p>}</div>}
                  {event.startingPrice !== null && (
                    <p className="mt-3 text-sm font-semibold text-primary">Tickets starting at ${event.startingPrice.toFixed(2)}</p>
                  )}
                  {event.hasSponsorship && !event.startingPrice && (
                    <p className="mt-3 text-sm font-semibold text-primary">Sponsorship options available</p>
                  )}
                  {!event.cancelled&&(event.hasRegistrationOptions || event.ctaUrl || (!event.visitorAction&&event.registrationUrl)) && (
                    <Button asChild variant="outline" className="mt-6 w-full">
                      {event.hasRegistrationOptions ? (
                        <a href={`/events/${event.id}`}>
                          {["Purchase tickets","Register and pay"].includes(event.visitorAction)?"Register & pay fee":event.visitorAction==="RSVP for free"?"RSVP for free":event.ctaLabel || (event.hasPaidReservations ? "Register & pay fee" : "RSVP for free")}
                        </a>
                      ) : (
                        <a href={event.registrationUrl || event.ctaUrl} target="_blank" rel="noopener noreferrer">
                          {event.ctaLabel || (event.registrationUrl ? "Register / Buy Tickets" : "Event Details")}
                        </a>
                      )}
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
