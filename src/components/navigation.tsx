"use client"

import Link from "next/link"
import { useState } from "react"
import { Menu, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import Image from "next/image"

export function Navigation() {
  const [isOpen, setIsOpen] = useState(false)

  const navItems = [
    { href: "/", label: "Home" },
    { href: "/adopt", label: "Adopt" },
    { href: "/foster", label: "Foster" },
    { href: "/clinic", label: "Clinic" },
    { href: "/volunteer", label: "Volunteer" },
    { href: "/donate", label: "Donate" },
    { href: "/about", label: "About" },
  ]

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <div className="container-custom">
        <div className="flex h-20 items-center justify-between px-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <Image
              src="/images/safe-haven-logo-header.svg"
              alt="Safe Haven Humane Society"
              width={56}
              height={56}
              className="h-14 w-14 shrink-0 object-contain transition-transform group-hover:scale-105"
              priority
              unoptimized
            />
            <div className="hidden md:flex flex-col">
              <span className="font-bold text-lg leading-tight">Safe Haven</span>
              <span className="text-xs text-muted-foreground">Humane Society</span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm font-medium transition-colors hover:text-primary"
              >
                {item.label}
              </Link>
            ))}
          </div>

          {/* CTA Button - Desktop */}
          <div className="hidden md:block">
            <Button asChild>
              <Link href="/adopt">See Pets</Link>
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-2"
            aria-label="Toggle menu"
          >
            {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="md:hidden border-t py-4 px-4 space-y-3">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block py-2 text-base font-medium hover:text-primary transition-colors"
                onClick={() => setIsOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            <Button asChild className="w-full mt-4">
              <Link href="/adopt">See Pets</Link>
            </Button>
          </div>
        )}
      </div>
    </nav>
  )
}
