"use client"

import { useEffect, useMemo, useRef, useState } from "react"

type AnimalPhotoPreviewProps = {
  primaryPhoto: string
  photos?: string[]
  name: string
  pending?: boolean
}

export function AnimalPhotoPreview({ primaryPhoto, photos, name, pending = false }: AnimalPhotoPreviewProps) {
  const gallery = useMemo(
    () => Array.from(new Set([primaryPhoto, ...(pending ? [] : photos || [])].filter(Boolean))),
    [primaryPhoto, photos, pending]
  )
  const [hovered, setHovered] = useState(false)
  const [requested, setRequested] = useState(false)
  const [active, setActive] = useState(0)
  const [reducedMotion, setReducedMotion] = useState(true)
  const loaded = useRef(new Set<string>())

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)")
    const update = () => setReducedMotion(media.matches)
    update()
    media.addEventListener("change", update)
    return () => media.removeEventListener("change", update)
  }, [])

  useEffect(() => {
    setActive(0)
    if (!hovered || reducedMotion || gallery.length < 2) return
    setRequested(true)
    const timer = window.setInterval(() => {
      if (document.hidden) return
      setActive((current) => {
        // Only reveal successfully loaded images, skipping slow or broken photos.
        for (let step = 1; step < gallery.length; step++) {
          const next = (current + step) % gallery.length
          if (loaded.current.has(gallery[next])) return next
        }
        return current
      })
    }, 2200)
    return () => window.clearInterval(timer)
  }, [hovered, reducedMotion, gallery])

  return (
    <div
      className="relative w-full h-full overflow-hidden"
      onPointerEnter={(event) => {
        if (event.pointerType === "mouse" || event.pointerType === "pen") setHovered(true)
      }}
      onPointerLeave={() => setHovered(false)}
      onPointerCancel={() => setHovered(false)}
    >
      {gallery.map((photo, index) => (index === 0 || requested) && (
        <img
          key={photo}
          src={photo}
          alt={index === 0 ? (pending ? `${name} adoption pending` : name) : ""}
          aria-hidden={index > 0 ? true : undefined}
          onLoad={() => loaded.current.add(photo)}
          draggable={false}
          className={`absolute inset-0 w-full h-full transition-opacity duration-500 ease-in-out motion-reduce:transition-none ${pending ? "object-contain" : "object-cover"} ${index === 0 || (hovered && !reducedMotion && index === active) ? "opacity-100" : "opacity-0"}`}
        />
      ))}
    </div>
  )
}
