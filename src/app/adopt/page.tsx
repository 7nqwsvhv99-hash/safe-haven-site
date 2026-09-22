"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Filter, Search } from "lucide-react"

type FilterType = "all" | "dogs" | "cats"

type Animal = {
  id: string
  animalId: string
  name: string
  species: "Cat" | "Dog" | string
  status: "Available" | "Pending" | "Getting Ready for Adoption" | string
  sex: string
  age: string
  breed: string
  fee: number | null
  feeStatus: "Standard" | "Reduced" | "Waived" | "Sponsored" | string
  bio: string
  traits: string[]
  bondedPair: boolean
  bondedWith: Array<{ id: string; name: string }>
  primaryPhoto: string
}

function feeText(animal: Animal) {
  if (animal.feeStatus === "Waived") return "Adoption fee waived"
  if (animal.feeStatus === "Sponsored") return "Adoption fee sponsored"
  if (animal.feeStatus === "Reduced" && animal.fee !== null) return `Reduced adoption fee: $${animal.fee.toFixed(0)}`
  if (animal.fee !== null) return `Adoption fee: $${animal.fee.toFixed(0)}`
  return ""
}

function statusLabel(status: string) {
  if (status === "Getting Ready for Adoption") return "Getting Ready for Adoption"
  if (status === "Pending") return "Adoption Pending"
  return "Available"
}

export default function AdoptPage() {
  const [filter, setFilter] = useState<FilterType>("all")
  const [searchQuery, setSearchQuery] = useState("")
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

  const filteredPets = useMemo(() => {
    return animals.filter((pet) => {
      if (filter === "dogs" && pet.species !== "Dog") return false
      if (filter === "cats" && pet.species !== "Cat") return false

      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        return (
          pet.name.toLowerCase().includes(query) ||
          pet.breed.toLowerCase().includes(query) ||
          pet.bio.toLowerCase().includes(query) ||
          pet.traits.some((trait) => trait.toLowerCase().includes(query))
        )
      }

      return true
    })
  }, [animals, filter, searchQuery])

  const dogCount = animals.filter((pet) => pet.species === "Dog").length
  const catCount = animals.filter((pet) => pet.species === "Cat").length

  return (
    <div className="flex flex-col">
      <section className="hero-gradient">
        <div className="container-custom py-10 md:py-12 lg:py-14">
          <div className="max-w-5xl mx-auto text-center space-y-6">
            <p className="text-sm md:text-base font-semibold uppercase tracking-[0.18em] text-primary">
              Adoption
            </p>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight">Meet Your New Best Friend</h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
              Every adoption begins with a connection. Yours could be waiting here.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-white border-b px-4 pt-7 pb-5 md:px-6 md:pt-8 md:pb-6">
        <div className="container-custom">
          <div className="space-y-4">
            <div className="relative max-w-2xl">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search by name, breed, or personality..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12"
              />
            </div>

            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="flex items-center gap-2">
                <Filter className="h-5 w-5 text-muted-foreground" />
                <span className="font-semibold">Filter by type:</span>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button variant={filter === "all" ? "default" : "outline"} onClick={() => setFilter("all")}>All Pets ({animals.length})</Button>
                <Button variant={filter === "dogs" ? "default" : "outline"} onClick={() => setFilter("dogs")}>Dogs ({dogCount})</Button>
                <Button variant={filter === "cats" ? "default" : "outline"} onClick={() => setFilter("cats")}>Cats ({catCount})</Button>
              </div>
            </div>

            {(searchQuery || filter !== "all") && !isLoading && (
              <p className="text-sm text-muted-foreground">
                Showing {filteredPets.length} {filteredPets.length === 1 ? "pet" : "pets"}
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="bg-slate-50 min-h-[420px] px-4 pt-6 pb-12 md:px-6 md:pt-8 md:pb-16 lg:pb-20">
        <div className="container-custom">
          {isLoading && <p className="text-center text-muted-foreground py-12">Loading Safe Haven animals...</p>}

          {loadError && (
            <div className="max-w-xl mx-auto text-center py-12 space-y-3">
              <h2 className="text-2xl font-bold">We couldn’t load the animals right now.</h2>
              <p className="text-muted-foreground">Please refresh the page or try again shortly.</p>
            </div>
          )}

          {!isLoading && !loadError && filteredPets.length === 0 && (
            <div className="max-w-xl mx-auto text-center py-12 space-y-3">
              <h2 className="text-2xl font-bold">No matches found</h2>
              <p className="text-muted-foreground">Try a different search or filter.</p>
            </div>
          )}

          {!isLoading && !loadError && filteredPets.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPets.map((pet) => {
                const canApply = pet.status === "Available"
                const bondedNames = pet.bondedWith.map((companion) => companion.name).join(" & ")

                return (
                  <Card key={pet.id} className="overflow-hidden group flex flex-col">
                    <Link href={`/adopt/${pet.id}`} className="block aspect-square overflow-hidden bg-slate-100">
                      {pet.primaryPhoto ? (
                        <img
                          src={pet.primaryPhoto}
                          alt={pet.status === "Pending" ? `${pet.name} adoption pending` : pet.name}
                          className={`w-full h-full transition-transform duration-300 ${pet.status === "Pending" ? "object-contain" : "object-cover group-hover:scale-105"}`}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground">Photo coming soon</div>
                      )}
                    </Link>

                    <CardContent className="p-5 space-y-4 flex-1 flex flex-col">
                      <div className="space-y-2">
                        <div className="flex flex-wrap gap-2 items-center justify-between">
                          <Link href={`/adopt/${pet.id}`} className="font-bold text-xl hover:text-primary transition-colors">{pet.name}</Link>
                          <Badge variant={pet.status === "Available" ? "default" : "secondary"}>{statusLabel(pet.status)}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {[pet.age, pet.sex, pet.breed].filter(Boolean).join(" • ")}
                        </p>
                        {pet.bondedPair && bondedNames && (
                          <p className="text-sm font-medium text-primary">Bonded with {bondedNames}</p>
                        )}
                      </div>

                      <p className="text-sm line-clamp-3">{pet.bio}</p>

                      {pet.traits.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {pet.traits.slice(0, 4).map((trait) => <Badge key={trait} variant="outline">{trait}</Badge>)}
                        </div>
                      )}

                      <div className="mt-auto pt-2 space-y-3">
                        {feeText(pet) && <p className="font-semibold text-sm">{feeText(pet)}</p>}
                        <Button asChild variant="outline" className="w-full">
                          <Link href={`/adopt/${pet.id}`}>Meet {pet.name}</Link>
                        </Button>
                        {canApply ? (
                          <Button asChild className="w-full">
                            <Link href={`/adoption-application?animalId=${encodeURIComponent(pet.id)}&animalName=${encodeURIComponent(pet.name)}&species=${encodeURIComponent(pet.species)}`}>Start an Adoption Application</Link>
                          </Button>
                        ) : (
                          <p className="text-xs text-center text-muted-foreground">
                            {pet.status === "Pending" ? "An adoption is currently pending for this animal." : "This animal is getting ready for adoption and is not accepting applications yet."}
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      </section>

      <section className="section-padding bg-white">
        <div className="container-custom max-w-6xl">
          <div className="mx-auto max-w-3xl text-center">
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-primary">
              Your next step
            </p>
            <h2 className="text-3xl md:text-4xl font-bold">Ready to Adopt?</h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Start with an application. We&apos;ll help you move from interest to the right match.
            </p>
          </div>

          <div className="relative mt-12 grid grid-cols-1 gap-8 md:grid-cols-4">
            <div className="absolute left-[12.5%] right-[12.5%] top-5 hidden h-px bg-primary/20 md:block" aria-hidden="true" />
            {[
              ["1", "Apply", "Tell us about your home, lifestyle, and what you’re looking for."],
              ["2", "Review", "We’ll review your application, contact your references, and follow up if we need more information."],
              ["3", "Meet & Match", "Meet animals who may be a good fit for your household and needs."],
              ["4", "Adopt", "Once you’re approved and have found the right match, complete the adoption and welcome your new companion home."],
            ].map(([number, title, description]) => (
              <div key={number} className="relative text-center md:text-left">
                <div className="relative z-10 mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-primary font-bold text-white md:mx-0">
                  {number}
                </div>
                <h3 className="mt-4 font-bold text-lg">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
              </div>
            ))}
          </div>

          <div className="mt-12 grid grid-cols-1 gap-6 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="rounded-2xl bg-primary/5 p-6 md:p-7">
              <h3 className="text-xl font-bold">Before you visit</h3>
              <p className="mt-3 leading-relaxed text-muted-foreground">
                <strong className="text-foreground">We recommend applying before your visit for the smoothest adoption experience.</strong>{" "}
                You&apos;re welcome to meet our animals before applying, but an approved application is required before an adoption can be completed.
              </p>
            </div>
            <div className="rounded-2xl border p-6 md:p-7">
              <h3 className="text-xl font-bold">What&apos;s included</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Animals are spayed or neutered before going home and receive age-appropriate vaccinations. If an animal is too young for a required vaccine, adopters can return to Safe Haven&apos;s clinic for rabies and FVRCP/DAPP when due.
              </p>
            </div>
          </div>

          <div className="mt-10 text-center">
            <Button asChild size="lg">
              <Link href="/adoption-application">Start a General Adoption Application</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}
