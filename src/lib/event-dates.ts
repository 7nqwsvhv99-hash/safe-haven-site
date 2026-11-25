const TIME_ZONE = "America/Chicago";

function zonedParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(date);
  const value = (type: string) => Number(parts.find((part) => part.type === type)?.value || 0);
  return { year: value("year"), month: value("month"), day: value("day"), hour: value("hour"), minute: value("minute") };
}

export class EventDateError extends Error {}

export function chicagoLocalToIso(value: string, allDayEnd = false) {
  if (!value) return "";
  let local = value;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) local = `${value}T${allDayEnd ? "23:59" : "00:00"}`;
  else if (allDayEnd && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) local = `${value.slice(0, 10)}T23:59`;
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(local)) throw new EventDateError("Enter a valid event date and time.");
  const [datePart, timePart] = local.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  const [hour, minute] = timePart.split(":").map(Number);
  const naive = Date.UTC(year, month - 1, day, hour, minute);
  const dateCheck = new Date(naive);
  if (dateCheck.getUTCFullYear() !== year || dateCheck.getUTCMonth() !== month - 1 || dateCheck.getUTCDate() !== day || hour > 23 || minute > 59) throw new EventDateError("Enter a valid event date and time.");
  const offsetParts = zonedParts(new Date(naive));
  const represented = Date.UTC(offsetParts.year, offsetParts.month - 1, offsetParts.day, offsetParts.hour, offsetParts.minute);
  const converted = new Date(naive - (represented - naive));
  const roundTrip = zonedParts(converted);
  if (roundTrip.year !== year || roundTrip.month !== month || roundTrip.day !== day || roundTrip.hour !== hour || roundTrip.minute !== minute) {
    throw new EventDateError("That local time does not exist because clocks change for daylight saving time. Choose another time.");
  }
  return converted.toISOString();
}

export function parseEventDateRange(start: string, end: string, allDay: boolean) {
  if (!start) throw new EventDateError("Add the event start date and time.");
  if (!allDay && !end) throw new EventDateError("Add an end date and time for a timed event.");
  const startIso = chicagoLocalToIso(start);
  const endIso = allDay ? chicagoLocalToIso(end || start, true) : chicagoLocalToIso(end);
  if (Date.parse(endIso) <= Date.parse(startIso)) throw new EventDateError("The event end must be after its start.");
  return { startIso, endIso };
}

export function eventEndTimestamp(fields: Record<string, unknown>) {
  const allDay = fields["All Day Event"] === true;
  const rawEnd = typeof fields["End Date & Time"] === "string" ? fields["End Date & Time"] : "";
  const rawStart = typeof fields["Start Date & Time"] === "string" ? fields["Start Date & Time"] : "";
  const value = Date.parse(rawEnd || rawStart);
  if (!Number.isFinite(value)) return Number.NaN;
  if (!allDay) return value;
  if (!rawEnd) return value + 86_399_999;
  const endLocal = zonedParts(new Date(value));
  return endLocal.hour === 0 && endLocal.minute === 0 ? value + 86_399_999 : value;
}
