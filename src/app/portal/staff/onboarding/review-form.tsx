'use client';

import {FormEvent,useState} from 'react';
import {useRouter} from 'next/navigation';
import {saveReview,type OnboardingActionState} from './actions';

const control='mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm';

type PersonOption={id:string;name:string;email:string};

export function ReviewForm({
 applicationId,orientationApplies,initialStatus,initialFollowUp,initialVolunteerId,initialMemberId,initialRole,
 initialCredentials,initialApprovedSkills,initialNotes,initialSaved,volunteers,members,roles,availableSkills
}:{
 applicationId:string;orientationApplies:boolean;initialStatus:string;initialFollowUp:string;initialVolunteerId:string;initialMemberId:string;
 initialRole:string;initialCredentials:boolean;initialApprovedSkills:string[];initialNotes:string;initialSaved:boolean;
 volunteers:PersonOption[];members:PersonOption[];roles:string[];availableSkills:string[];
}){
 const router=useRouter();
 const [pending,setPending]=useState(false);
 const [state,setState]=useState<OnboardingActionState>({ok:false,message:''});
 const [saved,setSaved]=useState(initialSaved);
 const [status,setStatus]=useState(initialStatus);
 const [followUp,setFollowUp]=useState(initialFollowUp);
 const [volunteerId,setVolunteerId]=useState(initialVolunteerId);
 const [memberId,setMemberId]=useState(initialMemberId);
 const [role,setRole]=useState(initialRole);
 const [credentials,setCredentials]=useState(initialCredentials);
 const [approvedSkills,setApprovedSkills]=useState(initialApprovedSkills);
 const [notes,setNotes]=useState(initialNotes);
 const professional=role==='Veterinarian'||role==='Vet Tech';

 function toggleSkill(skill:string){
  setApprovedSkills(current=>current.includes(skill)?current.filter(item=>item!==skill):[...current,skill]);
 }

 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();
  if(pending)return;
  setPending(true);
  setState({ok:false,message:''});
  try{
   const result=await saveReview({ok:false,message:''},new FormData(event.currentTarget));
   setState(result);
   if(result.ok){
    setSaved(true);
    router.refresh();
   }
  }catch{
   setState({ok:false,message:'Could not save. Please retry.'});
  }finally{
   setPending(false);
  }
 }

 const statusOptions=[
  {value:'New',label:'New'},
  {value:'In Review',label:'In Review'},
  {value:'Contacted',label:'Contacted'},
  ...(initialStatus==='Approved'?[{value:'Approved',label:'Approved / Onboarding Complete'}]:[]),
  {value:'Closed',label:'Closed / Not Moving Forward'},
 ];

 return <form onSubmit={submit} className="mt-5 space-y-5">
  <input type="hidden" name="applicationId" value={applicationId}/>
  <div className="grid gap-4 sm:grid-cols-2">
   <label className="text-sm font-medium">Review status
    <select name="status" value={status} onChange={event=>setStatus(event.target.value)} className={control}>
     {statusOptions.map(option=><option key={option.value} value={option.value}>{option.label}</option>)}
    </select>
   </label>
   {orientationApplies&&<label className="text-sm font-medium">Scheduled Orientation Date
    <input type="date" name="followUp" value={followUp} onChange={event=>setFollowUp(event.target.value)} className={control}/>
   </label>}
   <label className="text-sm font-medium">Existing volunteer profile
    <select name="volunteerId" value={volunteerId} onChange={event=>setVolunteerId(event.target.value)} className={control}>
     <option value="">Match by email or create at completion</option>
     {volunteers.map(person=><option key={person.id} value={person.id}>{person.name} · {person.email||'Email missing'}</option>)}
    </select>
   </label>
   <label className="text-sm font-medium">Existing clinic team member
    <select name="memberId" value={memberId} onChange={event=>setMemberId(event.target.value)} className={control}>
     <option value="">Match by email or create if needed</option>
     {members.map(person=><option key={person.id} value={person.id}>{person.name} · {person.email||'Email missing'}</option>)}
    </select>
   </label>
  </div>

  <label className="block text-sm font-medium">Approved clinic role
   <select name="clinicRole" value={role} onChange={event=>setRole(event.target.value)} className={control}>
    <option value="">Not a clinic team member / not approved yet</option>
    {roles.map(item=><option key={item} value={item}>{item==='Vet Tech'?'Veterinary Technician':item}</option>)}
   </select>
  </label>

  {professional&&<label className="flex items-start gap-3 text-sm">
   <input type="checkbox" name="credentials" checked={credentials} onChange={event=>setCredentials(event.target.checked)} className="mt-1"/>
   I verified the professional credentials for the {role==='Veterinarian'?'veterinarian':'veterinary technician'} role.
  </label>}

  <fieldset>
   <legend className="text-sm font-semibold">Trained and approved clinic assignments</legend>
   <p className="mt-1 text-xs text-muted-foreground">Select only skills the volunteer is ready to perform. General Support is appropriate for a volunteer who is not yet trained in a specialist position.</p>
   <div className="mt-3 grid gap-3 sm:grid-cols-2">
    {availableSkills.map(skill=><label key={skill} className="flex gap-2 text-sm">
     <input type="checkbox" name="skill" value={skill} checked={approvedSkills.includes(skill)} onChange={()=>toggleSkill(skill)}/>{skill}
    </label>)}
   </div>
  </fieldset>

  <label className="block text-sm font-medium">Review notes
   <textarea name="notes" rows={4} value={notes} onChange={event=>setNotes(event.target.value)} className={control} placeholder="Orientation details, credential check, scheduling notes, or record-matching notes"/>
  </label>

  {state.message&&!state.ok&&<p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm">{state.message}</p>}
  {saved&&<p role="status" className="rounded-xl border border-green-200 bg-green-50 p-3 text-sm">Review saved.</p>}
  <button disabled={pending} className="rounded-full bg-primary px-5 py-3 font-semibold text-white disabled:cursor-wait disabled:opacity-60">
   {pending?'Saving review…':saved?'Update review':'Save review'}
  </button>
 </form>;
}
