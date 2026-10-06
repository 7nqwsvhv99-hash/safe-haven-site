// General shelter participation must be explicit, even when a clinic member has a volunteer profile.
export function hasGeneralVolunteerParticipation(details: string, areas: readonly string[]) {
  const line = details.split(/\r?\n/).find(value => value.startsWith("Volunteer Interests:"));
  const interests = line ? line.slice("Volunteer Interests:".length).split(",").map(value => value.trim()).filter(Boolean) : [];
  return interests.some(interest => !interest.startsWith("Clinic Team")) ||
    areas.some(area => area.trim() && area !== "Clinic");
}

export function splitSubmittedDates<T extends { preferredDate: string }>(dates: readonly T[], today: string) {
  return {
    upcoming: dates.filter(item => item.preferredDate && item.preferredDate.slice(0, 10) >= today),
    past: dates.filter(item => item.preferredDate && item.preferredDate.slice(0, 10) < today)
      .sort((a, b) => b.preferredDate.localeCompare(a.preferredDate)),
  };
}

export function isAssignedVeterinarian(role: string, assignment: string, initialResponse: string) {
  return role === "Veterinarian" && assignment === "Veterinarian" && initialResponse === "Yes";
}
