"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2 } from "lucide-react";

const selectClass = "flex h-12 w-full rounded-xl border border-input bg-background px-4 py-3 text-base";

function Field({ label, children, note }: { label: string; children: React.ReactNode; note?: string }) {
  return <div className="space-y-2"><Label>{label}</Label>{note && <p className="text-xs text-muted-foreground">{note}</p>}{children}</div>;
}

export default function OwnerSurrenderRequestPage() {
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setResult(null);
    const form = new FormData(event.currentTarget);
    const payload = {
      ...Object.fromEntries(form.entries()),
      confirmAccurate: form.get("confirmAccurate") === "on",
    };
    try {
      const response = await fetch("/api/owner-surrender-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Unable to submit your request.");
      setResult({ ok: true, message: "Your request has been sent to Safe Haven for review. A team member will contact you about next steps." });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      setResult({ ok: false, message: error instanceof Error ? error.message : "Unable to submit your request." });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setSubmitting(false);
    }
  }

  if (result?.ok) return <div className="container-custom section-padding max-w-2xl"><Card className="space-y-4 p-8 text-center"><CheckCircle2 className="mx-auto h-12 w-12 text-primary" /><h1 className="text-3xl font-bold">Request Received</h1><p>{result.message}</p><p className="text-sm text-muted-foreground">Submitting a request does not mean the surrender has been accepted. Please wait for Safe Haven to contact you before bringing an animal to the shelter.</p><Button asChild><Link href="/">Return to Safe Haven</Link></Button></Card></div>;

  return <div className="min-h-screen bg-slate-50">
    <section className="hero-gradient"><div className="container-custom section-padding max-w-3xl text-center space-y-4"><p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Animal Support</p><h1 className="text-4xl font-bold md:text-5xl">Owner Surrender Request</h1><p className="text-lg text-muted-foreground">Share information about your animal and your situation. Safe Haven reviews each request and will contact you about available next steps.</p></div></section>
    <form onSubmit={onSubmit} className="container-custom max-w-4xl space-y-8 py-10">
      {result && !result.ok && <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-destructive">{result.message}</div>}
      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5 text-sm"><strong>Before you submit:</strong> This is a request for review, not an appointment or confirmation that Safe Haven can accept the animal. Do not bring an animal to the shelter unless a staff member has arranged it. If the animal needs immediate help, call Safe Haven at <a className="font-semibold underline" href="tel:815-858-2265">(815) 858-2265</a>.</div>

      <Card className="space-y-6 p-6 md:p-8">
        <h2 className="text-2xl font-bold">Your contact information</h2>
        <div className="grid gap-5 md:grid-cols-2">
          <Field label="First name *"><Input name="firstName" required /></Field><Field label="Last name *"><Input name="lastName" required /></Field>
          <Field label="Email *"><Input name="email" type="email" required /></Field><Field label="Phone *"><Input name="phone" type="tel" required /></Field>
          <Field label="Street address *"><Input name="streetAddress" required /></Field><Field label="Unit / apartment"><Input name="unitApt" /></Field>
          <Field label="City *"><Input name="city" required /></Field><Field label="State *"><Input name="state" defaultValue="IL" required /></Field><Field label="ZIP code *"><Input name="zip" autoComplete="postal-code" required /></Field>
        </div>
      </Card>

      <Card className="space-y-6 p-6 md:p-8">
        <h2 className="text-2xl font-bold">About the animal</h2>
        <div className="grid gap-5 md:grid-cols-2">
          <Field label="Animal's name *"><Input name="animalName" required /></Field>
          <Field label="Species *"><select name="species" className={selectClass} required defaultValue=""><option value="" disabled>Select one</option><option>Cat</option><option>Dog</option><option>Other</option></select></Field>
          <Field label="Sex"><select name="sex" className={selectClass} defaultValue="Unknown"><option>Female</option><option>Male</option><option>Unknown</option></select></Field>
          <Field label="Approximate age"><Input name="approximateAge" placeholder="For example, 4 years or 6 months" /></Field>
          <Field label="Breed or mix"><Input name="breed" /></Field>
          <Field label="Spayed or neutered?"><select name="altered" className={selectClass} defaultValue="Unknown"><option>Altered</option><option>Not Altered</option><option>Unknown</option></select></Field>
          <Field label="Is a microchip known?"><select name="microchipKnown" className={selectClass} defaultValue="Unknown"><option>Yes</option><option>No</option><option>Unknown</option></select></Field>
          <Field label="Current veterinarian"><Input name="veterinarian" /></Field>
        </div>
        <Field label="What is leading you to request surrender? *"><Textarea name="reason" rows={4} required /></Field>
        <Field label="Behavior or safety details" note="Include information that will help staff assess safe handling and placement."><Textarea name="behaviorNotes" rows={3} /></Field>
        <Field label="Medical conditions or medications"><Textarea name="medicalNotes" rows={3} /></Field>
      </Card>

      <Card className="space-y-6 p-6 md:p-8">
        <h2 className="text-2xl font-bold">Timing</h2>
        <div className="grid gap-5 md:grid-cols-2">
          <Field label="How soon do you need help? *"><select name="urgency" className={selectClass} defaultValue="Routine" required><option>Routine</option><option>Soon</option><option>Urgent</option></select></Field>
          <Field label="Preferred surrender date, if known"><Input name="requestedDate" type="date" /></Field>
          <Field label="How long can you continue caring for the animal?"><Input name="canKeepUntil" type="date" /></Field>
        </div>
        <p className="text-sm text-muted-foreground">Choose Urgent only if there is an immediate safety concern or you cannot safely keep the animal. This helps staff prioritize review but does not guarantee immediate placement.</p>
      </Card>

      <label className="absolute -left-[10000px] top-auto h-px w-px overflow-hidden" aria-hidden="true">Leave this field empty<input name="website" tabIndex={-1} autoComplete="off" /></label>
      <label className="flex items-start gap-3 text-sm"><input type="checkbox" name="confirmAccurate" required className="mt-1 h-4 w-4 accent-primary" /> I confirm that the information above is accurate and Safe Haven may contact me about this request. *</label>
      <Button type="submit" size="lg" disabled={submitting} className="w-full sm:w-auto">{submitting ? "Submitting request..." : "Submit Surrender Request"}</Button>
    </form>
  </div>;
}
