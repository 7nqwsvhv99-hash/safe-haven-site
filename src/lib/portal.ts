import "server-only";

import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

const AIRTABLE_BASE_ID = "app2vpch2JJVrP9pu";

const TABLES = {
  portalAccess: "tblIZIPNjVjxteVrB",
  announcements: "tblkXpcdMAu9Wo3fV",
  currentNeeds: "tblw00mfPtjnssgsn",
  volunteers: "tblpVwUgbClbtcQfz",
  volunteerHours: "tblEHjmBlgEg9Z7Tm",
  volunteerShifts: "tblJhGBEAkoGOAPNU",
  clinicMembers: "tblVG88gCVYbRC8Qo",
  clinicDates: "tblJvWn5fh7Rtfp3O",
  clinicResponses: "tblEVlmHvHzItbcVl",
  inventory: "tblTFVIVoeyafVC4b",
  events: "tbl1wjnnJXBI5a3fy",
  volunteerApplications: "tblonEhsjg3vWumoj",
} as const;

export type PortalRole = "Volunteer" | "Clinic Team" | "Staff" | "Administrator";

type AirtableRecord = {
  id: string;
  fields: Record<string, unknown>;
};

function asText(value: unknown) {
  return typeof value === "string" ? value : "";
}

function asNumber(value: unknown) {
  return typeof value === "number" ? value : null;
}

function asStrings(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function safeDate(value: unknown) {
  const text = asText(value);
  if (!text) return "";
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? "" : text;
}

async function airtableList(
  tableId: string,
  fields: string[],
  options?: { sort?: { field: string; direction?: "asc" | "desc" }[] }
) {
  const token = process.env.AIRTABLE_ACCESS_TOKEN;
  if (!token) throw new Error("AIRTABLE_ACCESS_TOKEN is missing");

  const records: AirtableRecord[] = [];
  let offset: string | undefined;

  do {
    const params = new URLSearchParams();
    params.set("pageSize", "100");
    fields.forEach((field) => params.append("fields[]", field));
    options?.sort?.forEach((sort, index) => {
      params.append(`sort[${index}][field]`, sort.field);
      params.append(`sort[${index}][direction]`, sort.direction || "asc");
    });
    if (offset) params.set("offset", offset);

    const response = await fetch(
      `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${tableId}?${params.toString()}`,
      {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      }
    );

    const result = await response.json();
    if (!response.ok) {
      console.error("Portal Airtable read error", { tableId, result });
      throw new Error("Could not load portal data");
    }

    records.push(...((result.records || []) as AirtableRecord[]));
    offset = result.offset;
  } while (offset && records.length < 500);

  return records;
}

export async function getPortalContext() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const emails = user.emailAddresses.map((item) => normalizeEmail(item.emailAddress));
  const primaryEmail =
    normalizeEmail(
      user.emailAddresses.find((item) => item.id === user.primaryEmailAddressId)?.emailAddress ||
        user.emailAddresses[0]?.emailAddress ||
        ""
    );

  const accessRecords = await airtableList(TABLES.portalAccess, [
    "Email",
    "Display Name",
    "Roles",
    "Active",
  ]);

  const access = accessRecords.find((record) => {
    const email = normalizeEmail(asText(record.fields.Email));
    return email && emails.includes(email) && Boolean(record.fields.Active);
  });

  const roles = asStrings(access?.fields.Roles) as PortalRole[];
  const isAdministrator = roles.includes("Administrator");

  return {
    userId: user.id,
    email: primaryEmail,
    displayName:
      asText(access?.fields["Display Name"]) ||
      [user.firstName, user.lastName].filter(Boolean).join(" ") ||
      primaryEmail,
    roles,
    accessRecordId: access?.id || null,
    hasAccess: Boolean(access),
    canVolunteer: isAdministrator || roles.includes("Volunteer"),
    canClinic: isAdministrator || roles.includes("Clinic Team"),
    canStaff: isAdministrator || roles.includes("Staff"),
    isAdministrator,
  };
}

export async function requirePortalRole(role: Exclude<PortalRole, "Administrator">) {
  const context = await getPortalContext();
  if (!context.hasAccess) redirect("/portal");
  const allowed =
    context.isAdministrator ||
    (role === "Volunteer" && context.canVolunteer) ||
    (role === "Clinic Team" && context.canClinic) ||
    (role === "Staff" && context.canStaff);
  if (!allowed) redirect("/portal");
  return context;
}

export async function getPortalAnnouncements(roles: PortalRole[]) {
  const records = await airtableList(
    TABLES.announcements,
    ["Title", "Audience", "Status", "Message", "Publish Date", "Expires", "Priority", "CTA Label", "CTA URL", "Display Order"],
    { sort: [{ field: "Display Order", direction: "asc" }] }
  );
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return records
    .filter((record) => asText(record.fields.Status) === "Published")
    .filter((record) => {
      const audience = asStrings(record.fields.Audience);
      return audience.includes("All") || audience.some((item) => roles.includes(item as PortalRole));
    })
    .filter((record) => {
      const start = safeDate(record.fields["Publish Date"]);
      const end = safeDate(record.fields.Expires);
      if (start && new Date(start) > today) return false;
      if (end && new Date(end) < today) return false;
      return true;
    })
    .map((record) => ({
      id: record.id,
      title: asText(record.fields.Title),
      message: asText(record.fields.Message),
      priority: asText(record.fields.Priority) || "Normal",
      ctaLabel: asText(record.fields["CTA Label"]),
      ctaUrl: asText(record.fields["CTA URL"]),
    }));
}

export async function getCurrentNeeds(forVolunteers = false) {
  const records = await airtableList(
    TABLES.currentNeeds,
    ["Need", "Area", "Status", "Priority", "Details", "Quantity / Goal", "Show to Volunteers", "CTA Label", "CTA URL", "Display Order"],
    { sort: [{ field: "Display Order", direction: "asc" }] }
  );

  return records
    .filter((record) => asText(record.fields.Status) === "Active")
    .filter((record) => !forVolunteers || Boolean(record.fields["Show to Volunteers"]))
    .map((record) => ({
      id: record.id,
      need: asText(record.fields.Need),
      area: asText(record.fields.Area),
      priority: asText(record.fields.Priority) || "Normal",
      details: asText(record.fields.Details),
      goal: asText(record.fields["Quantity / Goal"]),
      ctaLabel: asText(record.fields["CTA Label"]),
      ctaUrl: asText(record.fields["CTA URL"]),
    }));
}

export async function getVolunteerPortalData(email: string) {
  const volunteers = await airtableList(TABLES.volunteers, [
    "Volunteer Name",
    "Email",
    "Status",
    "Volunteer Areas",
  ]);
  const volunteer = volunteers.find(
    (record) =>
      normalizeEmail(asText(record.fields.Email)) === normalizeEmail(email) &&
      asText(record.fields.Status) === "Active"
  );

  if (!volunteer) {
    return { volunteer: null, shifts: [], hours: [], announcements: [], needs: [] };
  }

  const [shifts, hours, announcements, needs] = await Promise.all([
    airtableList(
      TABLES.volunteerShifts,
      ["Shift", "Volunteer", "Start Date & Time", "End Date & Time", "Area", "Status", "Location", "Notes"],
      { sort: [{ field: "Start Date & Time", direction: "asc" }] }
    ),
    airtableList(
      TABLES.volunteerHours,
      ["Date", "Volunteer", "Hours", "Volunteer Activity", "Notes"],
      { sort: [{ field: "Date", direction: "desc" }] }
    ),
    getPortalAnnouncements(["Volunteer"]),
    getCurrentNeeds(true),
  ]);

  const now = Date.now();

  return {
    volunteer: {
      id: volunteer.id,
      name: asText(volunteer.fields["Volunteer Name"]),
      areas: asStrings(volunteer.fields["Volunteer Areas"]),
    },
    shifts: shifts
      .filter((record) => asStrings(record.fields.Volunteer).includes(volunteer.id))
      .filter((record) => asText(record.fields.Status) !== "Cancelled")
      .filter((record) => {
        const end = safeDate(record.fields["End Date & Time"]) || safeDate(record.fields["Start Date & Time"]);
        return !end || new Date(end).getTime() >= now;
      })
      .slice(0, 12)
      .map((record) => ({
        id: record.id,
        shift: asText(record.fields.Shift),
        start: safeDate(record.fields["Start Date & Time"]),
        end: safeDate(record.fields["End Date & Time"]),
        area: asText(record.fields.Area),
        status: asText(record.fields.Status),
        location: asText(record.fields.Location),
        notes: asText(record.fields.Notes),
      })),
    hours: hours
      .filter((record) => asStrings(record.fields.Volunteer).includes(volunteer.id))
      .slice(0, 8)
      .map((record) => ({
        id: record.id,
        date: safeDate(record.fields.Date),
        hours: asNumber(record.fields.Hours),
        activity: asText(record.fields["Volunteer Activity"]),
        notes: asText(record.fields.Notes),
      })),
    announcements,
    needs,
  };
}

export async function getClinicPortalData(email: string) {
  const members = await airtableList(TABLES.clinicMembers, [
    "Team Member Name",
    "Role",
    "Email",
    "Active",
  ]);
  const member = members.find(
    (record) =>
      normalizeEmail(asText(record.fields.Email)) === normalizeEmail(email) &&
      Boolean(record.fields.Active)
  );

  if (!member) {
    return { member: null, dates: [], announcements: [], inventory: [] };
  }

  const [dates, responses, announcements, inventory] = await Promise.all([
    airtableList(
      TABLES.clinicDates,
      ["Clinic Date", "Clinic Type", "Scheduling Stage", "Volunteer Target", "Confirmed Veterinarians", "Confirmed Vet Techs", "Confirmed Clinic Volunteers", "Staffing Alert"],
      { sort: [{ field: "Clinic Date", direction: "asc" }] }
    ),
    airtableList(TABLES.clinicResponses, [
      "Clinic Date",
      "Team Member",
      "Initial Response",
      "One-Week Reconfirmation",
      "Final Attendance Plan",
      "Notes",
    ]),
    getPortalAnnouncements(["Clinic Team"]),
    airtableList(TABLES.inventory, [
      "Item Name",
      "Area",
      "Category",
      "Unit of Measure",
      "Reorder Point",
      "Target Quantity",
      "Current Quantity",
      "Inventory Status",
      "Active",
    ]),
  ]);

  const dateById = new Map(
    dates.map((record) => [
      record.id,
      {
        id: record.id,
        date: safeDate(record.fields["Clinic Date"]),
        type: asText(record.fields["Clinic Type"]),
        stage: asText(record.fields["Scheduling Stage"]),
        alert: asText(record.fields["Staffing Alert"]),
      },
    ])
  );
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const memberResponses = responses
    .filter((record) => asStrings(record.fields["Team Member"]).includes(member.id))
    .flatMap((record) =>
      asStrings(record.fields["Clinic Date"]).map((dateId) => ({
        responseId: record.id,
        clinic: dateById.get(dateId),
        initialResponse: asText(record.fields["Initial Response"]),
        reconfirmation: asText(record.fields["One-Week Reconfirmation"]),
        finalPlan: asText(record.fields["Final Attendance Plan"]),
        notes: asText(record.fields.Notes),
      }))
    )
    .filter((item) => item.clinic?.date && new Date(item.clinic.date) >= today)
    .sort((a, b) => new Date(a.clinic!.date).getTime() - new Date(b.clinic!.date).getTime());

  return {
    member: {
      id: member.id,
      name: asText(member.fields["Team Member Name"]),
      role: asText(member.fields.Role),
    },
    dates: memberResponses,
    announcements,
    inventory: inventory
      .filter((record) => asText(record.fields.Area) === "Clinic" && Boolean(record.fields.Active))
      .map((record) => ({
        id: record.id,
        name: asText(record.fields["Item Name"]),
        category: asText(record.fields.Category),
        unit: asText(record.fields["Unit of Measure"]),
        current: asNumber(record.fields["Current Quantity"]),
        reorderPoint: asNumber(record.fields["Reorder Point"]),
        target: asNumber(record.fields["Target Quantity"]),
        status: asText(record.fields["Inventory Status"]),
      })),
  };
}

export async function getStaffPortalData() {
  const [needs, inventory, events, clinicDates, volunteerApps, announcements] = await Promise.all([
    getCurrentNeeds(false),
    airtableList(TABLES.inventory, [
      "Item Name",
      "Area",
      "Category",
      "Current Quantity",
      "Inventory Status",
      "Active",
    ]),
    airtableList(
      TABLES.events,
      ["Event Name", "Event Status", "Start Date & Time", "Location Name", "Publish on Website"],
      { sort: [{ field: "Start Date & Time", direction: "asc" }] }
    ),
    airtableList(
      TABLES.clinicDates,
      ["Clinic Date", "Clinic Type", "Scheduling Stage", "Staffing Alert"],
      { sort: [{ field: "Clinic Date", direction: "asc" }] }
    ),
    airtableList(TABLES.volunteerApplications, [
      "Applicant Name",
      "Status",
      "Submitted At",
      "Next Follow-Up Date",
    ]),
    getPortalAnnouncements(["Staff"]),
  ]);

  const now = Date.now();
  const activeInventory = inventory.filter((record) => Boolean(record.fields.Active));
  const inventoryAttention = activeInventory.filter((record) => {
    const status = asText(record.fields["Inventory Status"]).toLowerCase();
    return status && !["ok", "in stock", "good"].includes(status);
  });

  const upcomingEvents = events
    .filter((record) => {
      const date = safeDate(record.fields["Start Date & Time"]);
      return date && new Date(date).getTime() >= now && asText(record.fields["Event Status"]) !== "Cancelled";
    })
    .slice(0, 6)
    .map((record) => ({
      id: record.id,
      name: asText(record.fields["Event Name"]),
      status: asText(record.fields["Event Status"]),
      start: safeDate(record.fields["Start Date & Time"]),
      location: asText(record.fields["Location Name"]),
      published: Boolean(record.fields["Publish on Website"]),
    }));

  const clinicAlerts = clinicDates
    .filter((record) => {
      const date = safeDate(record.fields["Clinic Date"]);
      return date && new Date(date).getTime() >= now && asText(record.fields["Staffing Alert"]);
    })
    .map((record) => ({
      id: record.id,
      date: safeDate(record.fields["Clinic Date"]),
      type: asText(record.fields["Clinic Type"]),
      alert: asText(record.fields["Staffing Alert"]),
    }));

  const volunteerFollowUps = volunteerApps.filter((record) => {
    const status = asText(record.fields.Status);
    return !["Approved", "Declined", "Closed"].includes(status);
  });

  return {
    announcements,
    needs,
    inventory: activeInventory.map((record) => ({
      id: record.id,
      name: asText(record.fields["Item Name"]),
      area: asText(record.fields.Area),
      category: asText(record.fields.Category),
      current: asNumber(record.fields["Current Quantity"]),
      status: asText(record.fields["Inventory Status"]),
    })),
    inventoryAttentionCount: inventoryAttention.length,
    upcomingEvents,
    clinicAlerts,
    volunteerFollowUpCount: volunteerFollowUps.length,
    actionRequiredCount:
      needs.filter((need) => ["High", "Urgent"].includes(need.priority)).length +
      inventoryAttention.length +
      clinicAlerts.length +
      volunteerFollowUps.length,
  };
}

async function airtableCreate(tableId: string, fields: Record<string, unknown>) {
  const token = process.env.AIRTABLE_ACCESS_TOKEN;
  if (!token) throw new Error("AIRTABLE_ACCESS_TOKEN is missing");

  const response = await fetch(
    `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${tableId}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ records: [{ fields }] }),
      cache: "no-store",
    }
  );

  const result = await response.json();
  if (!response.ok) {
    console.error("Portal Airtable create error", { tableId, result });
    throw new Error("Could not save portal data");
  }

  return (result.records?.[0] || null) as AirtableRecord | null;
}

async function airtableUpdate(
  tableId: string,
  recordId: string,
  fields: Record<string, unknown>
) {
  const token = process.env.AIRTABLE_ACCESS_TOKEN;
  if (!token) throw new Error("AIRTABLE_ACCESS_TOKEN is missing");

  const response = await fetch(
    `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${tableId}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ records: [{ id: recordId, fields }] }),
      cache: "no-store",
    }
  );

  const result = await response.json();
  if (!response.ok) {
    console.error("Portal Airtable update error", { tableId, recordId, result });
    throw new Error("Could not update portal data");
  }

  return (result.records?.[0] || null) as AirtableRecord | null;
}

export {
  AIRTABLE_BASE_ID,
  TABLES,
  airtableList,
  airtableCreate,
  airtableUpdate,
  normalizeEmail,
  asText,
  asStrings,
};
