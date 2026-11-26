"use client"

import { useEffect, useState } from "react"
import { formatIntervals, resolveHoursForDate } from "@/lib/shelter-hours-policy.js"

type Interval = { start: string; end: string }
type Exception = {
  id: string; name: string; type: string; startDate: string; endDate: string;
  mode: "Closed" | "Replace"; openIntervals: Interval[]; message: string; status: string;
}
type Schedule = { timezone: string; days: Record<string, Interval[]> }
type ResponseData = { today: string; weeklySchedule: Schedule; exceptions: Exception[] }

const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

function dateLabel(value: string) {
  const date = new Date(`${value}T12:00:00Z`)
  return new Intl.DateTimeFormat("en-US", { timeZone: "America/Chicago", month: "short", day: "numeric", year: "numeric" }).format(date)
}

function ScheduleContents({ data }: { data: ResponseData }) {
  const today = resolveHoursForDate(data.weeklySchedule, data.exceptions, data.today)
  if (today.conflict) return <p className="text-sm text-amber-800">Today’s hours are being confirmed. Please call (815) 858-2265.</p>
  return <div>
    <p className="text-sm text-slate-700"><strong>Today, {formatIntervals(today.intervals)}</strong>{today.exception ? ` · ${today.exception.name}` : ""}</p>
    <details className="mt-3">
      <summary className="cursor-pointer text-sm font-medium text-primary">Full weekly schedule</summary>
      <dl className="mt-2 space-y-1 text-sm">
        {days.map((day) => <div key={day} className="flex justify-between gap-4"><dt className="text-muted-foreground">{day}</dt><dd className="font-medium text-right">{formatIntervals(data.weeklySchedule.days[day] || [])}</dd></div>)}
      </dl>
    </details>
    {data.exceptions.length > 0 && <div className="mt-3 space-y-2 border-t pt-3">
      {data.exceptions.slice(0, 3).map((exception) => <div key={exception.id} className="text-sm">
        <p className="font-semibold">{exception.name} · {dateLabel(exception.startDate)}{exception.endDate !== exception.startDate ? `–${dateLabel(exception.endDate)}` : ""}</p>
        <p className="text-muted-foreground">{exception.mode === "Closed" ? "Closed" : formatIntervals(exception.openIntervals)}{exception.message ? ` · ${exception.message}` : ""}</p>
      </div>)}
    </div>}
  </div>
}

export function ShelterHoursDisplay() {
  const [data, setData] = useState<ResponseData | null>(null)
  const [unavailable, setUnavailable] = useState(false)

  useEffect(() => {
    let active = true
    const load = async () => {
      try {
        const response = await fetch("/api/shelter-hours", { cache: "no-store" })
        if (!response.ok) throw new Error("Hours unavailable")
        const result = await response.json() as ResponseData
        if (active) { setData(result); setUnavailable(false) }
      } catch {
        if (active) setUnavailable(true)
      }
    }
    void load()
    const timer = window.setInterval(load, 60_000)
    window.addEventListener("focus", load)
    return () => { active = false; window.clearInterval(timer); window.removeEventListener("focus", load) }
  }, [])

  if (unavailable && !data) return <p className="text-sm text-muted-foreground">Hours temporarily unavailable. Call (815) 858-2265 to confirm.</p>
  if (!data) return <p className="text-sm text-muted-foreground" aria-live="polite">Loading current hours…</p>
  return <ScheduleContents data={data} />
}
