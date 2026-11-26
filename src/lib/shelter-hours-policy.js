"use strict"

const TIME_ZONE = "America/Chicago"
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

function parseIntervals(value) {
  const raw = typeof value === "string" ? value.trim() : ""
  if (!raw) return []
  const intervals = raw.split(",").map((item) => {
    const match = item.trim().match(/^(\d{2}:\d{2})\s*-\s*(\d{2}:\d{2})$/)
    if (!match || !isTime(match[1]) || !isTime(match[2]) || match[1] >= match[2]) {
      throw new Error("Enter each open interval as HH:mm-HH:mm, with the end after the start.")
    }
    return { start: match[1], end: match[2] }
  }).sort((a, b) => a.start.localeCompare(b.start))
  for (let index = 1; index < intervals.length; index += 1) {
    if (intervals[index].start < intervals[index - 1].end) {
      throw new Error("Open intervals cannot overlap. Adjust the times and try again.")
    }
  }
  return intervals
}

function isTime(value) {
  const match = value.match(/^(\d{2}):(\d{2})$/)
  return Boolean(match && Number(match[1]) <= 23 && Number(match[2]) <= 59)
}

function validateWeeklySchedule(schedule) {
  if (!schedule || typeof schedule !== "object" || !schedule.days || typeof schedule.days !== "object") {
    throw new Error("The weekly schedule is missing or invalid.")
  }
  const days = {}
  for (const day of DAYS) {
    const intervals = schedule.days[day]
    if (!Array.isArray(intervals)) throw new Error(`Add an hours schedule for ${day}.`)
    days[day] = parseIntervals(intervals.map((item) => `${item.start}-${item.end}`).join(","))
  }
  return { timezone: TIME_ZONE, days }
}

function getCentralDate(value = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit",
  }).format(value)
}

function isDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T12:00:00Z`)
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
}

function exceptionRangeOverlaps(a, b) {
  return a.startDate <= b.endDate && b.startDate <= a.endDate
}

function findExceptionOverlap(exceptions, candidate, exceptId = "") {
  return exceptions.find((item) => item.status === "Published" && item.id !== exceptId &&
    exceptionRangeOverlaps(item, candidate)) || null
}

function weekdayName(date) {
  const day = new Date(`${date}T12:00:00Z`).getUTCDay()
  return ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][day]
}

function resolveHoursForDate(schedule, exceptions, date) {
  const matching = exceptions.filter((item) => item.status === "Published" &&
    item.startDate <= date && item.endDate >= date)
  if (matching.length > 1) return { conflict: true, intervals: [], exception: null }
  if (matching.length === 1) {
    const item = matching[0]
    return { conflict: false, intervals: item.mode === "Closed" ? [] : item.openIntervals, exception: item }
  }
  return { conflict: false, intervals: schedule.days[weekdayName(date)] || [], exception: null }
}

function formatTime(value) {
  if (!isTime(value)) return value
  const [hours, minutes] = value.split(":").map(Number)
  const suffix = hours >= 12 ? "PM" : "AM"
  const displayHour = hours % 12 || 12
  return `${displayHour}${minutes ? `:${String(minutes).padStart(2, "0")}` : ""} ${suffix}`
}

function formatIntervals(intervals) {
  return intervals.length ? intervals.map((item) => `${formatTime(item.start)}–${formatTime(item.end)}`).join(", ") : "Closed"
}

module.exports = {
  DAYS, TIME_ZONE, exceptionRangeOverlaps, findExceptionOverlap, formatIntervals,
  formatTime, getCentralDate, isDate, parseIntervals, resolveHoursForDate,
  validateWeeklySchedule, weekdayName,
}
