"use client";

import { FormEvent, useState } from "react";

export function VeterinarianDateForm({
  action,
}: {
  action: (formData: FormData) => Promise<void>;
}) {
  const [date, setDate] = useState("");
  const [clinicType, setClinicType] = useState("Full Day");
  const [error, setError] = useState("");

  function validateDate(value: string) {
    if (!value) return true;
    const selected = new Date(`${value}T12:00:00`);
    const day = selected.getDay();
    return day === 3 || day === 6;
  }

  function handleDateChange(value: string) {
    if (!validateDate(value)) {
      setDate("");
      setError("The date selected was not a Wednesday or Saturday. Please choose again.");
      return;
    }
    setDate(value);
    setError("");
    const day = new Date(`${value}T12:00:00`).getDay();
    if (day === 3) setClinicType("Half Day");
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (!validateDate(date)) {
      event.preventDefault();
      setError("The date selected was not a Wednesday or Saturday. Please choose again.");
    }
  }

  const isWednesday = date ? new Date(`${date}T12:00:00`).getDay() === 3 : false;

  return (
    <form
      action={action}
      onSubmit={handleSubmit}
      className="mt-5 grid gap-4 rounded-2xl bg-slate-50 p-5 md:grid-cols-[220px_180px_1fr_auto] md:items-end"
    >
      <label className="text-sm font-medium">
        Preferred clinic date
        <input
          type="date"
          name="preferredDate"
          required
          value={date}
          onChange={(event) => handleDateChange(event.target.value)}
          className="mt-1 w-full rounded-xl border bg-white px-3 py-2"
        />
        {error && <span role="alert" className="mt-2 block text-xs font-semibold text-red-700">{error}</span>}
      </label>
      <label className="text-sm font-medium">
        Clinic type
        <select
          name="preferredClinicType"
          required
          value={clinicType}
          onChange={(event) => setClinicType(event.target.value)}
          disabled={isWednesday}
          className="mt-1 w-full rounded-xl border bg-white px-3 py-2 disabled:bg-slate-100"
        >
          <option>Full Day</option>
          <option>Half Day</option>
        </select>
        {isWednesday && (
          <>
            <input type="hidden" name="preferredClinicType" value="Half Day" />
            <span className="mt-2 block text-xs text-muted-foreground">Wednesdays are always half-day clinics.</span>
          </>
        )}
      </label>
      <label className="text-sm font-medium">
        Notes <span className="font-normal text-muted-foreground">(optional)</span>
        <input
          type="text"
          name="notes"
          placeholder="Anything the clinic team should know"
          className="mt-1 w-full rounded-xl border bg-white px-3 py-2"
        />
      </label>
      <button type="submit" className="rounded-full bg-primary px-5 py-2.5 font-semibold text-white shadow-sm hover:opacity-90">
        Add Date
      </button>
    </form>
  );
}
