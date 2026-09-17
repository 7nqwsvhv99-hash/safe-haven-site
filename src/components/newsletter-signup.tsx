"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CheckCircle2, Mail } from "lucide-react"

const newsletterSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
})

type NewsletterFormData = z.infer<typeof newsletterSchema>

export function NewsletterSignup() {
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<NewsletterFormData>({
    resolver: zodResolver(newsletterSchema),
  })

  const onSubmit = async (data: NewsletterFormData) => {
    setIsSubmitting(true)
    setSubmitError(null)

    try {
      const response = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      const result = await response.json()
      if (!response.ok) {
        throw new Error(result?.error || "We could not complete your subscription. Please try again.")
      }

      setIsSubmitted(true)
      reset()
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "We could not complete your subscription. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="w-full">
      {isSubmitted ? (
        <div className="flex items-center gap-2 text-primary font-semibold">
          <CheckCircle2 className="h-5 w-5" />
          <span>Thanks for subscribing!</span>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-2">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <Input
                {...register("email")}
                type="email"
                autoComplete="email"
                placeholder="Enter your email"
                className={errors.email ? "border-destructive" : ""}
              />
              {errors.email && (
                <p className="text-xs text-destructive mt-1">{errors.email.message}</p>
              )}
            </div>
            <Button type="submit" disabled={isSubmitting}>
              <Mail className="h-4 w-4 mr-2" />
              {isSubmitting ? "Subscribing..." : "Subscribe"}
            </Button>
          </div>
          {submitError && <p className="text-xs text-destructive">{submitError}</p>}
        </form>
      )}
    </div>
  )
}
