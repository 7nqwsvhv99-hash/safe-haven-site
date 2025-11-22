"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { CheckCircle2, CreditCard } from "lucide-react"

const donationSchema = z.object({
  amount: z.string().min(1, "Please enter an amount"),
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Invalid email address"),
  recurring: z.boolean().optional(),
})

type DonationFormData = z.infer<typeof donationSchema>

const presetAmounts = [25, 50, 100, 250]

export function DonationForm() {
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [customAmount, setCustomAmount] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<DonationFormData>({
    resolver: zodResolver(donationSchema),
    defaultValues: {
      recurring: false,
    },
  })

  const selectedAmount = watch("amount")
  const isRecurring = watch("recurring")

  const onSubmit = async (data: DonationFormData) => {
    setIsSubmitting(true)

    // Simulate payment processing
    await new Promise((resolve) => setTimeout(resolve, 2000))

    // In production, integrate with Stripe
    console.log("Donation:", data)

    setIsSubmitting(false)
    setIsSubmitted(true)
    reset()
  }

  if (isSubmitted) {
    return (
      <Card className="p-8 text-center space-y-4">
        <CheckCircle2 className="h-16 w-16 text-primary mx-auto" />
        <h3 className="text-2xl font-bold">Thank You!</h3>
        <p className="text-muted-foreground">
          Your generous donation will help us continue our mission to save animals in need.
        </p>
        <Button onClick={() => setIsSubmitted(false)} variant="outline">
          Make Another Donation
        </Button>
      </Card>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-4">
        <Label>Select Amount</Label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {presetAmounts.map((amount) => (
            <button
              key={amount}
              type="button"
              onClick={() => {
                setValue("amount", amount.toString())
                setCustomAmount(false)
              }}
              className={`h-16 rounded-xl border-2 font-semibold transition-all ${
                selectedAmount === amount.toString() && !customAmount
                  ? "border-primary bg-primary text-white"
                  : "border-border hover:border-primary/50"
              }`}
            >
              ${amount}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => {
            setCustomAmount(true)
            setValue("amount", "")
          }}
          className={`w-full h-12 rounded-xl border-2 font-semibold transition-all ${
            customAmount
              ? "border-primary bg-primary text-white"
              : "border-border hover:border-primary/50"
          }`}
        >
          Custom Amount
        </button>
        {customAmount && (
          <div className="space-y-2">
            <Input
              {...register("amount")}
              type="number"
              placeholder="Enter amount"
              min="1"
              step="1"
            />
          </div>
        )}
        {errors.amount && (
          <p className="text-sm text-destructive">{errors.amount.message}</p>
        )}
      </div>

      <div className="flex items-center gap-3 p-4 bg-secondary/50 rounded-xl">
        <input
          type="checkbox"
          id="recurring"
          {...register("recurring")}
          className="h-5 w-5 rounded border-primary text-primary focus:ring-primary"
        />
        <Label htmlFor="recurring" className="cursor-pointer">
          Make this a monthly donation
        </Label>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Full Name *</Label>
          <Input
            id="name"
            {...register("name")}
            placeholder="John Doe"
          />
          {errors.name && (
            <p className="text-sm text-destructive">{errors.name.message}</p>
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

      <div className="p-4 bg-slate-50 rounded-xl space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <CreditCard className="h-4 w-4" />
          <span>Payment Information</span>
        </div>
        <p className="text-sm text-muted-foreground">
          In a production environment, Stripe payment fields would appear here for secure payment processing.
        </p>
        <div className="h-12 bg-white rounded-lg border border-dashed border-muted-foreground/30 flex items-center justify-center text-sm text-muted-foreground">
          Stripe Card Element (Demo Mode)
        </div>
      </div>

      <Button type="submit" disabled={isSubmitting} size="lg" className="w-full">
        {isSubmitting
          ? "Processing..."
          : `Donate $${selectedAmount || "0"}${isRecurring ? "/month" : ""}`
        }
      </Button>

      <div className="text-xs text-muted-foreground text-center space-y-1">
        <p>Safe Haven Animal Rescue is a 501(c)(3) nonprofit organization.</p>
        <p>Your donation is tax-deductible to the extent allowed by law.</p>
      </div>
    </form>
  )
}
