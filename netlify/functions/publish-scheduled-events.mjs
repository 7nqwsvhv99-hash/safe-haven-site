function airtableConfig() {
  const raw=process.env.SAFE_HAVEN_AIRTABLE_CONFIG_JSON;
  if(!raw)throw new Error("Safe Haven Airtable configuration is unavailable.");
  let config;try{config=JSON.parse(raw);}catch{throw new Error("Safe Haven Airtable configuration is invalid.");}
  if(!config.baseId||!config.tables?.events||!config.tables?.volunteerShifts)throw new Error("Safe Haven Airtable configuration is incomplete.");
  return config;
}

export async function publishScheduledEvents({ fetchImpl = fetch, token = process.env.AIRTABLE_ACCESS_TOKEN, now = new Date(), config = airtableConfig() } = {}) {
  if (!token) throw new Error("Airtable access is not configured.");
  const API=`https://api.airtable.com/v0/${config.baseId}/${config.tables.events}`;
  const params = new URLSearchParams({ pageSize: "100" });
  for (const field of ["Event Name", "Event Status", "Start Date & Time", "End Date & Time", "All Day Event", "Scheduled Publish At", "Publish on Website", "Volunteers Needed", "Location Name", "Street Address", "City", "State"]) params.append("fields[]", field);
  const rows = [];
  let offset;
  do {
    if (offset) params.set("offset", offset);
    const response = await fetchImpl(`${API}?${params}`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
    if (!response.ok) throw new Error("Could not read scheduled events.");
    const data = await response.json();
    rows.push(...(data.records || []));
    offset = data.offset;
  } while (offset);

  const due = rows.filter((record) => {
    const fields = record.fields || {};
    const dueAt = Date.parse(fields["Scheduled Publish At"] || "");
    const start = Date.parse(fields["Start Date & Time"] || "");
    const allDay = fields["All Day Event"] === true;
    const end = Date.parse(fields["End Date & Time"] || "");
    const endParts = Number.isFinite(end) ? new Intl.DateTimeFormat("en-US", { timeZone: "America/Chicago", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(end)) : [];
    const endHour = Number(endParts.find((part) => part.type === "hour")?.value || -1);
    const endMinute = Number(endParts.find((part) => part.type === "minute")?.value || -1);
    const effectiveEnd = Number.isFinite(end) ? end + (allDay && endHour === 0 && endMinute === 0 ? 86_399_999 : 0) : (Number.isFinite(start) && allDay ? start + 86_399_999 : end);
    return fields["Event Status"] === "Draft" && fields["Publish on Website"] !== true &&
      typeof fields["Event Name"] === "string" && fields["Event Name"].trim() &&
      Number.isFinite(dueAt) && dueAt <= now.getTime() &&
      Number.isFinite(start) && Number.isFinite(effectiveEnd) && effectiveEnd >= start && effectiveEnd >= now.getTime();
  });

  for (const record of due) {
    if (record.fields["Volunteers Needed"] === true) {
      const shiftParams = new URLSearchParams({ pageSize: "100" });
      shiftParams.append("fields[]", "Event");
      const shiftRows = [];
      let shiftOffset;
      do {
        if (shiftOffset) shiftParams.set("offset", shiftOffset);
        const shiftResponse = await fetchImpl(`https://api.airtable.com/v0/${config.baseId}/${config.tables.volunteerShifts}?${shiftParams}`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
        if (!shiftResponse.ok) throw new Error("Could not check event volunteer shifts.");
        const shiftData = await shiftResponse.json();
        shiftRows.push(...(shiftData.records || []));
        shiftOffset = shiftData.offset;
      } while (shiftOffset);
      const hasShifts = shiftRows.some((shift) => Array.isArray(shift.fields?.Event) && shift.fields.Event.includes(record.id));
      if (!hasShifts) {
        const start = Date.parse(record.fields["Start Date & Time"]);
        const end = Date.parse(record.fields["End Date & Time"]);
        const hours = (end - start) / 3_600_000;
        const count = Math.max(1, Math.ceil(hours / 2));
        const location = [record.fields["Location Name"], record.fields["Street Address"], record.fields.City, record.fields.State].filter(Boolean).join(", ");
        for (let index = 0; index < count; index += 1) {
          const segmentStart = start + (end - start) * index / count;
          const segmentEnd = index === count - 1 ? end : start + (end - start) * (index + 1) / count;
          const createShift = await fetchImpl(`https://api.airtable.com/v0/${config.baseId}/${config.tables.volunteerShifts}`, {
            method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify({ records: [{ fields: {
              Shift: `${record.fields["Event Name"]} · Volunteer Shift ${index + 1}`,
              Event: [record.id], "Start Date & Time": new Date(segmentStart).toISOString(), "End Date & Time": new Date(segmentEnd).toISOString(),
              Area: "Event", Status: "Scheduled", Location: location, Capacity: 3,
              Notes: "Open event volunteer shift. Volunteers can sign up in the Volunteer Portal.",
            } }], typecast: true }), cache: "no-store",
          });
          if (!createShift.ok) throw new Error("Could not create the event volunteer shifts.");
        }
      }
    }
    const response = await fetchImpl(`${API}/${record.id}`, {
      method: "PATCH", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ fields: { "Event Status": "Published", "Publish on Website": true, "Scheduled Publish At": null }, typecast: true }), cache: "no-store",
    });
    if (!response.ok) throw new Error("A scheduled event could not be published.");
  }
  return { published: due.length };
}

export default async function handler() {
  try {
    const result = await publishScheduledEvents();
    return Response.json(result);
  } catch (error) {
    console.error("Scheduled event publication failed", error);
    return Response.json({ error: "Scheduled event publication failed." }, { status: 500 });
  }
}

export const config = { schedule: "*/5 * * * *" };
