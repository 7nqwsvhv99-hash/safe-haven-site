'use server';
import {onboardingAccess} from '@/lib/onboarding-policy';
import {redirect} from 'next/navigation';
import {revalidatePath} from 'next/cache';
import {requireOnboarding,getOnboardingData,readiness,skills,clinicRoles} from '@/lib/onboarding';
import {airtableUpdate,airtableCreate,airtableUploadAttachment,TABLES,asText,asStrings,normalizeEmail} from '@/lib/portal';
const path='/portal/staff/onboarding';
async function execute(form:FormData,action:(data:Awaited<ReturnType<typeof getOnboardingData>>,app:Awaited<ReturnType<typeof getOnboardingData>>['applications'][number],email:string)=>Promise<string>) {
  const context=await requireOnboarding();
  const id=String(form.get('applicationId')||'');
  let message='';
  try {
    const data=await getOnboardingData();
    const app=data.applications.find(r=>r.id===id);
    if(!app)throw Error('Application not found.');
    message=await action(data,app,context.email);
  } catch(error) {message=error instanceof Error?error.message:'Could not save. Please retry.';}
  revalidatePath(path);revalidatePath('/portal');
  redirect(path+'?application='+encodeURIComponent(id)+'&message='+encodeURIComponent(message));
}
export async function saveReview(form:FormData) {
 await execute(form,async(data,app,email)=>{
  const role=String(form.get('clinicRole')||'');
  if(role&&!clinicRoles.includes(role))throw Error('Choose a valid clinic role.');
  const approved=form.getAll('skill').map(String);
  if(approved.some(s=>!skills.includes(s)))throw Error('Choose valid clinic skills.');
  const credentials=form.get('credentials')==='on';
  if(['Veterinarian','Vet Tech'].includes(role)&&!credentials)throw Error('Verify professional credentials before approving this clinic role.');
  const volunteer=String(form.get('volunteerId')||'');const member=String(form.get('memberId')||'');
  if(volunteer&&!data.volunteers.some(r=>r.id===volunteer))throw Error('Volunteer profile not found.');
  if(member&&!data.members.some(r=>r.id===member))throw Error('Clinic member not found.');
  const status=String(form.get('status')||'In Review');
  if(!['New','In Review','Contacted','Approved','Closed'].includes(status))throw Error('Invalid status.');
  if(status==='Approved'&&asText(app.fields.Status)!=='Approved')throw Error('Use Complete onboarding to approve a new applicant.');
  await airtableUpdate(TABLES.volunteerApplications,app.id,{
   Status:status,'Approved Clinic Role':role||null,'Approved Clinic Skills':approved,
   'Credentials Verified':credentials,'Orientation Completed':form.get('orientation')==='on',
   'Volunteers':volunteer?[volunteer]:[],'Clinic Team Member':member?[member]:[],
   'Reviewer Notes':String(form.get('notes')||''),'Next Follow-Up Date':String(form.get('followUp')||'')||null,
   'Onboarding Reviewed By':email,'Onboarding Reviewed At':new Date().toISOString()
  });
  return 'Review saved. Complete onboarding when the remaining requirements are satisfied.';
 });
}
export async function saveWaiver(form:FormData) {
 await execute(form,async(_data,app,email)=>{
  const file=form.get('waiver');const signer=String(form.get('signer')||'').trim();const date=String(form.get('signedDate')||'');
  if(!signer||!/^\d{4}-\d{2}-\d{2}$/.test(date)||date>new Date().toISOString().slice(0,10)||form.get('verified')!=='on')throw Error('Enter the signer and signing date, and confirm you reviewed the signed document.');
  if(!(file instanceof File)||!file.size||!['application/pdf','image/jpeg','image/png'].includes(file.type)||file.size>5*1024*1024)throw Error('Upload a signed PDF, JPG, or PNG up to 5 MB.');
  await airtableUploadAttachment(app.id,'fldd0FD8FDEKWNFgj',file,true);
  await airtableUpdate(TABLES.volunteerApplications,app.id,{'Waiver Signed By':signer,'Waiver Signed Date':date,'Onboarding Reviewed By':email,'Onboarding Reviewed At':new Date().toISOString()});
  return 'Signed waiver saved with this application.';
 });
}
export async function completeOnboarding(form:FormData) {
 await execute(form,async(data,app,reviewer)=>{
  if(app.fields.Status==='Closed')throw Error('Reopen this application in the review before completing onboarding.');
  const missing=readiness(app.fields);if(missing.length)throw Error('Still needed: '+missing.join(', ')+'.');
  if(form.get('confirm')!=='on')throw Error('Confirm the review before completing onboarding.');
  const f=app.fields,email=normalizeEmail(asText(f.Email)),name=asText(f['Applicant Name']),role=asText(f['Approved Clinic Role']);
  const matches=(rows:typeof data.volunteers,links:string[])=>rows.filter(r=>links.includes(r.id)||normalizeEmail(asText(r.fields.Email))===email);
  const volunteers=matches(data.volunteers,asStrings(f.Volunteers));
  const members=matches(data.members,asStrings(f['Clinic Team Member']));
  const accesses=data.access.filter(r=>normalizeEmail(asText(r.fields.Email))===email);
  if(volunteers.length>1||members.length>1||accesses.length>1)throw Error('Multiple records match this person. Reconcile the duplicate records before completing onboarding.');
  if(role&&!members.length&&data.members.some(r=>!asText(r.fields.Email)&&asText(r.fields['Team Member Name']).split(/\s+/)[0].toLowerCase()===name.split(/\s+/)[0].toLowerCase()))throw Error('An existing clinic member may have a missing email. Select their existing record in the review first.');
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
  const granted=onboardingAccess(accesses[0]?asStrings(accesses[0].fields.Roles):[],role);
  // No client-provided roles are accepted here. Only administrators assign privileged roles.
  if(accesses[0])await airtableUpdate(TABLES.portalAccess,accesses[0].id,{Roles:granted,Active:true});
  else await airtableCreate(TABLES.portalAccess,{Email:email,'Display Name':name,Roles:granted,Active:true});
  await airtableUpdate(TABLES.volunteerApplications,app.id,{Status:'Approved','Onboarding Complete':true,'Decision Date':new Date().toISOString().slice(0,10),'Onboarding Reviewed By':reviewer,'Onboarding Reviewed At':new Date().toISOString()});
  return 'Onboarding complete. Roster links and Volunteer'+(role?' and Clinic Team':'')+' portal access are ready. The volunteer can sign in using '+email+'.';
 });
}
