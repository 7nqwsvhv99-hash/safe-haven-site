'use client';

import {FormEvent,useState} from 'react';
import {useRouter} from 'next/navigation';
import {completeOnboarding,type OnboardingActionState} from './actions';

export function CompleteOnboardingForm({applicationId,disabled}:{applicationId:string;disabled:boolean}){
 const router=useRouter();
 const [pending,setPending]=useState(false);
 const [state,setState]=useState<OnboardingActionState>({ok:false,message:''});

 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();
  if(pending||disabled)return;
  setPending(true);
  setState({ok:false,message:''});
  try{
   const result=await completeOnboarding({ok:false,message:''},new FormData(event.currentTarget));
   setState(result);
   if(result.ok)router.refresh();
  }catch{
   setState({ok:false,message:'Could not complete onboarding. Please retry.'});
  }finally{
   setPending(false);
  }
 }

 return <form onSubmit={submit}>
  <input type="hidden" name="applicationId" value={applicationId}/>
  <label className="mb-4 flex gap-3 text-sm"><input required type="checkbox" name="confirm"/>I confirm the identity, record matches, waiver, and approved role/skills are correct.</label>
  {state.message&&<p role={state.ok?'status':'alert'} className={state.ok?'mb-4 rounded-xl border border-green-200 bg-green-50 p-3 text-sm':'mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm'}>{state.message}</p>}
  <button disabled={disabled||pending} className="rounded-full bg-primary px-5 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">
   {pending?'Completing onboarding…':'Complete onboarding and grant access'}
  </button>
 </form>;
}
