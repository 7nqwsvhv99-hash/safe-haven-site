"use client"

import { useEffect, useState } from "react"
import { Home as HomeIcon, PackageOpen, Syringe } from "lucide-react"

type CommunityImpactData = {
  year: number
  foodPounds: string
  surgeries: number
  adoptions: number
  cats: number
  dogs: number
  veterinarySavingsDisplay: string | null
}

const FALLBACK_2026: CommunityImpactData = {
  year: 2026,
  foodPounds: "16,000+",
  surgeries: 419,
  adoptions: 85,
  cats: 52,
  dogs: 33,
  veterinarySavingsDisplay: "$71,000+",
}

export function CommunityImpact() {
  const [impact, setImpact] = useState<CommunityImpactData>(FALLBACK_2026)

  useEffect(() => {
    let active = true

    async function loadImpact() {
      try {
        const response = await fetch("/api/community-impact", { cache: "no-store" })
        if (!response.ok) return

        const data = (await response.json()) as CommunityImpactData
        if (active) setImpact(data)
      } catch (error) {
        console.error("Unable to load community impact", error)
      }
    }

    loadImpact()

    return () => {
      active = false
    }
  }, [])

  return (
    <section className="section-padding bg-primary/5">
      <div className="container-custom">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-3">
            {impact.year} Community Impact
          </h2>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            Keeping pets fed. Preventing unwanted litters. Helping shelter animals go home.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center space-y-3">
            <div className="flex justify-center">
              <PackageOpen className="h-12 w-12 text-primary" />
            </div>
            <div className="text-4xl md:text-5xl font-bold text-primary">{impact.foodPounds}</div>
            <p className="text-foreground font-semibold">Pounds of Food Distributed</p>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto">
              To families, food pantries, and community cat caregivers.
            </p>
          </div>
          <div className="text-center space-y-3">
            <div className="flex justify-center">
              <Syringe className="h-12 w-12 text-primary" />
            </div>
            <div className="text-4xl md:text-5xl font-bold text-primary">
              {impact.surgeries.toLocaleString()}
            </div>
            <p className="text-foreground font-semibold">Spay &amp; Neuter Surgeries</p>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto">
              Helping prevent unwanted litters and reduce pet overpopulation.
            </p>
            {impact.veterinarySavingsDisplay && (
              <>
                <p className="text-sm font-semibold text-primary">
                  {impact.veterinarySavingsDisplay} estimated veterinary savings
                </p>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
                  Estimated by comparing Safe Haven spay/neuter pricing with published starting prices at a regional full-service veterinary clinic. Individual veterinary costs vary.
                </p>
              </>
            )}
          </div>
          <div className="text-center space-y-3">
            <div className="flex justify-center">
              <HomeIcon className="h-12 w-12 text-primary" />
            </div>
            <div className="text-4xl md:text-5xl font-bold text-primary">
              {impact.adoptions.toLocaleString()}
            </div>
            <p className="text-foreground font-semibold">Animals Adopted Into Homes</p>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto">
              {impact.cats} cats and {impact.dogs} dogs connected with new families in {impact.year}.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
