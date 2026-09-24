import Link from 'next/link';
import {getOnboardingData,requireOnboarding,readiness,skills,clinicRoles} from '@/lib/onboarding';
import {asText,asStrings} from '@/lib/portal';
import {saveReview,completeOnboarding} from './actions';
import {ClinicRoleFields} from './clinic-role-fields';
import {WaiverForm} from './waiver-form';

export const dynamic='force-dynamic';
const control='mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm';
const card='rounded-2xl border bg-white p-6 shadow-sm';
function files(value:unknown){return (Array.isArray(value)?value:[]).filter((x):x is {id:string;url:string;filename:string}=>Boolean(x&&typeof x==='object'&&'url' in x));}
export default async function OnboardingPage({searchParams}:{searchParams:Promise<{application?:string;q?:string;status?:string;message?:string}>}) {
 const context=await requireOnboarding();
 const query=await searchParams;const data=await getOnboardingData();
 const filtered=data.applications.filter(r=>(!query.q||[r.fields['Applicant Name'],r.fields.Email].join(' ').toLowerCase().includes(query.q.toLowerCase()))&&(!query.status||(query.status==='Complete'?Boolean(r.fields['Onboarding Complete']):!r.fields['Onboarding Complete']&&asText(r.fields.Status)!=='Closed')));
 const app=data.applications.find(r=>r.id===query.application)||filtered[0];const f=app?.fields||{};
 const missing=app?readiness(f):[];
 const role=asText(f['Approved Clinic Role']);
 return <main className="min-h-screen bg-slate-50"><div className="container-custom py-10">
  <Link href={context.canStaff?'/portal/staff':'/portal'} className="text-sm font-semibold text-primary">← {context.canStaff?'Staff Portal':'Team Portal'}</Link>
  <div className="my-6"><p className="text-sm font-semibold uppercase tracking-widest text-primary">Staff Portal</p><h1 className="mt-2 text-3xl font-bold">Volunteer Onboarding</h1><p className="mt-3 max-w-3xl text-muted-foreground">Review each application, verify qualifications, record the signed waiver, and connect the volunteer to the right profiles and portal access.</p></div>
  <div className="mb-6 grid gap-3 sm:grid-cols-3">{[['Applications',data.applications.length],['In progress',data.applications.filter(r=>!r.fields['Onboarding Complete']&&r.fields.Status!=='Closed').length],['Complete',data.applications.filter(r=>r.fields['Onboarding Complete']).length]].map(([label,count])=><div className={card} key={label}><p className="text-sm text-muted-foreground">{label}</p><p className="mt-2 text-3xl font-bold">{count}</p></div>)}</div>
  {query.message&&<p role="status" className="mb-6 rounded-xl border border-primary/20 bg-primary/5 p-4">{query.message}</p>}
  <div className="grid items-start gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
   <aside className={card}><h2 className="text-xl font-bold">Applications</h2><form className="my-4"><label className="text-sm">Search name or email<input name="q" defaultValue={query.q} className={control}/></label><label className="mt-3 block text-sm">Show<select name="status" defaultValue={query.status||''} className={control}><option value="">All applications</option><option value="Open">In progress</option><option>Complete</option></select></label><button className="mt-3 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white">Filter</button></form>
    <nav aria-label="Volunteer applications" className="max-h-[650px] space-y-2 overflow-y-auto">{filtered.map(r=><Link key={r.id} href={'?application='+r.id} aria-current={app?.id===r.id?'page':undefined} className={'block rounded-xl border p-3 '+(app?.id===r.id?'border-primary bg-primary/5':'hover:bg-slate-50')}><p className="font-semibold">{asText(r.fields['Applicant Name'])||'Unnamed applicant'}</p><p className="break-all text-xs text-muted-foreground">{asText(r.fields.Email)}</p><p className="mt-2 text-xs">{r.fields['Onboarding Complete']?'Onboarding complete':asText(r.fields.Status)||'New'}</p></Link>)}</nav>
    {!filtered.length&&<p className="text-sm text-muted-foreground">No matching applications. New submissions will appear here automatically.</p>}
    <Link href="/volunteer-application" className="mt-5 block text-sm font-semibold text-primary">Open volunteer application →</Link>
   </aside>
   {!app?<section className={card}><h2 className="text-xl font-bold">Ready for your first application</h2><p className="mt-3 text-muted-foreground">Have the volunteer complete the application using the email they will use to sign in. Then return here to review and finish onboarding.</p></section>:<div className="space-y-6">
    <section className={card}><h2 className="text-2xl font-bold">{asText(f['Applicant Name'])}</h2><p className="mt-2">{asText(f.Email)} · {asText(f['Cell Phone'])}</p><p className="mt-2 text-sm text-muted-foreground">Submitted {asText(f['Submitted At']).slice(0,10)} · Requested clinic role: {asText(f['Clinic Role Requested'])||'None'}</p><details className="mt-5" open><summary className="cursor-pointer font-semibold">Application details</summary><dl className="mt-4 grid gap-5 sm:grid-cols-2">{['Contact & Address','Emergency Contact','Availability','Experience & Interests','Clinic Experience & Training','Professional Credential Details'].map(key=><div key={key}><dt className="text-sm font-semibold">{key}</dt><dd className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{asText(f[key])||'Not provided'}</dd></div>)}</dl><p className="mt-4 text-sm">Scheduling email consent: {f['Scheduling Email Consent']?'Yes':'No'}</p></details></section>
    <section className={card}><h2 className="text-xl font-bold">1. Review and match existing records</h2><p className="mt-2 text-sm text-muted-foreground">Select an existing profile when this person already volunteers. Otherwise, leave it blank and a profile will be created when onboarding is completed.</p>
     <form action={saveReview} className="mt-5 space-y-5"><input type="hidden" name="applicationId" value={app.id}/>
      <div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-medium">Review status<select name="status" defaultValue={asText(f.Status)||'New'} className={control}>{['New','In Review','Contacted',...(f.Status==='Approved'?['Approved']:[]),'Closed'].map(s=><option key={s}>{s}</option>)}</select></label><label className="text-sm font-medium">Scheduled orientation or training date<input type="date" name="followUp" defaultValue={asText(f['Next Follow-Up Date'])} className={control}/><span className="mt-1 block text-xs font-normal text-muted-foreground">Use this for the next planned onboarding step, such as general Safe Haven orientation or clinic-day training.</span></label>
      <label className="text-sm font-medium">Existing volunteer profile<select name="volunteerId" defaultValue={asStrings(f.Volunteers)[0]||''} className={control}><option value="">Match by email or create at completion</option>{data.volunteers.map(r=><option key={r.id} value={r.id}>{asText(r.fields['Volunteer Name'])} · {asText(r.fields.Email)||'Email missing'}</option>)}</select></label><label className="text-sm font-medium">Existing clinic team member<select name="memberId" defaultValue={asStrings(f['Clinic Team Member'])[0]||''} className={control}><option value="">Match by email or create if needed</option>{data.members.map(r=><option key={r.id} value={r.id}>{asText(r.fields['Team Member Name'])} · {asText(r.fields.Email)||'Email missing'}</option>)}</select></label></div>
      <ClinicRoleFields initialRole={role} initialCredentials={Boolean(f['Credentials Verified'])} roles={clinicRoles}/>
      <fieldset><legend className="text-sm font-semibold">Trained and approved clinic assignments</legend><p className="mt-1 text-xs text-muted-foreground">Select only skills the volunteer is ready to perform. General Support is appropriate for a volunteer who is not yet trained in a specialist position.</p><div className="mt-3 grid gap-3 sm:grid-cols-2">{skills.map(skill=><label key={skill} className="flex gap-2 text-sm"><input type="checkbox" name="skill" value={skill} defaultChecked={asStrings(f['Approved Clinic Skills']).includes(skill)}/>{skill}</label>)}</div></fieldset>
      <label className="block text-sm font-medium">Review notes<textarea name="notes" rows={4} defaultValue={asText(f['Reviewer Notes'])} className={control} placeholder="Orientation or training details, credential check, scheduling notes, or record-matching notes"/></label>
      <button className="rounded-full bg-primary px-5 py-3 font-semibold text-white">Save review</button>
     </form>
    </section>
    <section className={card}><h2 className="text-xl font-bold">2. Signed volunteer waiver</h2><p className="mt-2 text-sm text-muted-foreground">Use Safe Haven’s approved waiver. Upload the signed copy here. This records the completed agreement; it does not sign on the volunteer’s behalf.</p>
     <ul className="my-4 space-y-2">{files(f['Signed Volunteer Waiver']).map(file=><li key={file.id}><a className="text-sm font-semibold text-primary underline" href={file.url} target="_blank" rel="noopener noreferrer">{file.filename}</a></li>)}</ul>
     <WaiverForm applicationId={app.id} signer={asText(f['Waiver Signed By'])} signedDate={asText(f['Waiver Signed Date'])}/>
    </section>
    <section className={card}><h2 className="text-xl font-bold">3. Complete onboarding and grant access</h2><p className="mt-2 text-sm text-muted-foreground">This connects the approved volunteer profile, creates or updates the clinic profile when applicable, and grants Volunteer{role?' and Clinic Team':''} access. Staff, Medical, and administrator permissions are never granted here.</p>
     {missing.length?<div className="my-4 rounded-xl bg-amber-50 p-4 text-sm"><p className="font-semibold">Still needed</p><ul className="mt-2 list-disc pl-5">{missing.map(item=><li key={item}>{item}</li>)}</ul></div>:<p className="my-4 rounded-xl bg-green-50 p-4 text-sm">All required review items are recorded.</p>}
     <form action={completeOnboarding}><input type="hidden" name="applicationId" value={app.id}/><label className="mb-4 flex gap-3 text-sm"><input required type="checkbox" name="confirm"/>I confirm the identity, record matches, waiver, and approved role/skills are correct.</label><button disabled={Boolean(missing.length)} className="rounded-full bg-primary px-5 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">{f['Onboarding Complete']?'Confirm profiles and access':'Complete onboarding and grant access'}</button></form>
     <p className="mt-5 text-xs text-muted-foreground">Last reviewed by {asText(f['Onboarding Reviewed By'])||'No reviewer yet'} {asText(f['Onboarding Reviewed At']).replace('T',' ').slice(0,16)}</p>
    </section>
   </div>}
  </div>
 </div></main>;
}
