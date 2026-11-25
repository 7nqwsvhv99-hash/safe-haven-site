export type SafeHavenAirtableConfig = {
  baseId: string;
  tables: Record<string, string>;
  fields: { eventImage: string; testimonialPhoto: string };
  clinicApplicationFormUrl: string;
};

export function getSafeHavenAirtableConfig(): SafeHavenAirtableConfig {
  const raw = process.env.SAFE_HAVEN_AIRTABLE_CONFIG_JSON;
  if (!raw) throw new Error("Safe Haven Airtable configuration is unavailable.");
  let parsed: Partial<SafeHavenAirtableConfig>;
  try { parsed = JSON.parse(raw) as Partial<SafeHavenAirtableConfig>; }
  catch { throw new Error("Safe Haven Airtable configuration is invalid."); }
  if (!parsed.baseId || !parsed.tables || !parsed.fields) throw new Error("Safe Haven Airtable configuration is incomplete.");
  return {
    baseId: parsed.baseId,
    tables: parsed.tables,
    fields: { eventImage: parsed.fields.eventImage || "Event Image", testimonialPhoto: parsed.fields.testimonialPhoto || "Testimonial Photo" },
    clinicApplicationFormUrl: typeof parsed.clinicApplicationFormUrl === "string" ? parsed.clinicApplicationFormUrl : "",
  };
}
