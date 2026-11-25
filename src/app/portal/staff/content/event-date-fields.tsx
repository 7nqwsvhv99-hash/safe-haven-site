"use client";

import { useState } from "react";

type Props = {
  initialAllDay?: boolean;
  initialStart?: string;
  initialEnd?: string;
};

function datePart(value: string) {
  return value ? value.slice(0, 10) : "";
}

function timePart(value: string) {
  return value && value.includes("T") ? value.slice(11, 16) : "";
}

export function EventDateFields({
  initialAllDay = false,
  initialStart = "",
  initialEnd = "",
}: Props) {
  const [allDay, setAllDay] = useState(initialAllDay);
  const [startDate, setStartDate] = useState(datePart(initialStart));
  const [startTime, setStartTime] = useState(initialAllDay ? "" : timePart(initialStart));
  const [endDate, setEndDate] = useState(datePart(initialEnd));
  const [endTime, setEndTime] = useState(initialAllDay ? "" : timePart(initialEnd));

  const startValue = allDay
    ? startDate
    : startDate && startTime
      ? `${startDate}T${startTime}`
      : "";
  const endValue = allDay
    ? endDate || startDate
    : endDate && endTime
      ? `${endDate}T${endTime}`
      : "";

  return (
    <div className="space-y-4 sm:col-span-2">
      <label className="block text-sm font-medium">
        <span className="flex items-center gap-2">
          <input
            name="allDay"
            type="checkbox"
            checked={allDay}
            onChange={(event) => setAllDay(event.target.checked)}
          />
          All day event
        </span>
        <span className="mt-1 block text-xs font-normal text-muted-foreground">
          Select this when visitors only need the event date. If the end date is blank, the event runs through the end of the start date.
        </span>
      </label>

      <input type="hidden" name="start" value={startValue} />
      <input type="hidden" name="end" value={endValue} />

      {allDay ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium">
            Start date
            <input
              type="date"
              required
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5"
            />
          </label>
          <label className="block text-sm font-medium">
            End date <span className="font-normal text-muted-foreground">(optional)</span>
            <input
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5"
            />
          </label>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium">
            Start date &amp; time
            <div className="mt-2 grid grid-cols-[1fr_auto] gap-2">
              <input
                aria-label="Start date"
                type="date"
                required
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                className="w-full rounded-xl border bg-white px-3 py-2.5"
              />
              <input
                aria-label="Start time"
                type="time"
                required
                value={startTime}
                onChange={(event) => setStartTime(event.target.value)}
                className="rounded-xl border bg-white px-3 py-2.5"
              />
            </div>
          </label>
          <label className="block text-sm font-medium">
            End date &amp; time
            <div className="mt-2 grid grid-cols-[1fr_auto] gap-2">
              <input
                aria-label="End date"
                type="date"
                required
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
                className="w-full rounded-xl border bg-white px-3 py-2.5"
              />
              <input
                aria-label="End time"
                type="time"
                required
                value={endTime}
                onChange={(event) => setEndTime(event.target.value)}
                className="rounded-xl border bg-white px-3 py-2.5"
              />
            </div>
          </label>
        </div>
      )}
    </div>
  );
}
