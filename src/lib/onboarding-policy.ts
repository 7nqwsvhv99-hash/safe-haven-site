export function canManageOnboarding(roles:readonly string[]) {
 return roles.some(role=>['Volunteer Coordinator','Shelter Manager','Administrator'].includes(role));
}
export function onboardingAccess(existing:readonly string[],clinicRole:string) {
 return Array.from(new Set([...existing,'Volunteer',...(['Veterinarian','Vet Tech','Clinic Volunteer'].includes(clinicRole)?['Clinic Team']:[])]));
}
