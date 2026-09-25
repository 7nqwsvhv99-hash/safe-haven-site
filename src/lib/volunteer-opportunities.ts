export const volunteerOpportunityNames = [
  "Dog Socializing & Exercise",
  "Cat Socializing & Enrichment",
  "Events & Fundraising",
  "Clinic Team – Front Room",
  "Clinic Team – Back Room Documentation",
  "Clinic Team – Instrument Sterilization",
  "Clinic Team - Veterinarian",
  "Clinic Team - Veterinary Technician",
  "Clinic Team - General Volunteer",
  "Transportation",
  "Pet Food Pantry",
  "Photography & Social Media",
  "Gardening & Grounds",
  "Building Maintenance",
  "Administrative Support",
] as const;

export type VolunteerOpportunity = typeof volunteerOpportunityNames[number];

type OpportunityMeta = {
  volunteerAreas: string[];
  clinicRole?: "Veterinarian" | "Vet Tech" | "Clinic Volunteer";
  clinicSkill?: "Front Room System" | "Back Room System" | "Autoclave" | "General Support";
  requiresTrainingOrVerification?: boolean;
};

export const volunteerOpportunityMeta: Record<VolunteerOpportunity, OpportunityMeta> = {
  "Dog Socializing & Exercise": { volunteerAreas: ["Shelter Care"] },
  "Cat Socializing & Enrichment": { volunteerAreas: ["Shelter Care"] },
  "Events & Fundraising": { volunteerAreas: ["Events", "Fundraising"] },
  "Clinic Team – Front Room": { volunteerAreas: ["Clinic"], clinicRole: "Clinic Volunteer", clinicSkill: "Front Room System", requiresTrainingOrVerification: true },
  "Clinic Team – Back Room Documentation": { volunteerAreas: ["Clinic"], clinicRole: "Clinic Volunteer", clinicSkill: "Back Room System", requiresTrainingOrVerification: true },
  "Clinic Team – Instrument Sterilization": { volunteerAreas: ["Clinic"], clinicRole: "Clinic Volunteer", clinicSkill: "Autoclave", requiresTrainingOrVerification: true },
  "Clinic Team - Veterinarian": { volunteerAreas: ["Clinic"], clinicRole: "Veterinarian", requiresTrainingOrVerification: true },
  "Clinic Team - Veterinary Technician": { volunteerAreas: ["Clinic"], clinicRole: "Vet Tech", requiresTrainingOrVerification: true },
  "Clinic Team - General Volunteer": { volunteerAreas: ["Clinic"], clinicRole: "Clinic Volunteer", clinicSkill: "General Support" },
  "Transportation": { volunteerAreas: ["Transport"] },
  "Pet Food Pantry": { volunteerAreas: ["Other"] },
  "Photography & Social Media": { volunteerAreas: ["Social Media"] },
  "Gardening & Grounds": { volunteerAreas: ["Other"] },
  "Building Maintenance": { volunteerAreas: ["Other"] },
  "Administrative Support": { volunteerAreas: ["Administrative"] },
};

export function isVolunteerOpportunity(value: string): value is VolunteerOpportunity {
  return (volunteerOpportunityNames as readonly string[]).includes(value);
}
