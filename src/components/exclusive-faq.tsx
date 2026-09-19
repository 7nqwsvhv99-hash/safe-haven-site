"use client"

import { useState } from "react"
import { ChevronDown, HelpCircle } from "lucide-react"

type Faq = {
  question: string
  answer: string
}

export function ExclusiveFaq({ faqs }: { faqs: Faq[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  return (
    <div className="space-y-4">
      {faqs.map((faq, index) => {
        const isOpen = openIndex === index

        return (
          <div
            key={faq.question}
            className="rounded-2xl border bg-white shadow-sm transition-shadow hover:shadow-md"
          >
            <button
              type="button"
              className="flex w-full items-center gap-3 p-6 text-left"
              aria-expanded={isOpen}
              onClick={() => setOpenIndex(isOpen ? null : index)}
            >
              <HelpCircle className="h-5 w-5 flex-shrink-0 text-primary" />
              <span className="flex-1 font-semibold">{faq.question}</span>
              <ChevronDown
                className={`h-5 w-5 flex-shrink-0 text-muted-foreground transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
              />
            </button>

            {isOpen && (
              <div className="px-6 pb-6 pl-14">
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {faq.answer}
                </p>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
