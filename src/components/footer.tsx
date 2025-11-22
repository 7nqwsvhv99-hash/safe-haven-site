import Link from "next/link"
import { Heart, MapPin, Phone, Mail, Facebook, Instagram } from "lucide-react"
import { NewsletterSignup } from "@/components/newsletter-signup"

export function Footer() {
  return (
    <footer className="bg-slate-50 border-t">
      <div className="container-custom section-padding">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-12">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Heart className="h-6 w-6 text-primary fill-primary" />
              <span className="font-bold text-lg">Safe Haven</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Connecting pets and people in Jo Daviess County since 1994.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold mb-4">Get Involved</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/adopt" className="text-muted-foreground hover:text-primary transition-colors">
                  Adopt a Pet
                </Link>
              </li>
              <li>
                <Link href="/foster" className="text-muted-foreground hover:text-primary transition-colors">
                  Become a Foster
                </Link>
              </li>
              <li>
                <Link href="/volunteer" className="text-muted-foreground hover:text-primary transition-colors">
                  Volunteer
                </Link>
              </li>
              <li>
                <Link href="/donate" className="text-muted-foreground hover:text-primary transition-colors">
                  Donate
                </Link>
              </li>
            </ul>
          </div>

          {/* Services */}
          <div>
            <h3 className="font-semibold mb-4">Services</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/clinic" className="text-muted-foreground hover:text-primary transition-colors">
                  Spay & Neuter
                </Link>
              </li>
              <li>
                <Link href="/clinic" className="text-muted-foreground hover:text-primary transition-colors">
                  Low-Cost Vet Care
                </Link>
              </li>
              <li>
                <Link href="/about" className="text-muted-foreground hover:text-primary transition-colors">
                  About Us
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-semibold mb-4">Contact</h3>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>Elizabeth, Illinois</span>
              </li>
              <li className="flex items-center gap-2 text-muted-foreground">
                <Phone className="h-4 w-4 flex-shrink-0" />
                <a href="tel:815-858-2265" className="hover:text-primary transition-colors">
                  (815) 858-2265
                </a>
              </li>
              <li className="flex items-center gap-2 text-muted-foreground">
                <Mail className="h-4 w-4 flex-shrink-0" />
                <a href="mailto:info@safehavenforpets.org" className="hover:text-primary transition-colors">
                  info@safehavenforpets.org
                </a>
              </li>
            </ul>

            {/* Social Media */}
            <div className="flex gap-3 mt-4">
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-full bg-primary/10 text-primary hover:bg-primary hover:text-white transition-colors"
                aria-label="Facebook"
              >
                <Facebook className="h-4 w-4" />
              </a>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-full bg-primary/10 text-primary hover:bg-primary hover:text-white transition-colors"
                aria-label="Instagram"
              >
                <Instagram className="h-4 w-4" />
              </a>
              <a
                href="https://tiktok.com"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-full bg-primary/10 text-primary hover:bg-primary hover:text-white transition-colors"
                aria-label="TikTok"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                </svg>
              </a>
            </div>
          </div>
        </div>

        {/* Newsletter Signup */}
        <div className="mt-12 p-6 bg-primary/5 rounded-2xl">
          <div className="max-w-2xl mx-auto text-center space-y-4">
            <h3 className="font-bold text-lg">Stay Connected</h3>
            <p className="text-sm text-muted-foreground">
              Get adoption alerts, success stories, and updates delivered to your inbox.
            </p>
            <NewsletterSignup />
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-6 border-t text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Safe Haven Animal Rescue. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}
