"use client"

import { useState, useTransition, type FormEvent, type ReactNode } from "react"
import { useId } from "react"
import { cancelHoursException, saveHoursException, saveWeeklyHours, type HoursActionState } from "./hours-actions"

const weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
type Interval = { start: string; end: string }
type Weekly = { days: Record<string, Interval[]> }
type Exception = {
  id: string; name: string; type: string; startDate: string; endDate: string; mode: string;
  intervals: Interval[]; status: string; message: string; lastEditedBy: string; lastEditedAt: string;
}
type Action = (previous: HoursActionState, form: FormData) => Promise<HoursActionState>

function intervalText(intervals: Interval[]) { return intervals.map((item) => `${item.start}-${item.end}`).join(", ") }
function fmtDate(value: string) {
  if (!value) return "Date not set"
  return new Intl.DateTimeFormat("en-US", { timeZone: "America/Chicago", month: "short", day: "numeric", year: "numeric" }).format(new Date(`${value}T12:00:00Z`))
}
function visibleStatus(item: Exception) {
  if (item.status === "Published" && item.startDate > new Intl.DateTimeFormat("en-CA", { timeZone: "America/Chicago" }).format(new Date())) return "Scheduled"
  return item.status
}

function ActionForm({ action, submitLabel, children, className = "" }: { action: Action; submitLabel: string; children: ReactNode; className?: string }) {
  const [state, setState] = useState<HoursActionState>({ status: "idle", message: "" })
  const [pending, startTransition] = useTransition()
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setState({ status: "idle", message: "Saving…" })
    startTransition(async () => {
      const result = await action({ status: "idle", message: "" }, form)
      setState(result)
    })
  }
  return <form onSubmit={submit} className={className}>
    {children}
    <div className="mt-4 flex flex-wrap items-center gap-3">
      <button disabled={pending} className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60">{pending ? "Saving…" : submitLabel}</button>
      {state.message && <p aria-live="polite" className={`text-sm ${state.status === "error" ? "text-red-700" : "text-emerald-700"}`}>{state.message}</p>}
    </div>
  </form>
}

function ExceptionFields({ item, newKey }: { item?: Exception; newKey?: string }) {
  const publicationHelpId = useId()
  return <>
    {item ? <input type="hidden" name="exceptionId" value={item.id} /> : <input type="hidden" name="submissionKey" value={newKey} />}
    <div className="grid gap-4 md:grid-cols-2">
      <label className="text-sm font-medium">Exception name<input required maxLength={120} name="name" defaultValue={item?.name || ""} placeholder="Thanksgiving hours" className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5" /></label>
      <label className="text-sm font-medium">Type<select name="type" defaultValue={item?.type || "Holiday Schedule"} className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5">{["Holiday Schedule", "Holiday Closure", "Weather Closure", "Delayed Opening", "Special Hours"].map((type) => <option key={type}>{type}</option>)}</select></label>
      <label className="text-sm font-medium">Start date<input required type="date" name="startDate" defaultValue={item?.startDate || ""} className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5" /></label>
      <label className="text-sm font-medium">End date<input required type="date" name="endDate" defaultValue={item?.endDate || item?.startDate || ""} className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5" /></label>
      <label className="text-sm font-medium">Hours for these dates<select name="mode" defaultValue={item?.mode || "Closed"} className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5"><option value="Closed">Closed</option><option value="Replace">Replace regular hours</option></select></label>
      <label className="text-sm font-medium">When should this appear?<select name="status" aria-describedby={publicationHelpId} defaultValue={item?.status === "Published" ? "Published" : "Draft"} className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5"><option value="Draft">Keep as a draft (staff only)</option><option value="Published">Publish now or on the start date</option></select><span id={publicationHelpId} className="mt-1 block text-xs font-normal text-muted-foreground">Drafts and their notices stay private. Publishing shows the exception in upcoming public hours. The hours change and linked announcement begin on the start date; if that date is today or earlier, they take effect now. They end after the end date.</span></label>
      <label className="text-sm font-medium md:col-span-2">Replacement opening intervals <span className="font-normal text-slate-500">(only for “Replace”; Central Time)</span><input name="intervals" defaultValue={intervalText(item?.intervals || [])} placeholder="12:00-15:00, 16:00-18:00" className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5" /><span className="mt-1 block text-xs font-normal text-muted-foreground">Use 24-hour HH:mm-HH:mm intervals separated by commas. Every day in a date range uses these intervals.</span></label>
      <label className="text-sm font-medium md:col-span-2">Public notice<textarea required maxLength={1000} rows={3} name="message" defaultValue={item?.message || ""} placeholder="The shelter will be closed for the holiday." className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5" /></label>
    </div>
  </>
}

function NewExceptionForm() {
  const id = useId().replaceAll(":", "")
  return <details className="rounded-2xl border bg-slate-50 p-5">
    <summary className="cursor-pointer font-semibold text-primary">+ Add an hours exception</summary>
    <div className="mt-4"><ActionForm action={saveHoursException} submitLabel="Save hours exception"><ExceptionFields newKey={`public-hours-${id}`} /></ActionForm></div>
  </details>
}

function ExistingException({ item }: { item: Exception }) {
  return <details className="rounded-2xl border p-5">
    <summary className="flex cursor-pointer list-none flex-wrap items-start justify-between gap-3">
      <span><strong className="block">{item.name}</strong><span className="mt-1 block text-sm text-muted-foreground">{item.type} · {fmtDate(item.startDate)}{item.endDate !== item.startDate ? ` through ${fmtDate(item.endDate)}` : ""}</span></span>
      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold">{visibleStatus(item)}</span>
    </summary>
    <div className="mt-5 space-y-4 border-t pt-5">
      <ActionForm action={saveHoursException} submitLabel="Save exception changes"><ExceptionFields item={item} /></ActionForm>
      {item.status !== "Cancelled" && <ActionForm action={cancelHoursException} submitLabel="Cancel exception" className="border-t pt-4"><input type="hidden" name="exceptionId" value={item.id} /><p className="text-sm text-muted-foreground">Canceling removes the matching public notice and restores the regular weekly schedule for these dates.</p></ActionForm>}
      {item.lastEditedAt && <p className="text-xs text-muted-foreground">Last edited {item.lastEditedAt}{item.lastEditedBy ? ` by ${item.lastEditedBy}` : ""}</p>}
    </div>
  </details>
}

export function ShelterHoursSection({ weekly, scheduleId, exceptions }: { weekly: Weekly; scheduleId: string; exceptions: Exception[] }) {
  return <details name="public-content" className="rounded-3xl border bg-white p-6 shadow-sm md:p-8">
    <summary className="flex cursor-pointer list-none items-center gap-4"><span aria-hidden="true" className="text-2xl text-primary">◷</span><span className="flex-1"><span className="block text-2xl font-bold">Shelter Hours</span><span className="block text-sm text-muted-foreground">Weekly schedule · {exceptions.filter((item) => item.status === "Published").length} published or scheduled exceptions · {exceptions.filter((item) => item.status === "Draft").length} drafts</span></span><span aria-hidden="true">⌄</span></summary>
    <div className="mt-5 space-y-5">
      <section className="rounded-2xl bg-slate-50 p-5">
        <h3 className="text-lg font-bold">Regular weekly hours</h3>
        <p className="mt-1 text-sm text-muted-foreground">All times use Central Time. Separate intervals with commas. Leave a day closed using its checkbox.</p>
        <ActionForm action={saveWeeklyHours} submitLabel="Save weekly hours" className="mt-4">
          {scheduleId && <input type="hidden" name="scheduleId" value={scheduleId} />}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {weekdays.map((day) => {
              const intervals = weekly.days[day] || []
              const closed = intervals.length === 0
              return <div key={day} className="rounded-xl border bg-white p-4">
                <label className="font-semibold">{day}</label>
                <label className="mt-2 flex items-center gap-2 text-sm"><input name={`closed-${day}`} type="checkbox" defaultChecked={closed} /> Closed</label>
                <input name={`hours-${day}`} defaultValue={intervalText(intervals)} placeholder="10:00-15:00" aria-label={`${day} opening intervals`} className="mt-2 w-full rounded-lg border px-3 py-2 text-sm" />
              </div>
            })}
          </div>
        </ActionForm>
      </section>
      <section className="space-y-4">
        <div><h3 className="text-lg font-bold">Temporary schedule changes</h3><p className="text-sm text-muted-foreground">Published exceptions override regular hours for their dates, then end automatically. Overlapping published ranges are blocked.</p></div>
        <NewExceptionForm />
        {exceptions.map((item) => <ExistingException key={item.id} item={item} />)}
        {exceptions.length === 0 && <p className="rounded-xl bg-slate-50 p-4 text-sm text-muted-foreground">No temporary hours exceptions have been created.</p>}
      </section>
    </div>
  </details>
}
