"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AdoptionForm } from "@/components/adoption-form"
import { Filter, Search } from "lucide-react"

type FilterType = "all" | "dogs" | "cats" | "other"

export default function AdoptPage() {
  const [filter, setFilter] = useState<FilterType>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedPet, setSelectedPet] = useState<string | null>(null)
  const [showApplicationForm, setShowApplicationForm] = useState(false)

  const filteredPets = allPets.filter((pet) => {
    // Filter by type
    if (filter !== "all" && pet.type !== filter) return false

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        pet.name.toLowerCase().includes(query) ||
        pet.breed.toLowerCase().includes(query) ||
        pet.description.toLowerCase().includes(query) ||
        pet.traits.some(trait => trait.toLowerCase().includes(query))
      )
    }

    return true
  })

  const handleAdoptClick = (petName: string) => {
    setSelectedPet(petName)
    setShowApplicationForm(true)
  }

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="hero-gradient">
        <div className="container-custom section-padding">
          <div className="max-w-3xl mx-auto text-center space-y-4">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
              Meet Your New Best Friend
            </h1>
            <p className="text-lg text-muted-foreground">
              All of our pets are spayed/neutered, vaccinated, and ready for their forever homes.
            </p>
          </div>
        </div>
      </section>

      {/* Filter Section */}
      <section className="section-padding bg-white border-b">
        <div className="container-custom">
          <div className="space-y-4">
            {/* Search Bar */}
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

            {/* Filter Buttons */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="flex items-center gap-2">
                <Filter className="h-5 w-5 text-muted-foreground" />
                <span className="font-semibold">Filter by type:</span>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button
                  variant={filter === "all" ? "default" : "outline"}
                  onClick={() => setFilter("all")}
                >
                  All Pets ({allPets.length})
                </Button>
                <Button
                  variant={filter === "dogs" ? "default" : "outline"}
                  onClick={() => setFilter("dogs")}
                >
                  Dogs ({allPets.filter(p => p.type === "dogs").length})
                </Button>
                <Button
                  variant={filter === "cats" ? "default" : "outline"}
                  onClick={() => setFilter("cats")}
                >
                  Cats ({allPets.filter(p => p.type === "cats").length})
                </Button>
                <Button
                  variant={filter === "other" ? "default" : "outline"}
                  onClick={() => setFilter("other")}
                >
                  Other Pets (0)
                </Button>
              </div>
            </div>

            {/* Results Count */}
            {(searchQuery || filter !== "all") && (
              <p className="text-sm text-muted-foreground">
                Showing {filteredPets.length} {filteredPets.length === 1 ? "pet" : "pets"}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Pets Grid */}
      <section className="section-padding bg-slate-50">
        <div className="container-custom">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPets.map((pet) => (
              <Card key={pet.id} className="overflow-hidden group">
                <div className="aspect-square overflow-hidden bg-slate-200">
                  <img
                    src={pet.image}
                    alt={pet.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <CardContent className="p-5 space-y-4">
                  <div>
                    <h3 className="font-bold text-xl">{pet.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {pet.age} • {pet.gender} • {pet.breed}
                    </p>
                  </div>
                  <p className="text-sm line-clamp-2">{pet.description}</p>
                  <div className="flex flex-wrap gap-2">
                    {pet.traits.map((trait) => (
                      <Badge key={trait} variant="default">
                        {trait}
                      </Badge>
                    ))}
                  </div>
                  <div className="pt-2 space-y-2">
                    <Button className="w-full" onClick={() => handleAdoptClick(pet.name)}>
                      Apply to Adopt {pet.name}
                    </Button>
                    <p className="text-xs text-center text-muted-foreground">
                      Quick and easy application process
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Application Info */}
      <section className="section-padding bg-white">
        <div className="container-custom max-w-3xl">
          <div className="text-center space-y-6">
            <h2 className="text-3xl md:text-4xl font-bold">
              Ready to Adopt?
            </h2>
            <p className="text-muted-foreground">
              Our adoption process is straightforward and supportive. We're here to help you find the perfect match.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left pt-6">
              <div className="space-y-2">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                  1
                </div>
                <h3 className="font-semibold">Fill Out Application</h3>
                <p className="text-sm text-muted-foreground">
                  Tell us about your home, lifestyle, and what you're looking for.
                </p>
              </div>
              <div className="space-y-2">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                  2
                </div>
                <h3 className="font-semibold">Meet & Greet</h3>
                <p className="text-sm text-muted-foreground">
                  Visit the shelter to spend time with your potential new friend.
                </p>
              </div>
              <div className="space-y-2">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                  3
                </div>
                <h3 className="font-semibold">Take Them Home</h3>
                <p className="text-sm text-muted-foreground">
                  Complete the adoption and start your journey together!
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Adoption Application Modal */}
      <Dialog open={showApplicationForm} onOpenChange={setShowApplicationForm}>
        <DialogContent>
          <DialogHeader onClose={() => setShowApplicationForm(false)}>
            <DialogTitle>Adoption Application</DialogTitle>
          </DialogHeader>
          <AdoptionForm
            petName={selectedPet || ""}
            onClose={() => setShowApplicationForm(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}

const allPets = [
  {
    id: 1,
    name: "Luna",
    type: "cats" as const,
    age: "2 years",
    gender: "Female",
    breed: "Tabby Mix",
    image: "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=800&h=800&fit=crop",
    traits: ["Playful", "Good with kids", "House trained"],
    description: "Luna is a sweet and energetic cat who loves to play and cuddle. She's great with children and other cats.",
  },
  {
    id: 2,
    name: "Max",
    type: "dogs" as const,
    age: "3 years",
    gender: "Male",
    breed: "Labrador Mix",
    image: "https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=800&h=800&fit=crop",
    traits: ["Friendly", "Loves walks", "Loyal"],
    description: "Max is a loyal companion who loves long walks and playing fetch. He's well-trained and great with families.",
  },
  {
    id: 3,
    name: "Whiskers",
    type: "cats" as const,
    age: "1 year",
    gender: "Male",
    breed: "Orange Tabby",
    image: "https://images.unsplash.com/photo-1574158622682-e40e69881006?w=800&h=800&fit=crop",
    traits: ["Cuddly", "Quiet", "Independent"],
    description: "Whiskers is a gentle soul who enjoys quiet companionship and sunny windowsills.",
  },
  {
    id: 4,
    name: "Bella",
    type: "dogs" as const,
    age: "4 years",
    gender: "Female",
    breed: "Beagle Mix",
    image: "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=800&h=800&fit=crop",
    traits: ["Gentle", "Good with pets", "Calm"],
    description: "Bella is calm and affectionate, perfect for a relaxed household. She gets along great with other pets.",
  },
  {
    id: 5,
    name: "Charlie",
    type: "dogs" as const,
    age: "6 months",
    gender: "Male",
    breed: "Golden Retriever Mix",
    image: "https://images.unsplash.com/photo-1477884213360-7e9d7dcc1e48?w=800&h=800&fit=crop",
    traits: ["Energetic", "Playful", "Learning fast"],
    description: "Charlie is a happy puppy who loves to learn and play. He's working on his basic commands.",
  },
  {
    id: 6,
    name: "Mittens",
    type: "cats" as const,
    age: "3 years",
    gender: "Female",
    breed: "Calico",
    image: "https://images.unsplash.com/photo-1513360371669-4adf3dd7dff8?w=800&h=800&fit=crop",
    traits: ["Sweet", "Lap cat", "Purrs a lot"],
    description: "Mittens loves nothing more than curling up in your lap for hours of purring and cuddles.",
  },
  {
    id: 7,
    name: "Rocky",
    type: "dogs" as const,
    age: "5 years",
    gender: "Male",
    breed: "Pit Bull Mix",
    image: "https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=800&h=800&fit=crop",
    traits: ["Loyal", "Protective", "Gentle giant"],
    description: "Rocky is a sweet, gentle giant who loves his people. He's great with kids and very protective of his family.",
  },
  {
    id: 8,
    name: "Cleo",
    type: "cats" as const,
    age: "2 years",
    gender: "Female",
    breed: "Siamese Mix",
    image: "https://images.unsplash.com/photo-1596854407944-bf87f6fdd49e?w=800&h=800&fit=crop",
    traits: ["Talkative", "Social", "Smart"],
    description: "Cleo is a chatty cat who loves conversation and attention. She's very smart and learns tricks quickly.",
  },
  {
    id: 9,
    name: "Buddy",
    type: "dogs" as const,
    age: "7 years",
    gender: "Male",
    breed: "Terrier Mix",
    image: "https://images.unsplash.com/photo-1558788353-f76d92427f16?w=800&h=800&fit=crop",
    traits: ["Calm", "Senior", "Affectionate"],
    description: "Buddy is a calm senior looking for a quiet home to retire in. He loves gentle walks and cozy naps.",
  },
]
