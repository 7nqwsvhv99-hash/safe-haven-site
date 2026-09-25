import 'server-only';
import {redirect} from 'next/navigation';
import {clerkClient} from '@clerk/nextjs/server';
import {getPortalContext, airtableList, TABLES, asText, asStrings} from './portal';

export const skills=['Front Room System','Back Room System','Autoclave','General Support'];
export const clinicRoles=['Veterinarian','Vet Tech','Clinic Volunteer'];
export type ClerkAccessStatus='existing-account'|'pending-invitation'|'no-account';
export async function getClerkAccessStatus(email:string):Promise<ClerkAccessStatus>{
  const normalized=email.trim().toLowerCase();
  if(!normalized)return 'no-account';
  const client=await clerkClient();
  const users=await client.users.getUserList({emailAddress:[normalized],limit:1});
  if(users.data.length)return 'existing-account';
  const invitations=await client.invitations.getInvitationList({query:normalized,status:'pending',limit:10});
  if(invitations.data.some(invitation=>invitation.emailAddress.trim().toLowerCase()===normalized))return 'pending-invitation';
  return 'no-account';
}
export async function ensureClerkInvitation(email:string){
  const normalized=email.trim().toLowerCase();
  const status=await getClerkAccessStatus(normalized);
  if(status==='existing-account')return {status,message:'An existing portal account was found. The volunteer can sign in with '+normalized+'.'};
  if(status==='pending-invitation')return {status,message:'A portal account invitation is already pending for '+normalized+'.'};
  const client=await clerkClient();
  await client.invitations.createInvitation({emailAddress:normalized,redirectUrl:'/sign-up',notify:true,expiresInDays:30});
  return {status:'pending-invitation' as const,message:'A first-time portal account invitation was sent to '+normalized+'.'};
}
export async function requireOnboarding(write=false) {
  const context=await getPortalContext();
  if(!(context.canOnboard || (!write && context.canViewOnboarding)))redirect('/portal');
  return context;
}
export async function getOnboardingData() {
  await requireOnboarding();
  const [applications,volunteers,members,access]=await Promise.all([
    airtableList(TABLES.volunteerApplications,['Applicant Name','Email','Cell Phone','Status','Submitted At','Contact & Address','Availability','Experience & Interests','Emergency Contact','Clinic Role Requested','Clinic Experience & Training','Professional Credential Details','Preferred Contact','Scheduling Email Consent','Approved Clinic Role','Approved Clinic Skills','Clinic Team Member','Volunteers','Reviewer Notes','Next Follow-Up Date','Credentials Verified','Orientation Completed','Onboarding Complete','Onboarding Reviewed By','Onboarding Reviewed At','Signed Volunteer Waiver','Waiver Signed By','Waiver Signed Date'],{sort:[{field:'Submitted At',direction:'desc'}]}),
    airtableList(TABLES.volunteers,['Volunteer Name','Email','Cell Phone','Status','Application']),
    airtableList(TABLES.clinicMembers,['Team Member Name','Email','Phone','Role','Active','Volunteer Record','Volunteer Skills']),
    airtableList(TABLES.portalAccess,['Email','Display Name','Roles','Active'])
  ]);
  return {applications,volunteers,members,access};
}
function normalizePhone(value:string){return value.replace(/\D/g,'').slice(-10);}
export function hasLikelyEmailTypo(value:string){
  const email=value.trim().toLowerCase();
  const domain=email.split('@')[1]||'';
  return ['gamail.com','gamil.com','gmial.com','gmal.com'].includes(domain);
}
export function resolveProfileMatches(
  fields:Record<string,unknown>,
  volunteers:Array<{id:string;fields:Record<string,unknown>}>,
  members:Array<{id:string;fields:Record<string,unknown>}>
){
  const email=asText(fields.Email).trim().toLowerCase();
  const phone=normalizePhone(asText(fields['Cell Phone']));
  const linkedVolunteers=new Set(asStrings(fields.Volunteers));
  const linkedMembers=new Set(asStrings(fields['Clinic Team Member']));
  const matches=(rows:Array<{id:string;fields:Record<string,unknown>}>,emailField:string,phoneField:string,linked:Set<string>)=>
    rows.filter(record=>{
      const recordEmail=asText(record.fields[emailField]).trim().toLowerCase();
      const recordPhone=normalizePhone(asText(record.fields[phoneField]));
      if(email&&recordEmail===email)return true;
      if(phone&&recordPhone===phone)return true;
      if(linked.has(record.id)&&(!recordEmail&&!recordPhone))return true;
      return false;
    });
  return {
    volunteers:matches(volunteers,'Email','Cell Phone',linkedVolunteers),
    members:matches(members,'Email','Phone',linkedMembers),
  };
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
