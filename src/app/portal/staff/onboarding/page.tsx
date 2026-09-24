import Link from 'next/link';
import {getOnboardingData,requireOnboarding,readiness,skills,clinicRoles,needsGeneralOrientation,resolveProfileMatches,getClerkAccessStatus} from '@/lib/onboarding';
import {asText,asStrings} from '@/lib/portal';
import {ReviewForm} from './review-form';
import {WaiverForm} from './waiver-form';
import {CompleteOnboardingForm} from './complete-onboarding-form';
import {PortalInvitationForm} from './portal-invitation-form';

export const dynamic='force-dynamic';
const control='mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm';
const card='rounded-2xl border bg-white p-6 shadow-sm';
function files(value:unknown){return (Array.isArray(value)?value:[]).filter((x):x is {id:string;url:string;filename:string}=>Boolean(x&&typeof x==='object'&&'url' in x));}
export default async function OnboardingPage({searchParams}:{searchParams:Promise<{application?:string;q?:string;status?:string}>}) {
 const context=await requireOnboarding();
 const query=await searchParams;const data=await getOnboardingData();
 const filtered=data.applications.filter(r=>(!query.q||[r.fields['Applicant Name'],r.fields.Email].join(' ').toLowerCase().includes(query.q.toLowerCase()))&&(!query.status||(query.status==='Complete'?Boolean(r.fields['Onboarding Complete']):!r.fields['Onboarding Complete']&&asText(r.fields.Status)!=='Closed')));
 const app=data.applications.find(r=>r.id===query.application)||filtered[0];const f=app?.fields||{};
 const autoMatches=app?resolveProfileMatches(f,data.volunteers,data.members):{volunteers:[],members:[]};
 const duplicateMatch=autoMatches.volunteers.length>1||autoMatches.members.length>1;
 const missing=app?[...readiness(f),...(duplicateMatch?['Resolve duplicate existing records']:[])]:[];
 const role=asText(f['Approved Clinic Role']);
 const waiverFiles=files(f['Signed Volunteer Waiver']);
 const hasWaiver=waiverFiles.length>0;
 const reviewSaved=Boolean(f['Onboarding Reviewed At']);
 const completed=Boolean(f['Onboarding Complete']);
 const clerkStatus=completed?await getClerkAccessStatus(asText(f.Email)):null;
 const orientationApplies=app?needsGeneralOrientation(f):false;
 return <main className="min-h-screen bg-slate-50"><div className="container-custom py-10">
  <Link href={context.canStaff?'/portal/staff':'/portal'} className="text-sm font-semibold text-primary">← {context.canStaff?'Staff Portal':'Team Portal'}</Link>
  <div className="my-6"><p className="text-sm font-semibold uppercase tracking-widest text-primary">Staff Portal</p><h1 className="mt-2 text-3xl font-bold">Volunteer Onboarding</h1><p className="mt-3 max-w-3xl text-muted-foreground">Review each application, verify qualifications, record the signed waiver, and connect the volunteer to the right profiles and portal access.</p></div>
  <div className="mb-6 grid gap-3 sm:grid-cols-3">{[['Applications',data.applications.length],['In progress',data.applications.filter(r=>!r.fields['Onboarding Complete']&&r.fields.Status!=='Closed').length],['Complete',data.applications.filter(r=>r.fields['Onboarding Complete']).length]].map(([label,count])=><div className={card} key={label}><p className="text-sm text-muted-foreground">{label}</p><p className="mt-2 text-3xl font-bold">{count}</p></div>)}</div>
  <div className="grid items-start gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
   <aside className={card}><h2 className="text-xl font-bold">Applications</h2><form className="my-4"><label className="text-sm">Search name or email<input name="q" defaultValue={query.q} className={control}/></label><label className="mt-3 block text-sm">Show<select name="status" defaultValue={query.status||''} className={control}><option value="">All applications</option><option value="Open">In progress</option><option>Complete</option></select></label><button className="mt-3 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white">Filter</button></form>
    <nav aria-label="Volunteer applications" className="max-h-[650px] space-y-2 overflow-y-auto">{filtered.map(r=><Link key={r.id} href={'?application='+r.id} aria-current={app?.id===r.id?'page':undefined} className={'block rounded-xl border p-3 '+(app?.id===r.id?'border-primary bg-primary/5':'hover:bg-slate-50')}><p className="font-semibold">{asText(r.fields['Applicant Name'])||'Unnamed applicant'}</p><p className="break-all text-xs text-muted-foreground">{asText(r.fields.Email)}</p><p className="mt-2 text-xs">{r.fields['Onboarding Complete']?'Onboarding complete':asText(r.fields.Status)||'New'}</p></Link>)}</nav>
    {!filtered.length&&<p className="text-sm text-muted-foreground">No matching applications. New submissions will appear here automatically.</p>}
    <Link href="/volunteer-application" className="mt-5 block text-sm font-semibold text-primary">Open volunteer application →</Link>
   </aside>
   {!app?<section className={card}><h2 className="text-xl font-bold">Ready for your first application</h2><p className="mt-3 text-muted-foreground">Have the volunteer complete the application using the email they will use to sign in. Then return here to review and finish onboarding.</p></section>:<div className="space-y-6">
    <section className={card}><h2 className="text-2xl font-bold">{asText(f['Applicant Name'])}</h2><p className="mt-2">{asText(f.Email)} · {asText(f['Cell Phone'])}</p><p className="mt-2 text-sm text-muted-foreground">Submitted {asText(f['Submitted At']).slice(0,10)} · Requested clinic role: {asText(f['Clinic Role Requested'])||'None'}</p><details className="mt-5" open><summary className="cursor-pointer font-semibold">Application details</summary><dl className="mt-4 grid gap-5 sm:grid-cols-2">{['Contact & Address','Emergency Contact','Availability','Experience & Interests','Clinic Experience & Training','Professional Credential Details'].map(key=><div key={key}><dt className="text-sm font-semibold">{key}</dt><dd className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{asText(f[key])||'Not provided'}</dd></div>)}</dl><p className="mt-4 text-sm">Scheduling email consent: {f['Scheduling Email Consent']?'Yes':'No'}</p></details></section>
    <section className={card}><h2 className="text-xl font-bold">1. Review and match existing records</h2><p className="mt-2 text-sm text-muted-foreground">The system matches existing Volunteer and Clinic Team records automatically using the application email, phone number, and existing links. New profiles are created only when no existing record matches.</p>
     <ReviewForm
      applicationId={app.id}
      orientationApplies={orientationApplies}
      initialStatus={asText(f.Status)||'New'}
      initialFollowUp={asText(f['Next Follow-Up Date'])}
      volunteerMatch={autoMatches.volunteers.length===1?{name:asText(autoMatches.volunteers[0].fields['Volunteer Name']),email:asText(autoMatches.volunteers[0].fields.Email)}:null}
      clinicMatch={autoMatches.members.length===1?{name:asText(autoMatches.members[0].fields['Team Member Name']),email:asText(autoMatches.members[0].fields.Email)}:null}
      volunteerAmbiguous={autoMatches.volunteers.length>1}
      clinicAmbiguous={autoMatches.members.length>1}
      initialRole={role}
      initialCredentials={Boolean(f['Credentials Verified'])}
      initialApprovedSkills={asStrings(f['Approved Clinic Skills'])}
      initialNotes={asText(f['Reviewer Notes'])}
      initialSaved={reviewSaved}
      roles={clinicRoles}
      availableSkills={skills}
     />
    </section>
    <section className={card}><h2 className="text-xl font-bold">2. Signed volunteer waiver</h2><p className="mt-2 text-sm text-muted-foreground">Use Safe Haven’s approved waiver. Upload the signed copy here. This records the completed agreement; it does not sign on the volunteer’s behalf.</p>
     {hasWaiver?<>
      <p role="status" className="my-4 rounded-xl border border-green-200 bg-green-50 p-4 text-sm">Signed waiver saved with this application.</p>
      <ul className="mb-4 space-y-2">{waiverFiles.map(file=><li key={file.id}><a className="text-sm font-semibold text-primary underline" href={file.url} target="_blank" rel="noopener noreferrer">{file.filename}</a></li>)}</ul>
      <details className="rounded-xl border bg-slate-50 p-4"><summary className="cursor-pointer text-sm font-semibold text-primary">Replace signed waiver</summary><div className="mt-4"><WaiverForm applicationId={app.id} signer={asText(f['Waiver Signed By'])} signedDate={asText(f['Waiver Signed Date'])}/></div></details>
     </>:<WaiverForm applicationId={app.id} signer={asText(f['Waiver Signed By'])} signedDate={asText(f['Waiver Signed Date'])}/>}

    </section>
    <section className={card}><h2 className="text-xl font-bold">3. Complete onboarding and grant access</h2><p className="mt-2 text-sm text-muted-foreground">This connects the approved volunteer profile, creates or updates the clinic profile when applicable, and grants Volunteer{role?' and Clinic Team':''} access. Staff, Medical, and administrator permissions are never granted here.</p>
     {completed?
      <div className="my-4 rounded-xl border border-green-200 bg-green-50 p-4 text-sm"><p role="status" className="font-semibold">Onboarding complete. Portal access is ready.</p>{clerkStatus==='existing-account'?<p className="mt-2">A portal account already exists for <strong>{asText(f.Email)}</strong>. The volunteer can sign in.</p>:clerkStatus==='pending-invitation'?<p className="mt-2">A first-time account invitation is pending for <strong>{asText(f.Email)}</strong>. The volunteer should use the invitation email to finish account setup.</p>:<div className="mt-2"><p>No Clerk account or pending invitation was found for <strong>{asText(f.Email)}</strong>.</p><PortalInvitationForm applicationId={app.id}/></div>}<div className="mt-3 flex flex-wrap gap-3"><Link href="/sign-up" className="font-semibold text-primary underline">First-time user: Sign up</Link><Link href="/sign-in" className="font-semibold text-primary underline">Returning user: Sign in</Link></div></div>
      :<>
       {missing.length?<div className="my-4 rounded-xl bg-amber-50 p-4 text-sm"><p className="font-semibold">Still needed</p><ul className="mt-2 list-disc pl-5">{missing.map(item=><li key={item}>{item}</li>)}</ul></div>:<p className="my-4 rounded-xl bg-green-50 p-4 text-sm">All required review items are recorded.</p>}
       <CompleteOnboardingForm applicationId={app.id} disabled={Boolean(missing.length)}/>
      </>}
     <p className="mt-5 text-xs text-muted-foreground">Last reviewed by {asText(f['Onboarding Reviewed By'])||'No reviewer yet'} {asText(f['Onboarding Reviewed At']).replace('T',' ').slice(0,16)}</p>
    </section>
   </div>}
  </div>
 </div></main>;
}
