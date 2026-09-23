"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { AnimalPhotoPreview } from "@/components/animal-photo-preview"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

type Animal = {
  id: string
  name: string
  species: string
  status: string
  sex: string
  age: string
  traits: string[]
  bondedPair: boolean
  primaryPhoto: string
  photos?: string[]
}

export function FeaturedPets() {
  const [animals, setAnimals] = useState<Animal[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState("")

  useEffect(() => {
    let cancelled = false

    async function loadAnimals() {
      try {
        const response = await fetch("/api/animals", { cache: "no-store" })
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || "Could not load animals")
        if (!cancelled) setAnimals(Array.isArray(data.animals) ? data.animals : [])
      } catch (error) {
        if (!cancelled) setLoadError(error instanceof Error ? error.message : "Could not load animals")
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    loadAnimals()
    return () => { cancelled = true }
  }, [])

  const featuredPets = useMemo(() => {
    const available = animals.filter(
      (animal) => animal.status === "Available" && Boolean(animal.primaryPhoto)
    )

    const cats = available.filter((animal) => animal.species === "Cat").slice(0, 3)
    const dogs = available.filter((animal) => animal.species === "Dog").slice(0, 3)
    const selected: Animal[] = []

    for (let index = 0; index < 3; index += 1) {
      if (cats[index]) selected.push(cats[index])
      if (dogs[index]) selected.push(dogs[index])
    }

    if (selected.length < 6) {
      const selectedIds = new Set(selected.map((animal) => animal.id))
      const remaining = available.filter((animal) => !selectedIds.has(animal.id))
      selected.push(...remaining.slice(0, 6 - selected.length))
    }

    return selected.slice(0, 6)
  }, [animals])

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <Card key={index} className="overflow-hidden">
            <div className="aspect-square bg-slate-200 animate-pulse" />
            <CardContent className="p-5 space-y-3">
              <div className="h-6 w-1/2 rounded bg-slate-200 animate-pulse" />
              <div className="h-4 w-1/3 rounded bg-slate-200 animate-pulse" />
              <div className="h-10 w-full rounded bg-slate-200 animate-pulse" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (loadError || featuredPets.length === 0) {
    return (
      <div className="text-center py-8 space-y-4">
        <p className="text-muted-foreground">We couldn’t load featured animals right now.</p>
        <Button asChild variant="outline">
          <Link href="/adopt">View All Adoptable Pets</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {featuredPets.map((pet) => (
        <Card key={pet.id} className="overflow-hidden group flex flex-col">
          <Link href={`/adopt/${pet.id}`} className="block aspect-square overflow-hidden bg-slate-200">
            <AnimalPhotoPreview primaryPhoto={pet.primaryPhoto} photos={pet.photos} name={pet.name} />
          </Link>
          <CardContent className="p-5 space-y-3 flex-1 flex flex-col">
            <div>
              <Link href={`/adopt/${pet.id}`} className="font-bold text-xl hover:text-primary transition-colors">
                {pet.name}
              </Link>
              <p className="text-sm text-muted-foreground">
                {[pet.age, pet.sex].filter(Boolean).join(" • ")}
              </p>
            </div>
            {(pet.bondedPair || pet.traits.length > 0) && (
              <div className="flex flex-wrap gap-2">
                {pet.bondedPair && (
                  <Badge variant="secondary">Bonded Pair</Badge>
                )}
                {pet.traits.slice(0, pet.bondedPair ? 2 : 3).map((trait) => (
                  <Badge key={trait} variant="default">{trait}</Badge>
                ))}
              </div>
            )}
            <Button asChild className="w-full mt-auto">
              <Link href={`/adopt/${pet.id}`}>Meet {pet.name}</Link>
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
