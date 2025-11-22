import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ClientBody from "./ClientBody";
import Script from "next/script";
import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";
import { MobileCTA } from "@/components/mobile-cta";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Safe Haven Animal Rescue | Adopt, Foster, or Donate",
  description: "Find your new best friend in Jo Daviess County. Adopt, foster, or support affordable vet care at Safe Haven Animal Rescue in Elizabeth, Illinois.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <head>
        <Script
          crossOrigin="anonymous"
          src="//unpkg.com/same-runtime/dist/index.global.js"
        />
      </head>
      <body suppressHydrationWarning className="antialiased">
        <ClientBody>
          <Navigation />
          <main className="min-h-screen">{children}</main>
          <Footer />
          <MobileCTA />
        </ClientBody>
      </body>
    </html>
  );
}
