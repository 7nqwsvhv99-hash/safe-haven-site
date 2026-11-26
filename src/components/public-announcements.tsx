"use client"

import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"

type PublicAnnouncement = {
  id: string
  title: string
  type: string
  message: string
  displayStart: string
  expiresAt: string
  priority: string
}

export function PublicAnnouncements() {
  const pathname = usePathname()
  const [announcements, setAnnouncements] = useState<PublicAnnouncement[]>([])

  useEffect(() => {
    let active = true
    const load = async () => {
      try {
        const response = await fetch("/api/announcements", { cache: "no-store" })
        if (!response.ok) return
        const result = await response.json() as { announcements?: PublicAnnouncement[] }
        if (active) setAnnouncements(Array.isArray(result.announcements) ? result.announcements : [])
      } catch {
        if (active) setAnnouncements([])
      }
    }
    void load()
    const interval = window.setInterval(load, 60_000)
    window.addEventListener("focus", load)
    return () => {
      active = false
      window.clearInterval(interval)
      window.removeEventListener("focus", load)
    }
  }, [])

  if (pathname.startsWith("/portal") || announcements.length === 0) return null
  const shown = announcements.slice(0, 3)
  const remaining = announcements.length - shown.length

  return (
    <section aria-label="Public announcements" className="border-b border-orange-200 bg-orange-50">
      <div className="container-custom py-3">
        <details open>
          <summary className="cursor-pointer list-none font-semibold text-orange-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-orange-700">
            Announcements <span className="ml-1 text-sm font-normal text-orange-900">({announcements.length})</span>
          </summary>
          <div className="mt-3 grid gap-3" aria-live="polite">
            {shown.map((announcement) => (
              <article key={announcement.id} className="rounded-xl border border-orange-200 bg-white px-4 py-3" role={announcement.priority === "Urgent" ? "alert" : "status"}>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${announcement.priority === "Urgent" ? "bg-red-100 text-red-800" : "bg-orange-100 text-orange-900"}`}>
                    {announcement.priority} · {announcement.type}
                  </span>
                  <h2 className="font-semibold text-slate-950">{announcement.title}</h2>
                </div>
                <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-800">{announcement.message}</p>
              </article>
            ))}
            {remaining > 0 && (
              <details className="rounded-xl border border-orange-200 bg-white px-4 py-3">
                <summary className="cursor-pointer font-medium text-orange-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-700">
                  Show {remaining} more {remaining === 1 ? "announcement" : "announcements"}
                </summary>
                <div className="mt-3 grid gap-3">
                  {announcements.slice(3).map((announcement) => (
                    <article key={announcement.id} className="border-t border-orange-100 pt-3">
                      <p className="font-semibold">{announcement.title}</p>
                      <p className="mt-1 whitespace-pre-line text-sm leading-6 text-slate-800">{announcement.message}</p>
                    </article>
                  ))}
                </div>
              </details>
            )}
          </div>
        </details>
      </div>
    </section>
  )
}
