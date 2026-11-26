"use client"

import { useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import type { ReactNode } from "react"

export type StoryAnimalOption = {
  id: string
  name: string
  animalId: string
  species: string
  sex: string
  breed: string
  color: string
}

type StoryAction = (formData: FormData) => Promise<void>

function relationshipDefault(value: string) {
  return /family/i.test(value) ? "Adoptive family" : "Adopter"
}

function AnimalPicker({
  animals,
  initialAnimalId = "",
  initialLegacyName = "",
  existingStoryAnimalIds = [],
}: {
  animals: StoryAnimalOption[]
  initialAnimalId?: string
  initialLegacyName?: string
  existingStoryAnimalIds?: string[]
}) {
  const initialAnimal = animals.find((animal) => animal.id === initialAnimalId)
  const [query, setQuery] = useState(initialAnimal?.name || "")
  const [selectedId, setSelectedId] = useState(initialAnimal?.id || "")
  const [legacy, setLegacy] = useState(Boolean(initialLegacyName) && !initialAnimal)
  const [legacyName, setLegacyName] = useState(initialLegacyName)
  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle || selectedId) return []
    return animals.filter((animal) => animal.name.toLowerCase().includes(needle)).slice(0, 12)
  }, [animals, query, selectedId])

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium" htmlFor="story-animal-search">Animal</label>
      <input type="hidden" name="animalId" value={legacy ? "" : selectedId} />
      {!legacy ? (
        <>
          <input
            id="story-animal-search"
            name="animalSearch"
            value={query}
            onChange={(event) => { setQuery(event.target.value); setSelectedId("") }}
            autoComplete="off"
            placeholder="Search by animal name"
            className="w-full rounded-xl border bg-white px-3 py-2.5"
            aria-describedby="story-animal-help"
          />
          {matches.length > 0 && (
            <ul className="max-h-56 overflow-y-auto rounded-xl border bg-white shadow-sm" aria-label="Matching animals">
              {matches.map((animal) => {
                const duplicate = animals.filter((item) => item.name.toLowerCase() === animal.name.toLowerCase()).length > 1
                const details = [animal.species, animal.sex, animal.breed, animal.color].filter(Boolean).join(" · ")
                return (
                  <li key={animal.id}>
                    <button type="button" onClick={() => { setSelectedId(animal.id); setQuery(animal.name) }} className="w-full px-3 py-2 text-left hover:bg-slate-50">
                      <span className="block font-medium">{animal.name}</span>
                      <span className="block text-xs text-slate-600">{details || "Animal details unavailable"}{duplicate && animal.animalId ? ` · ID ${animal.animalId}` : ""}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
          <p id="story-animal-help" className="text-xs text-muted-foreground">Search by name, then select the matching animal. Duplicate names include distinguishing details.</p>
          {selectedId && <p className="text-sm text-emerald-800" role="status">Animal linked to this story.</p>}
      {selectedId && existingStoryAnimalIds.includes(selectedId) && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">A story is already linked to this animal. You can still add another story if it is a separate family update.</p>}
        </>
      ) : (
        <>
          <input name="legacyAnimalName" value={legacyName} onChange={(event) => setLegacyName(event.target.value)} required placeholder="Animal name shown with the story" className="w-full rounded-xl border bg-white px-3 py-2.5" />
          <p className="text-xs text-muted-foreground">For a historical story without an animal record. No animal or adoption record will be created.</p>
        </>
      )}
      <label className="flex items-start gap-2 text-sm">
        <input name="legacyStory" type="checkbox" checked={legacy} onChange={(event) => { setLegacy(event.target.checked); setSelectedId(""); setQuery("") }} className="mt-1" />
        This is a legacy story without an animal record
      </label>
    </div>
  )
}

async function optimizePhoto(file: File) {
  if (!file.type.startsWith("image/")) throw new Error("Choose an image file.")
  if (file.size > 25 * 1024 * 1024) throw new Error("This photo is larger than 25 MB. Choose a smaller image.")
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, 1200 / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement("canvas")
  canvas.width = Math.max(1, Math.round(bitmap.width * scale))
  canvas.height = Math.max(1, Math.round(bitmap.height * scale))
  const context = canvas.getContext("2d")
  if (!context) throw new Error("This photo could not be prepared for upload.")
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()

  let output: Blob | null = null
  for (const quality of [0.84, 0.72, 0.6, 0.48, 0.38]) {
    output = await new Promise((resolve) => canvas.toBlob(resolve, "image/webp", quality))
    if (output && output.size <= 200 * 1024) break
  }
  if (!output) throw new Error("This browser could not prepare the photo for upload.")
  const basename = file.name.replace(/\.[^.]+$/, "") || "adoption-story"
  return new File([output], `${basename}.webp`, { type: "image/webp", lastModified: file.lastModified })
}

export function AdoptionStoryForm({
  animals,
  action,
  initialDate,
  existingStoryAnimalIds,
}: {
  animals: StoryAnimalOption[]
  action: StoryAction
  initialDate: string
  existingStoryAnimalIds: string[]
}) {
  const formRef = useRef<HTMLFormElement>(null)
  const router = useRouter()
  const [pickerResetKey, setPickerResetKey] = useState(0)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState("")

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    if (!form.reportValidity()) return
    setBusy(true)
    setMessage("")
    try {
      const data = new FormData(form)
      const photo = data.get("photo")
      if (photo instanceof File && photo.size > 0) data.set("photo", await optimizePhoto(photo))
      await action(data)
      form.reset()
      setPickerResetKey((key) => key + 1)
      setMessage("Story published successfully.")
      router.refresh()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The story could not be saved. Please try again.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <form ref={formRef} onSubmit={submit} className="mx-auto mt-5 max-w-5xl space-y-4 rounded-2xl bg-slate-50 p-5 md:p-6">
      <h3 className="font-bold">Add Story</h3>
      <AnimalPicker key={pickerResetKey} animals={animals} existingStoryAnimalIds={existingStoryAnimalIds} />
      <label className="block text-sm font-medium">Story / testimonial<textarea name="quote" rows={5} required placeholder="Approved testimonial text" className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5" /></label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium">Person / family name <span className="font-normal text-slate-500">(optional)</span><input name="personName" placeholder="Sarah, The Miller Family, or leave blank for anonymity" className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5 placeholder:text-slate-400" /></label>
        <label className="block text-sm font-medium">Relationship<select name="relationshipLabel" defaultValue="Adopter" required className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5"><option>Adopter</option><option>Adoptive family</option></select></label>
        <label className="block text-sm font-medium">Date received<input name="receivedDate" type="date" defaultValue={initialDate} required className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5" /></label>
        <label className="block text-sm font-medium">Animal photo<input name="photo" type="file" accept="image/*" required className="mt-2 block w-full text-sm" /><span className="mt-1 block text-xs font-normal text-muted-foreground">Large phone photos are resized and compressed for the website.</span></label>
      </div>
      <label className="flex items-start gap-2 rounded-xl border border-orange-200 bg-white p-4 text-sm leading-6">
        <input name="consentConfirmed" type="checkbox" required className="mt-1" />
        <span>By adding this story, you confirm that the adopter has given Safe Haven permission to share the story and photograph publicly.</span>
      </label>
      {message && <p role="status" aria-live="polite" className="text-sm text-slate-700">{message}</p>}
      <button disabled={busy} className="rounded-full bg-primary px-6 py-3 font-semibold text-white disabled:opacity-60">{busy ? "Publishing…" : "Add Story"}</button>
    </form>
  )
}

export function StoryAnimalPicker(props: {
  animals: StoryAnimalOption[]
  initialAnimalId?: string
  initialLegacyName?: string
  existingStoryAnimalIds?: string[]
}) {
  return <AnimalPicker {...props} />
}

export function OptimizedStoryForm({
  action,
  children,
  className,
  submitLabel,
}: {
  action: StoryAction
  children: ReactNode
  className: string
  submitLabel: string
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState("")

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    if (!form.reportValidity()) return
    setBusy(true)
    setMessage("")
    try {
      const data = new FormData(form)
      const photo = data.get("photo")
      if (photo instanceof File && photo.size > 0) data.set("photo", await optimizePhoto(photo))
      await action(data)
      setMessage("Story saved.")
      router.refresh()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The story could not be saved. Please try again.")
    } finally {
      setBusy(false)
    }
  }

  return <form onSubmit={submit} className={className}>{children}{message&&<p role="status" aria-live="polite" className="text-sm text-slate-700">{message}</p>}<button disabled={busy} className="w-fit rounded-full border border-primary px-4 py-2 text-sm font-semibold text-primary disabled:opacity-60">{busy?"Saving…":submitLabel}</button></form>
}

export { relationshipDefault }
