"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { CheckCircle2 } from "lucide-react"

const adoptionSchema = z.object({
  petName: z.string().min(1, "Pet name is required"),
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  address: z.string().min(5, "Address is required"),
  city: z.string().min(2, "City is required"),
  zipCode: z.string().min(5, "Valid zip code required"),
  homeType: z.string().min(1, "Please select your home type"),
  hasYard: z.string().min(1, "Please answer this question"),
  hasPets: z.string().min(1, "Please answer this question"),
  petDetails: z.string().optional(),
  whyAdopt: z.string().min(20, "Please provide at least 20 characters"),
  experience: z.string().min(10, "Please describe your experience"),
})

type AdoptionFormData = z.infer<typeof adoptionSchema>

interface AdoptionFormProps {
  petName?: string
  onClose?: () => void
}

export function AdoptionForm({ petName = "", onClose }: AdoptionFormProps) {
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<AdoptionFormData>({
    resolver: zodResolver(adoptionSchema),
    defaultValues: {
      petName,
    },
  })

  const onSubmit = async (data: AdoptionFormData) => {
    setIsSubmitting(true)

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500))

    // In production, send to your backend/email service
    console.log("Adoption Application:", data)

    setIsSubmitting(false)
    setIsSubmitted(true)
    reset()
  }

  if (isSubmitted) {
    return (
      <Card className="p-8 text-center space-y-4">
        <CheckCircle2 className="h-16 w-16 text-primary mx-auto" />
        <h3 className="text-2xl font-bold">Application Received!</h3>
        <p className="text-muted-foreground">
          Thank you for your interest in adopting {petName}! We'll review your application and contact you within 2-3 business days.
        </p>
        <Button onClick={onClose} variant="outline">
          Close
        </Button>
      </Card>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="petName">Pet You're Interested In</Label>
        <Input
          id="petName"
          {...register("petName")}
          placeholder="Enter pet name"
        />
        {errors.petName && (
          <p className="text-sm text-destructive">{errors.petName.message}</p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="fullName">Full Name *</Label>
          <Input
            id="fullName"
            {...register("fullName")}
            placeholder="John Doe"
          />
          {errors.fullName && (
            <p className="text-sm text-destructive">{errors.fullName.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email *</Label>
          <Input
            id="email"
            type="email"
            {...register("email")}
            placeholder="john@example.com"
          />
          {errors.email && (
            <p className="text-sm text-destructive">{errors.email.message}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="phone">Phone Number *</Label>
          <Input
            id="phone"
            {...register("phone")}
            placeholder="(555) 123-4567"
          />
          {errors.phone && (
            <p className="text-sm text-destructive">{errors.phone.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="zipCode">Zip Code *</Label>
          <Input
            id="zipCode"
            {...register("zipCode")}
            placeholder="61028"
          />
          {errors.zipCode && (
            <p className="text-sm text-destructive">{errors.zipCode.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="address">Street Address *</Label>
        <Input
          id="address"
          {...register("address")}
          placeholder="123 Main Street"
        />
        {errors.address && (
          <p className="text-sm text-destructive">{errors.address.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="city">City *</Label>
        <Input
          id="city"
          {...register("city")}
          placeholder="Elizabeth"
        />
        {errors.city && (
          <p className="text-sm text-destructive">{errors.city.message}</p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="homeType">Type of Home *</Label>
          <select
            id="homeType"
            {...register("homeType")}
            className="flex h-12 w-full rounded-xl border border-input bg-background px-4 py-3 text-base"
          >
            <option value="">Select...</option>
            <option value="house">House</option>
            <option value="apartment">Apartment</option>
            <option value="condo">Condo</option>
            <option value="other">Other</option>
          </select>
          {errors.homeType && (
            <p className="text-sm text-destructive">{errors.homeType.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="hasYard">Do you have a yard? *</Label>
          <select
            id="hasYard"
            {...register("hasYard")}
            className="flex h-12 w-full rounded-xl border border-input bg-background px-4 py-3 text-base"
          >
            <option value="">Select...</option>
            <option value="yes">Yes, fenced</option>
            <option value="unfenced">Yes, unfenced</option>
            <option value="no">No</option>
          </select>
          {errors.hasYard && (
            <p className="text-sm text-destructive">{errors.hasYard.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="hasPets">Do you currently have pets? *</Label>
        <select
          id="hasPets"
          {...register("hasPets")}
          className="flex h-12 w-full rounded-xl border border-input bg-background px-4 py-3 text-base"
        >
          <option value="">Select...</option>
          <option value="yes">Yes</option>
          <option value="no">No</option>
        </select>
        {errors.hasPets && (
          <p className="text-sm text-destructive">{errors.hasPets.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="petDetails">If yes, please describe your current pets</Label>
        <Textarea
          id="petDetails"
          {...register("petDetails")}
          placeholder="Breed, age, temperament..."
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="whyAdopt">Why do you want to adopt this pet? *</Label>
        <Textarea
          id="whyAdopt"
          {...register("whyAdopt")}
          placeholder="Tell us what drew you to this pet and what you're looking for..."
        />
        {errors.whyAdopt && (
          <p className="text-sm text-destructive">{errors.whyAdopt.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="experience">Pet ownership experience *</Label>
        <Textarea
          id="experience"
          {...register("experience")}
          placeholder="Describe your experience with pets..."
        />
        {errors.experience && (
          <p className="text-sm text-destructive">{errors.experience.message}</p>
        )}
      </div>

      <div className="flex gap-4">
        <Button type="submit" disabled={isSubmitting} className="flex-1">
          {isSubmitting ? "Submitting..." : "Submit Application"}
        </Button>
        {onClose && (
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
        )}
      </div>

      <p className="text-xs text-muted-foreground text-center">
        By submitting this form, you agree to be contacted by Safe Haven Animal Rescue regarding your application.
      </p>
    </form>
  )
}
