import Link from "next/link"
import { MapPin, Phone, Mail, Facebook, Instagram } from "lucide-react"
import { NewsletterSignup } from "@/components/newsletter-signup"

export function Footer() {
  return (
    <footer className="bg-slate-50 border-t">
      <div className="container-custom section-padding">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-12">
          {/* Brand */}
          <div className="space-y-4">
            <Link href="/" className="inline-flex items-center gap-3 group">
              <img
                src="/images/safe-haven-logo-header.png"
                alt="Safe Haven Humane Society"
                width={64}
                height={64}
                className="h-16 w-16 shrink-0 object-contain transition-transform group-hover:scale-105"
              />
              <div className="flex flex-col">
                <span className="font-bold text-lg leading-tight">Safe Haven</span>
                <span className="text-xs text-muted-foreground">Humane Society</span>
              </div>
            </Link>
            <p className="text-sm text-muted-foreground">
              Connecting pets and people in Jo Daviess County since 1994.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold mb-4">Get Involved</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/adopt" className="text-muted-foreground hover:text-primary transition-colors">Adopt</Link></li>
              <li><Link href="/foster" className="text-muted-foreground hover:text-primary transition-colors">Foster</Link></li>
              <li><Link href="/volunteer" className="text-muted-foreground hover:text-primary transition-colors">Volunteer</Link></li>
              <li><Link href="/donate" className="text-muted-foreground hover:text-primary transition-colors">Donate</Link></li>
            </ul>
          </div>

          {/* Services */}
          <div>
            <h3 className="font-semibold mb-4">Explore</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/clinic" className="text-muted-foreground hover:text-primary transition-colors">Spay &amp; Neuter Clinic</Link></li>
              <li><Link href="/adopt" className="text-muted-foreground hover:text-primary transition-colors">Adoption</Link></li>
              <li><Link href="/foster" className="text-muted-foreground hover:text-primary transition-colors">Foster</Link></li>
              <li><Link href="/donate" className="text-muted-foreground hover:text-primary transition-colors">Donate</Link></li>
              <li><Link href="/about" className="text-muted-foreground hover:text-primary transition-colors">About Us</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-semibold mb-4">Contact</h3>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>1471 US Hwy 20 W<br />Elizabeth, IL 61028</span>
              </li>
              <li className="flex items-center gap-2 text-muted-foreground">
                <Phone className="h-4 w-4 flex-shrink-0" />
                <a href="tel:815-858-2265" className="hover:text-primary transition-colors">(815) 858-2265</a>
              </li>
              <li className="flex items-center gap-2 text-muted-foreground">
                <Mail className="h-4 w-4 flex-shrink-0" />
                <a href="mailto:safehaven1471@gmail.com" className="hover:text-primary transition-colors">safehaven1471@gmail.com</a>
              </li>
            </ul>

            {/* Social Media */}
            <div className="flex gap-3 mt-4">
              <a href="https://www.facebook.com/safehavenelizabethil" target="_blank" rel="noopener noreferrer" className="p-2 rounded-full bg-primary/10 text-primary hover:bg-primary hover:text-white transition-colors" aria-label="Facebook">
                <Facebook className="h-4 w-4" />
              </a>
              <a href="https://www.instagram.com/safehaven.animalshelter" target="_blank" rel="noopener noreferrer" className="p-2 rounded-full bg-primary/10 text-primary hover:bg-primary hover:text-white transition-colors" aria-label="Instagram">
                <Instagram className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>

        {/* Newsletter Signup */}
        <div className="mt-12 p-6 bg-primary/5 rounded-2xl">
          <div className="max-w-2xl mx-auto text-center space-y-4">
            <h3 className="font-bold text-lg">Stay Connected</h3>
            <p className="text-sm text-muted-foreground">Get adoption alerts, success stories, and updates delivered to your inbox.</p>
            <NewsletterSignup />
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-6 border-t text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Safe Haven Humane Society. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}
