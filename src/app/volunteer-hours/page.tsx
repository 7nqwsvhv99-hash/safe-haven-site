"use client"

import { FormEvent, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CheckCircle2 } from "lucide-react"

type VolunteerOption = {
  id: string
  displayName: string
}

type FormDataResponse = {
  volunteers: VolunteerOption[]
  activities: string[]
  today: string
  error?: string
}

const selectClass = "flex h-12 w-full rounded-xl border border-input bg-background px-4 py-3 text-base"
const checkboxClass = "h-4 w-4 rounded border-input accent-primary"

export default function VolunteerHoursPage() {
  const [volunteers, setVolunteers] = useState<VolunteerOption[]>([])
  const [activities, setActivities] = useState<string[]>([])
  const [date, setDate] = useState("")
  const [hours, setHours] = useState("")
  const [activity, setActivity] = useState("")
  const [selectedVolunteerIds, setSelectedVolunteerIds] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState<{ participants: number; totalVolunteerHours: number } | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadForm() {
      try {
        const response = await fetch("/api/volunteer-hours", { cache: "no-store" })
        const data = (await response.json()) as FormDataResponse
        if (!response.ok) throw new Error(data.error || "Unable to load the form.")
        if (cancelled) return

        setVolunteers(data.volunteers || [])
        setActivities(data.activities || [])
        setDate(data.today || "")
      } catch (loadError) {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : "Unable to load the form.")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadForm()
    return () => {
      cancelled = true
    }
  }, [])

  const selectedCount = selectedVolunteerIds.length
  const totalVolunteerHours = useMemo(() => {
    const numericHours = Number(hours)
    if (!Number.isFinite(numericHours) || numericHours <= 0) return 0
    return Math.round(numericHours * selectedCount * 100) / 100
  }, [hours, selectedCount])

  function toggleVolunteer(id: string) {
    setSelectedVolunteerIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])
  }

  function resetForm() {
    setHours("")
    setActivity("")
    setSelectedVolunteerIds([])
    setSuccess(null)
    setError("")
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")
    setSuccess(null)

    if (!date) {
      setError("Please select the date volunteered.")
      return
    }
    if (selectedVolunteerIds.length === 0) {
      setError("Please select at least one volunteer.")
      return
    }
    if (!activity) {
      setError("Please select the volunteer activity.")
      return
    }

    const numericHours = Number(hours)
    if (!Number.isFinite(numericHours) || numericHours <= 0 || numericHours > 24) {
      setError("Please enter hours greater than 0 and no more than 24.")
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch("/api/volunteer-hours", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          volunteerIds: selectedVolunteerIds,
          hours: numericHours,
          activity,
        }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data?.error || "Unable to record volunteer hours.")

      setSuccess({
        participants: data.participants,
        totalVolunteerHours: data.totalVolunteerHours,
      })
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to record volunteer hours.")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="container-custom section-padding max-w-2xl">
        <Card className="p-8 text-center text-muted-foreground">Loading volunteer hours form...</Card>
      </div>
    )
  }

  if (success) {
    return (
      <div className="bg-slate-50 min-h-screen">
        <div className="container-custom section-padding max-w-2xl">
          <Card className="p-8 text-center space-y-5">
            <CheckCircle2 className="h-12 w-12 text-primary mx-auto" />
            <h1 className="text-3xl font-bold">Volunteer Hours Recorded</h1>
            <p className="text-muted-foreground">
              {success.participants === 1
                ? "1 volunteer was recorded."
                : `${success.participants} volunteers were recorded.`}
            </p>
            <p className="font-semibold text-lg">
              {success.totalVolunteerHours} total volunteer-hour{success.totalVolunteerHours === 1 ? "" : "s"}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button type="button" onClick={resetForm}>Submit Another Entry</Button>
              <Button asChild variant="outline"><Link href="/volunteer">Return to Volunteer Page</Link></Button>
            </div>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-slate-50 min-h-screen">
      <section className="hero-gradient">
        <div className="container-custom section-padding max-w-3xl text-center space-y-4">
          <h1 className="text-4xl md:text-5xl font-bold">Volunteer Hours</h1>
          <p className="text-lg text-muted-foreground">
            Record volunteer time for yourself or for a group who worked the same activity and number of hours.
          </p>
        </div>
      </section>

      <form onSubmit={onSubmit} className="container-custom max-w-2xl py-10">
        <Card className="p-6 md:p-8 space-y-7">
          {error && <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-destructive">{error}</div>}

          <div className="grid sm:grid-cols-2 gap-5">
            <div className="space-y-2">
              <Label htmlFor="volunteer-date">Date *</Label>
              <Input id="volunteer-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="volunteer-hours">Hours per volunteer *</Label>
              <Input
                id="volunteer-hours"
                type="number"
                inputMode="decimal"
                min="0.25"
                max="24"
                step="0.25"
                placeholder="Example: 3.5"
                value={hours}
                onChange={(event) => setHours(event.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="volunteer-activity">Volunteer Activity *</Label>
            <select
              id="volunteer-activity"
              className={selectClass}
              value={activity}
              onChange={(event) => setActivity(event.target.value)}
              required
            >
              <option value="" disabled>Select an activity</option>
              {activities.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </div>

          <div className="space-y-3">
            <div>
              <Label>Volunteer(s) *</Label>
              <p className="text-sm text-muted-foreground mt-1">
                Select everyone who worked the same activity for the same number of hours.
              </p>
            </div>

            {volunteers.length === 0 ? (
              <div className="rounded-xl border bg-white p-4 text-sm text-muted-foreground">
                No active volunteers are available yet. Approved volunteers will appear here once their roster status is Active.
              </div>
            ) : (
              <div className="rounded-xl border bg-white divide-y max-h-80 overflow-y-auto">
                {volunteers.map((volunteer) => (
                  <label key={volunteer.id} className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50">
                    <input
                      className={checkboxClass}
                      type="checkbox"
                      checked={selectedVolunteerIds.includes(volunteer.id)}
                      onChange={() => toggleVolunteer(volunteer.id)}
                    />
                    <span>{volunteer.displayName}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {selectedCount > 0 && Number(hours) > 0 && (
            <div className="rounded-xl bg-primary/5 p-4 text-sm">
              <span className="font-semibold">Entry total:</span> {selectedCount} volunteer{selectedCount === 1 ? "" : "s"} × {hours} hour{Number(hours) === 1 ? "" : "s"} = <span className="font-semibold">{totalVolunteerHours} volunteer-hour{totalVolunteerHours === 1 ? "" : "s"}</span>
            </div>
          )}

          <Button type="submit" size="lg" className="w-full" disabled={submitting || volunteers.length === 0}>
            {submitting ? "Recording Hours..." : "Submit Volunteer Hours"}
          </Button>
        </Card>
      </form>
    </div>
  )
}
