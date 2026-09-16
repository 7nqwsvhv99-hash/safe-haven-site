"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowLeft, Heart, PawPrint, ShieldCheck } from "lucide-react"

type Animal = {
  id: string
  animalId: string
  name: string
  species: string
  status: string
  sex: string
  dateOfBirth: string
  age: string
  breed: string
  color: string
  weight: number | null
  fee: number | null
  feeStatus: string
  bio: string
  traits: string[]
  goodWithCats: string
  goodWithDogs: string
  goodWithChildren: string
  houseTrained: string
  compatibilityNotes: string
  medicalSummary: string
  adoptionIncludes: string
  housingType: string
  availableSince: string
  bondedPair: boolean
  bondedWith: Array<{ id: string; name: string }>
  primaryPhoto: string
  photos: string[]
}

function feeText(animal: Animal) {
  if (animal.feeStatus === "Waived") return "Adoption fee waived"
  if (animal.feeStatus === "Sponsored") return "Adoption fee sponsored"
  if (animal.feeStatus === "Reduced" && animal.fee !== null) return `Reduced adoption fee: $${animal.fee.toFixed(0)}`
  if (animal.fee !== null) return `Adoption fee: $${animal.fee.toFixed(0)}`
  return ""
}

function statusLabel(status: string) {
  if (status === "Pending") return "Adoption Pending"
  if (status === "Getting Ready for Adoption") return "Getting Ready for Adoption"
  return "Available"
}

function compatibilityLabel(value: string, subject: string) {
  if (!value) return ""
  return `${subject}: ${value}`
}

export default function AnimalProfilePage() {
  const params = useParams<{ id: string }>()
  const animalId = Array.isArray(params?.id) ? params.id[0] : params?.id
  const [animals, setAnimals] = useState<Animal[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState("")
  const [activePhoto, setActivePhoto] = useState(0)

  useEffect(() => {
    let cancelled = false

    async function loadAnimals() {
      try {
        const response = await fetch("/api/animals", { cache: "no-store" })
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || "Could not load animal")
        if (!cancelled) setAnimals(Array.isArray(data.animals) ? data.animals : [])
      } catch (error) {
        if (!cancelled) setLoadError(error instanceof Error ? error.message : "Could not load animal")
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    loadAnimals()
    return () => { cancelled = true }
  }, [])

  const animal = useMemo(() => animals.find((item) => item.id === animalId), [animals, animalId])
  const gallery = animal?.photos?.length ? animal.photos : animal?.primaryPhoto ? [animal.primaryPhoto] : []

  if (isLoading) {
    return <div className="container-custom section-padding text-center text-muted-foreground">Loading animal profile...</div>
  }

  if (loadError || !animal) {
    return (
      <div className="container-custom section-padding max-w-2xl text-center space-y-5">
        <h1 className="text-3xl font-bold">We couldn’t find this animal.</h1>
        <p className="text-muted-foreground">The listing may have changed or may no longer be public.</p>
        <Button asChild><Link href="/adopt">View Available Animals</Link></Button>
      </div>
    )
  }

  const canApply = animal.status === "Available"
  const bondedNames = animal.bondedWith.map((companion) => companion.name).join(" & ")
  const profileFacts = [
    animal.age && { label: "Age", value: animal.age },
    animal.sex && { label: "Sex", value: animal.sex },
    animal.breed && { label: "Breed", value: animal.breed },
    animal.color && { label: "Color", value: animal.color },
    animal.weight !== null && { label: "Weight", value: `${animal.weight} lb` },
    animal.housingType && { label: "Current home", value: animal.housingType === "Foster Home" ? "Foster home" : "Safe Haven shelter" },
  ].filter(Boolean) as Array<{ label: string; value: string }>

  const compatibility = [
    compatibilityLabel(animal.goodWithCats, "Cats"),
    compatibilityLabel(animal.goodWithDogs, "Dogs"),
    compatibilityLabel(animal.goodWithChildren, "Children"),
    animal.houseTrained ? `${animal.species === "Cat" ? "Litter trained" : "House trained"}: ${animal.houseTrained}` : "",
  ].filter(Boolean)

  return (
    <div className="bg-slate-50 min-h-screen">
      <div className="container-custom py-6">
        <Link href="/adopt" className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline">
          <ArrowLeft className="h-4 w-4" /> Back to all animals
        </Link>
      </div>

      <section className="container-custom pb-12 md:pb-16">
        <div className="grid lg:grid-cols-[1.05fr_.95fr] gap-8 lg:gap-12 items-start">
          <div className="space-y-4">
            <div className="rounded-3xl overflow-hidden bg-white border shadow-sm aspect-square flex items-center justify-center">
              {gallery[activePhoto] ? (
                <img
                  src={gallery[activePhoto]}
                  alt={animal.status === "Pending" ? `${animal.name} adoption pending` : animal.name}
                  className={`w-full h-full ${animal.status === "Pending" ? "object-contain" : "object-cover"}`}
                />
              ) : (
                <div className="text-muted-foreground">Photo coming soon</div>
              )}
            </div>

            {gallery.length > 1 && (
              <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
                {gallery.map((photo, index) => (
                  <button
                    key={`${photo}-${index}`}
                    type="button"
                    onClick={() => setActivePhoto(index)}
                    className={`aspect-square rounded-xl overflow-hidden border-2 bg-white ${activePhoto === index ? "border-primary" : "border-transparent"}`}
                    aria-label={`View photo ${index + 1} of ${animal.name}`}
                  >
                    <img src={photo} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2 items-center">
                <Badge variant={animal.status === "Available" ? "default" : "secondary"}>{statusLabel(animal.status)}</Badge>
                {animal.bondedPair && <Badge variant="outline">Bonded Pair</Badge>}
              </div>
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight">Meet {animal.name}</h1>
              {animal.bondedPair && animal.bondedWith.length > 0 && (
                <p className="text-lg font-medium text-primary">
                  Bonded with{" "}
                  {animal.bondedWith.map((companion, index) => (
                    <span key={companion.id}>
                      {index > 0 && " & "}
                      <Link href={`/adopt/${companion.id}`} className="underline-offset-4 hover:underline">
                        {companion.name}
                      </Link>
                    </span>
                  ))}
                </p>
              )}
              {feeText(animal) && <p className="text-xl font-semibold">{feeText(animal)}</p>}
            </div>

            <div className="prose prose-slate max-w-none whitespace-pre-line">
              <p className="text-lg leading-relaxed">{animal.bio}</p>
            </div>

            {animal.traits.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {animal.traits.map((trait) => <Badge key={trait} variant="outline">{trait}</Badge>)}
              </div>
            )}

            <div className="grid sm:grid-cols-2 gap-3">
              {profileFacts.map((fact) => (
                <div key={fact.label} className="rounded-xl border bg-white p-4">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">{fact.label}</div>
                  <div className="font-semibold mt-1">{fact.value}</div>
                </div>
              ))}
            </div>

            {canApply ? (
              <div className="space-y-2">
                <Button asChild size="lg" className="w-full">
                  <Link href={`/adoption-application?animalId=${encodeURIComponent(animal.id)}&animalName=${encodeURIComponent(animal.name)}&species=${encodeURIComponent(animal.species)}`}>Start an Adoption Application for {animal.name}</Link>
                </Button>
                <p className="text-xs text-center text-muted-foreground">Safe Haven requires an approved adoption application before an animal can go home.</p>
              </div>
            ) : (
              <div className="rounded-2xl bg-primary/5 p-5">
                <p className="font-semibold">{statusLabel(animal.status)}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {animal.status === "Pending"
                    ? "An adoption is currently pending for this animal, so we are not accepting additional applications at this time."
                    : "This animal is being prepared for adoption and is not accepting applications yet. Check back soon."}
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="bg-white border-y">
        <div className="container-custom section-padding grid lg:grid-cols-2 gap-8">
          <Card>
            <CardContent className="p-6 md:p-8 space-y-5">
              <div className="flex items-center gap-3">
                <Heart className="h-6 w-6 text-primary" />
                <h2 className="text-2xl font-bold">Home & Compatibility</h2>
              </div>
              {compatibility.length > 0 && (
                <div className="space-y-3">
                  {compatibility.map((item) => (
                    <div key={item} className="flex items-start gap-3">
                      <PawPrint className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              )}
              {animal.compatibilityNotes && <p className="text-muted-foreground whitespace-pre-line">{animal.compatibilityNotes}</p>}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 md:p-8 space-y-5">
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-6 w-6 text-primary" />
                <h2 className="text-2xl font-bold">Adoption Details</h2>
              </div>
              {animal.adoptionIncludes && (
                <div>
                  <h3 className="font-semibold mb-1">Adoption includes</h3>
                  <p className="text-muted-foreground whitespace-pre-line">{animal.adoptionIncludes}</p>
                </div>
              )}
              {animal.medicalSummary && (
                <div>
                  <h3 className="font-semibold mb-1">Medical information</h3>
                  <p className="text-muted-foreground whitespace-pre-line">{animal.medicalSummary}</p>
                </div>
              )}
              {!animal.adoptionIncludes && !animal.medicalSummary && (
                <p className="text-muted-foreground">Safe Haven will review current medical and adoption information with approved adopters.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      {animal.bondedWith.length > 0 && (
        <section className="container-custom section-padding">
          <div className="max-w-3xl mx-auto text-center space-y-4">
            <h2 className="text-3xl font-bold">A Bonded Companion</h2>
            <p className="text-muted-foreground">{animal.name} is part of a bonded pair and should be adopted with {bondedNames}.</p>
            <div className="flex flex-wrap justify-center gap-3">
              {animal.bondedWith.map((companion) => (
                <Button key={companion.id} asChild variant="outline"><Link href={`/adopt/${companion.id}`}>Meet {companion.name}</Link></Button>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
