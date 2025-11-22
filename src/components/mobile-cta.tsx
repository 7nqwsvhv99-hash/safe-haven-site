"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Heart } from "lucide-react"

export function MobileCTA() {
  return (
    <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-white via-white to-transparent md:hidden z-40">
      <Button asChild size="lg" className="w-full shadow-xl">
        <Link href="/adopt" className="flex items-center gap-2">
          <Heart className="h-5 w-5" />
          See Adoptable Pets
        </Link>
      </Button>
    </div>
  )
}
