import "server-only";

import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

const AIRTABLE_BASE_ID = "app2vpch2JJVrP9pu";
const CLINICDAY_BASE_ID = "app3AcoD2G64aMsEz";
const CLINICDAY_TABLE_ID = "tblnOw4Qr5AvCRWvQ";

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
  vetClinicPreferences: "tblZ9DrQNMTKgvDbw",
  inventory: "tblTFVIVoeyafVC4b",
  events: "tbl1wjnnJXBI5a3fy",
  volunteerApplications: "tblonEhsjg3vWumoj",
  fosterApplications: "tblFWPjyZMi9DjpBj",
  fosterPlacements: "tbln4l1GQcJrVmmLj",
  animals: "tbliTXWvG7gdf023E",
  medicalRecords: "tblpL1w9JWylKpwQT",
  fosterResources: "tblyMumQGKqH2oGvJ",
  fosterUpdates: "tbl3B6nEH5a495vmS",
} as const;

export type PortalRole = "Volunteer" | "Foster" | "Clinic Team" | "Staff" | "Medical" | "Administrator";

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

  const assignedRoles = asStrings(access?.fields.Roles) as PortalRole[];

  const [volunteers, clinicMembers, fosterApplications] = await Promise.all([
    airtableList(TABLES.volunteers, ["Email", "Status"]),
    airtableList(TABLES.clinicMembers, ["Email", "Active"]),
    airtableList(TABLES.fosterApplications, ["Email", "Status"]),
  ]);

  const matchedVolunteer = volunteers.some(
    (record) =>
      emails.includes(normalizeEmail(asText(record.fields.Email))) &&
      asText(record.fields.Status) === "Active"
  );
  const matchedClinicMember = clinicMembers.some(
    (record) =>
      emails.includes(normalizeEmail(asText(record.fields.Email))) &&
      Boolean(record.fields.Active)
  );
  const matchedFoster = fosterApplications.some(
    (record) =>
      emails.includes(normalizeEmail(asText(record.fields.Email))) &&
      asText(record.fields.Status) === "Approved"
  );

  const roleSet = new Set<PortalRole>(assignedRoles);
  if (matchedVolunteer) roleSet.add("Volunteer");
  if (matchedFoster) roleSet.add("Foster");
  if (matchedClinicMember) roleSet.add("Clinic Team");
  const roles = Array.from(roleSet);
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
    hasAccess: roles.length > 0,
    canVolunteer: isAdministrator || roles.includes("Volunteer"),
    canFoster: isAdministrator || roles.includes("Foster"),
    canClinic: isAdministrator || roles.includes("Clinic Team"),
    canStaff: isAdministrator || roles.includes("Staff"),
    canMedical: isAdministrator || roles.includes("Staff") || roles.includes("Medical"),
    isAdministrator,
  };
}

export async function requirePortalRole(role: Exclude<PortalRole, "Administrator">) {
  const context = await getPortalContext();
  if (!context.hasAccess) redirect("/portal");
  const allowed =
    context.isAdministrator ||
    (role === "Volunteer" && context.canVolunteer) ||
    (role === "Foster" && context.canFoster) ||
    (role === "Clinic Team" && context.canClinic) ||
    (role === "Staff" && context.canStaff) ||
    (role === "Medical" && context.canMedical);
  if (!allowed) redirect("/portal");
  return context;
}

export async function requireAdministrator() {
  const context = await getPortalContext();
  if (!context.isAdministrator) redirect("/portal");
  return context;
}

export async function getPortalAccessRecords() {
  const records = await airtableList(TABLES.portalAccess, [
    "Email",
    "Display Name",
    "Roles",
    "Active",
    "Notes",
  ]);

  return records
    .map((record) => ({
      id: record.id,
      email: asText(record.fields.Email),
      displayName: asText(record.fields["Display Name"]),
      roles: asStrings(record.fields.Roles) as PortalRole[],
      active: Boolean(record.fields.Active),
      notes: asText(record.fields.Notes),
    }))
    .sort((a, b) => (a.displayName || a.email).localeCompare(b.displayName || b.email));
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


export async function getFosterPortalData(email: string) {
  const applications = await airtableList(TABLES.fosterApplications, [
    "First Name",
    "Last Name",
    "Email",
    "Status",
    "Preferred Contact",
    "Phone",
    "Foster Placements",
  ]);

  const application = applications.find(
    (record) =>
      normalizeEmail(asText(record.fields.Email)) === normalizeEmail(email) &&
      asText(record.fields.Status) === "Approved"
  );

  const resourcesPromise = airtableList(
    TABLES.fosterResources,
    ["Title", "Category", "Description", "Link Label", "Link URL", "Active", "Display Order"],
    { sort: [{ field: "Display Order", direction: "asc" }] }
  );

  if (!application) {
    const resources = await resourcesPromise;
    return {
      foster: null,
      placements: [],
      resources: resources
        .filter((record) => Boolean(record.fields.Active))
        .map((record) => ({
          id: record.id,
          title: asText(record.fields.Title),
          category: asText(record.fields.Category),
          description: asText(record.fields.Description),
          linkLabel: asText(record.fields["Link Label"]),
          linkUrl: asText(record.fields["Link URL"]),
        })),
    };
  }

  const [placements, animals, resources, fosterUpdates] = await Promise.all([
    airtableList(
      TABLES.fosterPlacements,
      [
        "Foster Placement ID",
        "Animal",
        "Foster Application",
        "Placement Status",
        "Placement Type",
        "Start Date",
        "Expected End Date",
        "Next Check-In Date",
        "Check-In Status",
        "Care Instructions / Notes",
        "Foster Update Notes",
      ],
      { sort: [{ field: "Start Date", direction: "desc" }] }
    ),
    airtableList(TABLES.animals, [
      "Pet Name",
      "Species",
      "Age Display",
      "Breed",
      "Medical Summary",
      "Primary Photo",
      "Adoption Status",
    ]),
    resourcesPromise,
    airtableList(
      TABLES.fosterUpdates,
      [
        "Update ID",
        "Foster Placement",
        "Animal",
        "Submitted By",
        "Submitted At",
        "Update Type",
        "General Progress",
        "Appetite / Eating",
        "Behavior",
        "Medication / Treatment Update",
        "Supply Need",
        "Health Concern",
        "Behavior Concern",
        "Unable to Continue Placement",
        "Needs Staff Attention",
        "Priority",
        "Photos",
        "Staff Response",
        "Resolution Status",
      ],
      { sort: [{ field: "Submitted At", direction: "desc" }] }
    ),
  ]);

  const animalById = new Map(animals.map((record) => [record.id, record]));

  function attachmentUrl(value: unknown) {
    if (!Array.isArray(value)) return "";
    const first = value[0] as { url?: unknown } | undefined;
    return typeof first?.url === "string" ? first.url : "";
  }

  const fosterPlacements = placements
    .filter((record) => asStrings(record.fields["Foster Application"]).includes(application.id))
    .filter((record) => !["Completed", "Cancelled"].includes(asText(record.fields["Placement Status"])))
    .map((record) => {
      const animalIds = asStrings(record.fields.Animal);
      const placementAnimals = animalIds.map((id) => {
        const animal = animalById.get(id);
        return {
          id,
          name: asText(animal?.fields["Pet Name"]),
          species: asText(animal?.fields.Species),
          age: asText(animal?.fields["Age Display"]),
          breed: asText(animal?.fields.Breed),
          medicalSummary: asText(animal?.fields["Medical Summary"]),
          adoptionStatus: asText(animal?.fields["Adoption Status"]),
          photoUrl: attachmentUrl(animal?.fields["Primary Photo"]),
        };
      });

      return {
        id: record.id,
        placementId: asText(record.fields["Foster Placement ID"]),
        status: asText(record.fields["Placement Status"]),
        type: asText(record.fields["Placement Type"]),
        startDate: safeDate(record.fields["Start Date"]),
        expectedEndDate: safeDate(record.fields["Expected End Date"]),
        nextCheckInDate: safeDate(record.fields["Next Check-In Date"]),
        checkInStatus: asText(record.fields["Check-In Status"]),
        careInstructions: asText(record.fields["Care Instructions / Notes"]),
        updateNotes: asText(record.fields["Foster Update Notes"]),
        animals: placementAnimals,
        updates: fosterUpdates
          .filter((update) => asStrings(update.fields["Foster Placement"]).includes(record.id))
          .slice(0, 8)
          .map((update) => ({
            id: update.id,
            updateId: asText(update.fields["Update ID"]),
            submittedAt: safeDate(update.fields["Submitted At"]),
            submittedBy: asText(update.fields["Submitted By"]),
            updateType: asText(update.fields["Update Type"]),
            generalProgress: asText(update.fields["General Progress"]),
            appetite: asText(update.fields["Appetite / Eating"]),
            behavior: asText(update.fields.Behavior),
            medication: asText(update.fields["Medication / Treatment Update"]),
            supplyNeed: asText(update.fields["Supply Need"]),
            healthConcern: asText(update.fields["Health Concern"]),
            behaviorConcern: asText(update.fields["Behavior Concern"]),
            unableToContinue: Boolean(update.fields["Unable to Continue Placement"]),
            needsStaffAttention: Boolean(update.fields["Needs Staff Attention"]),
            priority: asText(update.fields.Priority),
            photos: Array.isArray(update.fields.Photos)
              ? (update.fields.Photos as { url?: unknown; filename?: unknown }[])
                  .map((photo) => ({
                    url: typeof photo.url === "string" ? photo.url : "",
                    filename: typeof photo.filename === "string" ? photo.filename : "Foster update photo",
                  }))
                  .filter((photo) => photo.url)
              : [],
            staffResponse: asText(update.fields["Staff Response"]),
            resolutionStatus: asText(update.fields["Resolution Status"]),
          })),
      };
    });

  return {
    foster: {
      id: application.id,
      name: [asText(application.fields["First Name"]), asText(application.fields["Last Name"])].filter(Boolean).join(" "),
      email: asText(application.fields.Email),
      phone: asText(application.fields.Phone),
      preferredContact: asText(application.fields["Preferred Contact"]),
    },
    placements: fosterPlacements,
    resources: resources
      .filter((record) => Boolean(record.fields.Active))
      .map((record) => ({
        id: record.id,
        title: asText(record.fields.Title),
        category: asText(record.fields.Category),
        description: asText(record.fields.Description),
        linkLabel: asText(record.fields["Link Label"]),
        linkUrl: asText(record.fields["Link URL"]),
      })),
  };
}

export async function getClinicPortalData(email: string) {
  const members = await airtableList(TABLES.clinicMembers, [
    "Team Member Name",
    "Role",
    "Email",
    "Active",
    "Volunteer Skills",
  ]);
  const member = members.find(
    (record) =>
      normalizeEmail(asText(record.fields.Email)) === normalizeEmail(email) &&
      Boolean(record.fields.Active)
  );

  if (!member) {
    return { member: null, dates: [], vetPreferences: [], teamDates: [], announcements: [], inventory: [] };
  }

  const [dates, responses, announcements, inventory, vetPreferences] = await Promise.all([
    airtableList(
      TABLES.clinicDates,
      ["Clinic Date", "Clinic Type", "ClinicDay Session Type", "Scheduling Stage", "Volunteer Target", "Confirmed Veterinarians", "Confirmed Vet Techs", "Confirmed Clinic Volunteers", "Staffing Alert"],
      { sort: [{ field: "Clinic Date", direction: "asc" }] }
    ),
    airtableList(TABLES.clinicResponses, [
      "Clinic Date",
      "Team Member",
      "Team Member Name",
      "Initial Response",
      "One-Week Reconfirmation",
      "Final Attendance Plan",
      "Confirmed Vet Score",
      "Confirmed Vet Tech Score",
      "Confirmed Volunteer Score",
      "Clinic Assignment",
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
    airtableList(
      TABLES.vetClinicPreferences,
      ["Preference ID", "Veterinarian", "Preferred Clinic Date", "Preferred Clinic Type", "Preference Status", "Notes", "Submitted At", "Clinic Staffing Date"],
      { sort: [{ field: "Preferred Clinic Date", direction: "asc" }] }
    ),
  ]);

  const dateById = new Map(
    dates.map((record) => [
      record.id,
      {
        id: record.id,
        date: safeDate(record.fields["Clinic Date"]),
        type: asText(record.fields["ClinicDay Session Type"]) || asText(record.fields["Clinic Type"]),
        stage: asText(record.fields["Scheduling Stage"]),
        alert: asText(record.fields["Staffing Alert"]),
      },
    ])
  );
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const confirmedNamesByDate = new Map<string, {
    veterinarians: string[];
    vetTechs: string[];
    assignments: Record<string, string[]>;
  }>();
  responses.forEach((response) => {
    const names = asStrings(response.fields["Team Member Name"]);
    if (!names.length) return;

    asStrings(response.fields["Clinic Date"]).forEach((dateId) => {
      const confirmed = confirmedNamesByDate.get(dateId) || { veterinarians: [], vetTechs: [], assignments: {} };
      if ((asNumber(response.fields["Confirmed Vet Score"]) || 0) > 0) {
        confirmed.veterinarians.push(...names);
      }
      if ((asNumber(response.fields["Confirmed Vet Tech Score"]) || 0) > 0) {
        confirmed.vetTechs.push(...names);
      }
      if ((asNumber(response.fields["Confirmed Volunteer Score"]) || 0) > 0) {
        const assignment = asText(response.fields["Clinic Assignment"]);
        if (assignment) confirmed.assignments[assignment] = [...(confirmed.assignments[assignment] || []), ...names];
      }
      confirmedNamesByDate.set(dateId, confirmed);
    });
  });

  const memberResponses = responses
    .filter((record) => asStrings(record.fields["Team Member"]).includes(member.id))
    .flatMap((record) =>
      asStrings(record.fields["Clinic Date"]).map((dateId) => ({
        responseId: record.id,
        clinic: dateById.get(dateId),
        initialResponse: asText(record.fields["Initial Response"]),
        reconfirmation: asText(record.fields["One-Week Reconfirmation"]),
        finalPlan: asText(record.fields["Final Attendance Plan"]),
        assignment: asText(record.fields["Clinic Assignment"]),
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
      skills: asStrings(member.fields["Volunteer Skills"]),
    },
    dates: memberResponses,
    vetPreferences: asText(member.fields.Role) === "Veterinarian"
      ? vetPreferences
          .filter((record) => asStrings(record.fields.Veterinarian).includes(member.id))
          .map((record) => ({
            id: record.id,
            preferenceId: asText(record.fields["Preference ID"]),
            preferredDate: safeDate(record.fields["Preferred Clinic Date"]),
            status: asText(record.fields["Preference Status"]) || "Submitted",
            notes: asText(record.fields.Notes),
            submittedAt: safeDate(record.fields["Submitted At"]),
          }))
      : [],
    teamDates: dates
      .filter((record) => {
        const date = safeDate(record.fields["Clinic Date"]);
        return date && new Date(date) >= today;
      })
      .map((record) => ({
        id: record.id,
        date: safeDate(record.fields["Clinic Date"]),
        type: asText(record.fields["ClinicDay Session Type"]) || asText(record.fields["Clinic Type"]),
        stage: asText(record.fields["Scheduling Stage"]),
        veterinarianNames: confirmedNamesByDate.get(record.id)?.veterinarians || [],
        vetTechNames: confirmedNamesByDate.get(record.id)?.vetTechs || [],
        volunteerAssignments: confirmedNamesByDate.get(record.id)?.assignments || {},
        volunteers: asNumber(record.fields["Confirmed Clinic Volunteers"]),
        volunteerTarget: asNumber(record.fields["Volunteer Target"]),
        alert: asText(record.fields["Staffing Alert"]),
      })),
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
  const [needs, inventory, events, volunteerApps, announcements, fosterUpdates, medical] = await Promise.all([
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
    airtableList(TABLES.volunteerApplications, [
      "Applicant Name",
      "Status",
      "Submitted At",
      "Next Follow-Up Date",
    ]),
    getPortalAnnouncements(["Staff"]),
    airtableList(
      TABLES.fosterUpdates,
      [
        "Update ID",
        "Submitted By",
        "Submitted At",
        "Update Type",
        "General Progress",
        "Supply Need",
        "Health Concern",
        "Behavior Concern",
        "Unable to Continue Placement",
        "Needs Staff Attention",
        "Priority",
        "Staff Response",
        "Resolution Status",
      ],
      { sort: [{ field: "Submitted At", direction: "desc" }] }
    ),
    getMedicalPortalData(),
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

  const volunteerFollowUps = volunteerApps.filter((record) => {
    const status = asText(record.fields.Status);
    return !["Approved", "Declined", "Closed"].includes(status);
  });

  const fosterAlerts = fosterUpdates
    .filter((record) => {
      const status = asText(record.fields["Resolution Status"]);
      return (
        !["Resolved", "Closed"].includes(status) &&
        (
          Boolean(record.fields["Needs Staff Attention"]) ||
          Boolean(record.fields["Unable to Continue Placement"]) ||
          ["High", "Urgent"].includes(asText(record.fields.Priority))
        )
      );
    })
    .map((record) => ({
      id: record.id,
      updateId: asText(record.fields["Update ID"]),
      submittedBy: asText(record.fields["Submitted By"]),
      submittedAt: safeDate(record.fields["Submitted At"]),
      updateType: asText(record.fields["Update Type"]),
      progress: asText(record.fields["General Progress"]),
      supplyNeed: asText(record.fields["Supply Need"]),
      healthConcern: asText(record.fields["Health Concern"]),
      behaviorConcern: asText(record.fields["Behavior Concern"]),
      unableToContinue: Boolean(record.fields["Unable to Continue Placement"]),
      priority: asText(record.fields.Priority) || "Normal",
      staffResponse: asText(record.fields["Staff Response"]),
      resolutionStatus: asText(record.fields["Resolution Status"]) || "New",
    }));

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
    fosterAlerts,
    fosterAlertCount: fosterAlerts.length,
    medical: {
      pendingReview: medical.pendingReview.slice(0, 5),
      pendingReviewCount: medical.pendingReview.length,
      recentRecords: medical.records.slice(0, 5),
      animals: medical.animals,
    },
    volunteerFollowUpCount: volunteerFollowUps.length,
    actionRequiredCount:
      needs.filter((need) => ["High", "Urgent"].includes(need.priority)).length +
      inventoryAttention.length +
      fosterAlerts.length +
      volunteerFollowUps.length +
      medical.pendingReview.length,
  };
}

export async function getMedicalPortalData() {
  const [animals, records] = await Promise.all([
    airtableList(
      TABLES.animals,
      ["Animal ID", "Pet Name", "Species", "Adoption Status", "Medical Summary"],
      { sort: [{ field: "Pet Name", direction: "asc" }] }
    ),
    airtableList(
      TABLES.medicalRecords,
      [
        "Animal",
        "Date / Time",
        "Record Type",
        "Source",
        "Provider / Veterinarian",
        "Reason / Complaint",
        "Assessment / Diagnosis",
        "Treatment / Procedure",
        "Medication / Product",
        "Dose / Route / Frequency",
        "Vaccine / Preventative",
        "Next Due Date",
        "Weight (lb)",
        "Follow-Up Required",
        "Follow-Up Date",
        "Notes",
        "Follow-Up Status",
        "Needs Veterinarian Review",
        "Veterinary Review Status",
        "Entered By Role",
      ],
      { sort: [{ field: "Date / Time", direction: "desc" }] }
    ),
  ]);

  const animalById = new Map(
    animals.map((record) => [
      record.id,
      {
        id: record.id,
        animalId: asText(record.fields["Animal ID"]),
        name: asText(record.fields["Pet Name"]),
        species: asText(record.fields.Species),
        status: asText(record.fields["Adoption Status"]),
        medicalSummary: asText(record.fields["Medical Summary"]),
      },
    ])
  );

  const mappedRecords = records.map((record) => {
    const animal = animalById.get(asStrings(record.fields.Animal)[0]);
    return {
      id: record.id,
      animal,
      dateTime: safeDate(record.fields["Date / Time"]),
      recordType: asText(record.fields["Record Type"]),
      source: asText(record.fields.Source),
      provider: asText(record.fields["Provider / Veterinarian"]),
      reason: asText(record.fields["Reason / Complaint"]),
      assessment: asText(record.fields["Assessment / Diagnosis"]),
      treatment: asText(record.fields["Treatment / Procedure"]),
      medication: asText(record.fields["Medication / Product"]),
      dose: asText(record.fields["Dose / Route / Frequency"]),
      vaccine: asText(record.fields["Vaccine / Preventative"]),
      nextDueDate: safeDate(record.fields["Next Due Date"]),
      weight: asNumber(record.fields["Weight (lb)"]),
      followUpRequired: Boolean(record.fields["Follow-Up Required"]),
      followUpDate: safeDate(record.fields["Follow-Up Date"]),
      notes: asText(record.fields.Notes),
      followUpStatus: asText(record.fields["Follow-Up Status"]),
      needsVeterinarianReview: Boolean(record.fields["Needs Veterinarian Review"]),
      veterinaryReviewStatus: asText(record.fields["Veterinary Review Status"]),
      enteredByRole: asText(record.fields["Entered By Role"]),
    };
  });

  return {
    animals: Array.from(animalById.values()).filter((animal) => animal.name),
    records: mappedRecords,
    pendingReview: mappedRecords.filter(
      (record) =>
        record.needsVeterinarianReview &&
        !["Reviewed", "Resolved"].includes(record.veterinaryReviewStatus)
    ),
  };
}

export async function ensureClinicDayForStaffingDate({
  staffingRecordId,
  clinicDate,
  sessionType,
}: {
  staffingRecordId: string;
  clinicDate: string;
  sessionType: string;
}) {
  const token = process.env.AIRTABLE_ACCESS_TOKEN;
  if (!token) throw new Error("AIRTABLE_ACCESS_TOKEN is missing");
  if (!staffingRecordId || !clinicDate) return null;

  const type = sessionType === "Half Day" ? "Half Day" : "Full Day";
  const params = new URLSearchParams();
  params.set("pageSize", "100");
  ["Clinic_Date", "Clinic Type", "Clinic Day Status"].forEach((field) => params.append("fields[]", field));

  const listResponse = await fetch(
    \`https://api.airtable.com/v0/\${CLINICDAY_BASE_ID}/\${CLINICDAY_TABLE_ID}?\${params.toString()}\`,
    {
      headers: { Authorization: \`Bearer \${token}\` },
      cache: "no-store",
    }
  );
  const listResult = await listResponse.json();
  if (!listResponse.ok) {
    console.error("ClinicDay lookup error", listResult);
    throw new Error("Could not check ClinicDay clinic dates");
  }

  let clinicDayRecord = (listResult.records || []).find(
    (record: AirtableRecord) => asText(record.fields.Clinic_Date) === clinicDate
  ) as AirtableRecord | undefined;

  if (!clinicDayRecord) {
    const capacities =
      type === "Half Day"
        ? {
            "Legacy Surgical Capacity": 12,
            "Non-Surgical Capacity": 5,
            "Base Public Surgical Capacity": 5,
            "Max Capacity": 21,
          }
        : {
            "Legacy Surgical Capacity": 21,
            "Non-Surgical Capacity": 9,
            "Base Public Surgical Capacity": 4,
            "Max Capacity": 30,
          };

    const createResponse = await fetch(
      \`https://api.airtable.com/v0/\${CLINICDAY_BASE_ID}/\${CLINICDAY_TABLE_ID}\`,
      {
        method: "POST",
        headers: {
          Authorization: \`Bearer \${token}\`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          records: [
            {
              fields: {
                Clinic_Date: clinicDate,
                "Clinic Type": type,
                "Clinic Day Status": "Scheduled",
                "Scheduling Hold?": false,
                ...capacities,
              },
            },
          ],
        }),
        cache: "no-store",
      }
    );
    const createResult = await createResponse.json();
    if (!createResponse.ok) {
      console.error("ClinicDay create error", createResult);
      throw new Error("Could not create ClinicDay clinic date");
    }
    clinicDayRecord = createResult.records?.[0] as AirtableRecord | undefined;
  }

  if (!clinicDayRecord) return null;

  await airtableUpdate(TABLES.clinicDates, staffingRecordId, {
    "ClinicDay Record ID": clinicDayRecord.id,
    "ClinicDay Session Type": type,
    "Last ClinicDay Sync": new Date().toISOString(),
  });

  return clinicDayRecord.id;
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

async function airtableUploadAttachment(
  recordId: string,
  fieldId: string,
  file: File
) {
  const token = process.env.AIRTABLE_ACCESS_TOKEN;
  if (!token) throw new Error("AIRTABLE_ACCESS_TOKEN is missing");
  if (!file.type.startsWith("image/")) throw new Error("Only image uploads are allowed");
  if (file.size > 5 * 1024 * 1024) throw new Error("Each photo must be 5 MB or smaller");

  const bytes = Buffer.from(await file.arrayBuffer());
  const response = await fetch(
    `https://content.airtable.com/v0/${AIRTABLE_BASE_ID}/${recordId}/${fieldId}/uploadAttachment`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contentType: file.type || "application/octet-stream",
        file: bytes.toString("base64"),
        filename: file.name || "foster-update-photo",
      }),
      cache: "no-store",
    }
  );

  const result = await response.json();
  if (!response.ok) {
    console.error("Portal Airtable attachment upload error", { recordId, fieldId, result });
    throw new Error("Could not upload foster photo");
  }

  return result;
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
  airtableUploadAttachment,
  airtableUpdate,
  normalizeEmail,
  asText,
  asStrings,
};
