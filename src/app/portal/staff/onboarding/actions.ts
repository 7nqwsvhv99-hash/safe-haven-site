'use server';
import {onboardingAccess} from '@/lib/onboarding-policy';
import {revalidatePath} from 'next/cache';
import {requireOnboarding,getOnboardingData,readiness,skills,clinicRoles,needsGeneralOrientation,resolveProfileMatches,hasLikelyEmailTypo,ensureClerkInvitation} from '@/lib/onboarding';
import {airtableUpdate,airtableCreate,airtableUploadAttachment,TABLES,asText,asStrings,normalizeEmail} from '@/lib/portal';
const path='/portal/staff/onboarding';
export type OnboardingActionState={ok:boolean;message:string};
async function execute(form:FormData,action:(data:Awaited<ReturnType<typeof getOnboardingData>>,app:Awaited<ReturnType<typeof getOnboardingData>>['applications'][number],email:string)=>Promise<string>):Promise<OnboardingActionState> {
  const context=await requireOnboarding();
  const id=String(form.get('applicationId')||'');
  try {
    const data=await getOnboardingData();
    const app=data.applications.find(r=>r.id===id);
    if(!app)throw Error('Application not found.');
    const message=await action(data,app,context.email);
    revalidatePath(path);revalidatePath('/portal');
    return {ok:true,message};
  } catch(error) {
    return {ok:false,message:error instanceof Error?error.message:'Could not save. Please retry.'};
  }
}
export async function saveReview(_previous:OnboardingActionState,form:FormData):Promise<OnboardingActionState> {
 return execute(form,async(data,app,email)=>{
  const role=String(form.get('clinicRole')||'');
  if(role&&!clinicRoles.includes(role))throw Error('Choose a valid clinic role.');
  const approved=form.getAll('skill').map(String);
  if(approved.some(s=>!skills.includes(s)))throw Error('Choose valid clinic skills.');
  const credentials=form.get('credentials')==='on';
  if(['Veterinarian','Vet Tech'].includes(role)&&!credentials)throw Error('Verify professional credentials before approving this clinic role.');
  const matches=resolveProfileMatches(app.fields,data.volunteers,data.members);
  if(matches.volunteers.length>1||matches.members.length>1)throw Error('Multiple existing records match this applicant. Reconcile the duplicate records before continuing.');
  const volunteer=matches.volunteers[0]?.id||'';
  const member=matches.members[0]?.id||'';
  const status=String(form.get('status')||'In Review');
  if(!['New','In Review','Contacted','Approved','Closed'].includes(status))throw Error('Invalid status.');
  if(status==='Approved'&&asText(app.fields.Status)!=='Approved')throw Error('Use Complete onboarding to approve a new applicant.');
  await airtableUpdate(TABLES.volunteerApplications,app.id,{
   Status:status,'Approved Clinic Role':role||null,'Approved Clinic Skills':approved,
   'Credentials Verified':credentials,
   'Volunteers':volunteer?[volunteer]:[],'Clinic Team Member':member?[member]:[],
   'Reviewer Notes':String(form.get('notes')||''),'Next Follow-Up Date':needsGeneralOrientation(app.fields)?(String(form.get('followUp')||'')||null):null,
   'Onboarding Reviewed By':email,'Onboarding Reviewed At':new Date().toISOString()
  });
  return 'Review saved.';
 });
}
export type WaiverSaveState={ok:boolean;message:string};
export async function saveWaiver(_previous:WaiverSaveState,form:FormData):Promise<WaiverSaveState> {
 await requireOnboarding();
 const id=String(form.get('applicationId')||'');
 try {
  const data=await getOnboardingData();
  const app=data.applications.find(r=>r.id===id);
  if(!app)throw Error('Application not found.');
  const file=form.get('waiver');const signer=String(form.get('signer')||'').trim();const date=String(form.get('signedDate')||'');
  if(!signer||!/^\d{4}-\d{2}-\d{2}$/.test(date)||date>new Date().toISOString().slice(0,10)||form.get('verified')!=='on')throw Error('Enter the signer and signing date, and confirm you reviewed the signed document.');
  if(!(file instanceof File)||!file.size||!['application/pdf','image/jpeg','image/png'].includes(file.type)||file.size>5*1024*1024)throw Error('Upload a signed PDF, JPG, or PNG up to 5 MB.');
  await airtableUploadAttachment(app.id,'fldd0FD8FDEKWNFgj',file,true);
  await airtableUpdate(TABLES.volunteerApplications,app.id,{'Waiver Signed By':signer,'Waiver Signed Date':date});
  revalidatePath(path);revalidatePath('/portal');
  return {ok:true,message:'Signed waiver saved with this application.'};
 } catch(error) {
  return {ok:false,message:error instanceof Error?error.message:'Could not save. Please retry.'};
 }
}
export async function completeOnboarding(_previous:OnboardingActionState,form:FormData):Promise<OnboardingActionState> {
 return execute(form,async(data,app,reviewer)=>{
  if(app.fields.Status==='Closed')throw Error('This application is Closed / Not Moving Forward. Change the review status before completing onboarding.');
  const missing=readiness(app.fields);if(missing.length)throw Error('Still needed: '+missing.join(', ')+'.');
  if(form.get('confirm')!=='on')throw Error('Confirm the review before completing onboarding.');
  const f=app.fields,email=normalizeEmail(asText(f.Email)),name=asText(f['Applicant Name']),role=asText(f['Approved Clinic Role']);
  if(hasLikelyEmailTypo(email))throw Error('The applicant email appears to contain a Gmail domain typo. Correct the application email before completing onboarding.');
  const matched=resolveProfileMatches(f,data.volunteers,data.members);
  const volunteers=matched.volunteers;
  const members=matched.members;
  const accesses=data.access.filter(r=>normalizeEmail(asText(r.fields.Email))===email);
  if(volunteers.length>1||members.length>1||accesses.length>1)throw Error('Multiple records match this person. Reconcile the duplicate records before completing onboarding.');
  const profileFields={'Volunteer Name':name,Email:email,'Cell Phone':asText(f['Cell Phone']),Availability:asText(f.Availability),'Application Interests / Experience':asText(f['Experience & Interests']),Status:'Active',Application:Array.from(new Set([...(volunteers[0]?asStrings(volunteers[0].fields.Application):[]),app.id]))};
  const volunteer=volunteers[0]?await airtableUpdate(TABLES.volunteers,volunteers[0].id,profileFields):await airtableCreate(TABLES.volunteers,profileFields);
  if(!volunteer)throw Error('Could not save volunteer profile.');
  // Persist the link before later steps so retrying a partial completion reuses the same profile.
  await airtableUpdate(TABLES.volunteerApplications,app.id,{Volunteers:[volunteer.id]});
  let member=members[0];
  if(role){
   const fields={'Team Member Name':name,Email:email,Phone:asText(f['Cell Phone']),Role:role,Active:true,'Receive Scheduling Emails':Boolean(f['Scheduling Email Consent']),'Volunteer Record':[volunteer.id],'Volunteer Skills':asStrings(f['Approved Clinic Skills'])};
   const saved=member?await airtableUpdate(TABLES.clinicMembers,member.id,fields):await airtableCreate(TABLES.clinicMembers,fields);
   if(!saved)throw Error('Could not save clinic profile.');member=saved;
   await airtableUpdate(TABLES.volunteerApplications,app.id,{'Clinic Team Member':[member.id]});
  }
  // Volunteer and Clinic Team access are recognized automatically from the active roster records above.
  // If an exact-email Portal Access row already exists, keep it aligned; do not create a duplicate row here.
  if(accesses[0]){
   const granted=onboardingAccess(asStrings(accesses[0].fields.Roles),role);
   await airtableUpdate(TABLES.portalAccess,accesses[0].id,{Roles:granted,Active:true,'Display Name':name});
  }
  await airtableUpdate(TABLES.volunteerApplications,app.id,{Status:'Approved','Onboarding Complete':true,'Decision Date':new Date().toISOString().slice(0,10),'Onboarding Reviewed By':reviewer,'Onboarding Reviewed At':new Date().toISOString()});
  try{
   const clerk=await ensureClerkInvitation(email);
   return 'Onboarding complete. Portal access is ready. '+clerk.message;
  }catch(error){
   console.error('Could not create Clerk invitation',error);
   return 'Onboarding complete. Portal access is ready, but the account invitation could not be sent automatically. Ask the volunteer to use Sign up with '+email+'.';
  }
 });
}
