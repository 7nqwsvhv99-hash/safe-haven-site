export function canManageOnboarding(roles:readonly string[]) {
 return roles.some(role=>['Volunteer Coordinator','Shelter Manager','Administrator'].includes(role));
}
export function onboardingAccess(existing:readonly string[],clinicRole:string,generalVolunteer=true) {
 return Array.from(new Set([...existing.filter(role=>generalVolunteer||role!=='Volunteer'),...(generalVolunteer?['Volunteer']:[]),...(['Veterinarian','Vet Tech','Clinic Volunteer'].includes(clinicRole)?['Clinic Team']:[])]));
}
