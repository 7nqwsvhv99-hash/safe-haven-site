"use client"

import { useRouter } from "next/navigation"
import { useState, type FormEvent, type ReactNode } from "react"

type AnnouncementAction = (formData: FormData) => Promise<void>

export function AnnouncementForm({
  action,
  children,
  submitLabel,
}: {
  action: AnnouncementAction
  children: ReactNode
  submitLabel: string
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState("")

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    if (!form.reportValidity()) return
    setBusy(true)
    setMessage("")
    try {
      await action(new FormData(form))
      setMessage("Announcement saved.")
      router.refresh()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save the announcement. Please try again.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {children}
      {message && <p role="status" aria-live="polite" className="text-sm text-slate-700">{message}</p>}
      <button disabled={busy} className="rounded-full bg-primary px-5 py-2.5 font-semibold text-white disabled:opacity-60">
        {busy ? "Saving…" : submitLabel}
      </button>
    </form>
  )
}
