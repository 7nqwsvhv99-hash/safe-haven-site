const test = require("node:test")
const assert = require("node:assert/strict")
const {
  findExceptionOverlap, formatIntervals, getCentralDate, parseIntervals, parseReplacementIntervals,
  resolveHoursForDate, validateWeeklySchedule,
} = require("../src/lib/shelter-hours-policy.js")

const weekly = validateWeeklySchedule({ days: {
  Monday: [{ start: "10:00", end: "15:00" }], Tuesday: [{ start: "10:00", end: "15:00" }],
  Wednesday: [{ start: "10:00", end: "15:00" }], Thursday: [{ start: "10:00", end: "15:00" }],
  Friday: [{ start: "10:00", end: "15:00" }], Saturday: [{ start: "10:00", end: "15:00" }], Sunday: [],
} })

test("validates multiple daily intervals and rejects malformed, reversed, and overlapping intervals", () => {
  assert.deepEqual(parseIntervals("10:00-12:00, 13:00-15:00"), [
    { start: "10:00", end: "12:00" }, { start: "13:00", end: "15:00" },
  ])
  assert.throws(() => parseIntervals("10:00-12:00, 11:30-15:00"), /cannot overlap/)
  assert.throws(() => parseIntervals("15:00-10:00"), /end after the start/)
  assert.throws(() => parseIntervals("24:00-25:00"), /end after the start/)
})

test("parses replacement hours in standard AM/PM time", () => {
  assert.deepEqual(parseReplacementIntervals("9:00 AM-12:00 PM, 1:30 PM-5:00 PM"), [
    { start: "09:00", end: "12:00" },
    { start: "13:30", end: "17:00" },
  ])
  assert.deepEqual(parseReplacementIntervals("12:00 AM-12:00 PM"), [
    { start: "00:00", end: "12:00" },
  ])
  assert.throws(() => parseReplacementIntervals("9:00-12:00"), /Include AM or PM/)
  assert.throws(() => parseReplacementIntervals("1:00 PM-12:00 PM"), /end after the start/)
})

test("weekly hours apply unless a single published exception overrides them", () => {
  const closure = { id: "a", status: "Published", startDate: "2026-12-24", endDate: "2026-12-24", mode: "Closed", openIntervals: [] }
  const partial = { id: "b", status: "Published", startDate: "2026-12-25", endDate: "2026-12-26", mode: "Replace", openIntervals: [{ start: "12:00", end: "14:00" }] }
  assert.deepEqual(resolveHoursForDate(weekly, [closure, partial], "2026-12-24").intervals, [])
  assert.deepEqual(resolveHoursForDate(weekly, [closure, partial], "2026-12-25").intervals, [{ start: "12:00", end: "14:00" }])
  assert.deepEqual(resolveHoursForDate(weekly, [closure, partial], "2026-12-28").intervals, [{ start: "10:00", end: "15:00" }])
  assert.equal(resolveHoursForDate(weekly, [closure], "2026-12-24").exception.id, "a")
})

test("rejects overlapping published date ranges and returns conflict for externally introduced conflicts", () => {
  const existing = { id: "old", status: "Published", startDate: "2026-12-24", endDate: "2026-12-26" }
  const candidate = { startDate: "2026-12-26", endDate: "2026-12-27" }
  assert.equal(findExceptionOverlap([existing], candidate)?.id, "old")
  assert.equal(findExceptionOverlap([existing], candidate, "old"), null)
  assert.equal(resolveHoursForDate(weekly, [existing, { ...existing, id: "new" }], "2026-12-25").conflict, true)
})

test("uses Central Time date boundaries across daylight saving and UTC midnight", () => {
  assert.equal(getCentralDate(new Date("2026-03-08T05:30:00Z")), "2026-03-07")
  assert.equal(getCentralDate(new Date("2026-03-08T08:30:00Z")), "2026-03-08")
  assert.equal(formatIntervals([{ start: "10:00", end: "15:00" }]), "10 AM–3 PM")
  assert.equal(formatIntervals([]), "Closed")
})
