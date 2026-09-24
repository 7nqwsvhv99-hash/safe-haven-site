import 'server-only';
import {redirect} from 'next/navigation';
import {getPortalContext, airtableList, TABLES, asText, asStrings} from './portal';

export const skills=['Front Room System','Back Room System','Autoclave','General Support'];
export const clinicRoles=['Veterinarian','Vet Tech','Clinic Volunteer'];
export async function requireOnboarding() {
  const context=await getPortalContext();
  if(!context.canOnboard)redirect('/portal');
  return context;
}
export async function getOnboardingData() {
  await requireOnboarding();
  const [applications,volunteers,members,access]=await Promise.all([
    airtableList(TABLES.volunteerApplications,['Applicant Name','Email','Cell Phone','Status','Submitted At','Contact & Address','Availability','Experience & Interests','Emergency Contact','Clinic Role Requested','Clinic Experience & Training','Professional Credential Details','Preferred Contact','Scheduling Email Consent','Approved Clinic Role','Approved Clinic Skills','Clinic Team Member','Volunteers','Reviewer Notes','Next Follow-Up Date','Credentials Verified','Orientation Completed','Onboarding Complete','Onboarding Reviewed By','Onboarding Reviewed At','Signed Volunteer Waiver','Waiver Signed By','Waiver Signed Date'],{sort:[{field:'Submitted At',direction:'desc'}]}),
    airtableList(TABLES.volunteers,['Volunteer Name','Email','Status','Application']),
    airtableList(TABLES.clinicMembers,['Team Member Name','Email','Role','Active','Volunteer Record','Volunteer Skills']),
    airtableList(TABLES.portalAccess,['Email','Display Name','Roles','Active'])
  ]);
  return {applications,volunteers,members,access};
}
export function needsGeneralOrientation(fields:Record<string,unknown>) {
  const details=asText(fields['Experience & Interests']);
  const line=details.split(/\r?\n/).find(value=>value.startsWith('Volunteer Interests:'));
  const interests=line?line.slice('Volunteer Interests:'.length).split(',').map(value=>value.trim()).filter(Boolean):[];
  if(interests.length)return interests.some(interest=>!interest.startsWith('Clinic Team'));
  return !asText(fields['Clinic Role Requested']);
}
export function readiness(fields:Record<string,unknown>) {
  const missing:string[]=[];
  if(!asText(fields.Email)||!asText(fields['Applicant Name']))missing.push('Name and email');
  const role=asText(fields['Approved Clinic Role']);
  if(asText(fields['Clinic Role Requested'])&&!role)missing.push('Approved clinic role');
  if(['Veterinarian','Vet Tech'].includes(role)&&!fields['Credentials Verified'])missing.push('Credential verification');
  if(role==='Clinic Volunteer'&&!asStrings(fields['Approved Clinic Skills']).length)missing.push('At least one approved clinic skill');
  if(!Array.isArray(fields['Signed Volunteer Waiver'])||!fields['Signed Volunteer Waiver'].length||!asText(fields['Waiver Signed By'])||!asText(fields['Waiver Signed Date']))missing.push('Signed waiver with signer and date');
  return missing;
}
