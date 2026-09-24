export const managesStaff = (roles: readonly string[]) => roles.some(role => ["Administrator", "Shelter Manager"].includes(role));
export const isStaff = (roles: readonly string[]) => managesStaff(roles) || roles.includes("Staff");
export const overlaps = (start: string, end: string, otherStart: string, otherEnd: string) => new Date(start).getTime() < new Date(otherEnd).getTime() && new Date(end).getTime() > new Date(otherStart).getTime();
export function chicagoInput(iso: string) {
  if (!iso) return "";
  const parts = new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Chicago", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(iso));
  return parts.replace(" ", "T");
}
export function chicagoISO(input: string) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(input)) throw new Error("Enter a valid date and time.");
  const nominal = Date.parse(input + "Z");
  const candidates = [5, 6].map(hours => new Date(nominal + hours * 3600000).toISOString()).filter(iso => chicagoInput(iso) === input);
  if (candidates.length !== 1) throw new Error("This time is skipped or repeated by daylight saving time. Please choose an unambiguous time.");
  return candidates[0];
}
export function safeResource(value: string) {
  if (!value) return "";
  try { const u = new URL(value); if (u.protocol === "https:" || u.protocol === "http:") return u.href; } catch {}
  throw new Error("Use a complete http or https resource link.");
}
