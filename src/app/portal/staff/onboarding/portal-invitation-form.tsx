'use client';

import {FormEvent,useState} from 'react';
import {useRouter} from 'next/navigation';
import {sendPortalInvitation,type OnboardingActionState} from './actions';

export function PortalInvitationForm({applicationId}:{applicationId:string}){
 const router=useRouter();
 const [pending,setPending]=useState(false);
 const [state,setState]=useState<OnboardingActionState>({ok:false,message:''});

 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();
  if(pending)return;
  setPending(true);
  setState({ok:false,message:''});
  try{
   const result=await sendPortalInvitation({ok:false,message:''},new FormData(event.currentTarget));
   setState(result);
   if(result.ok)router.refresh();
  }catch(error){
   console.error('Portal invitation failed',error);
   setState({ok:false,message:'Could not send the account invitation. Please retry.'});
  }finally{
   setPending(false);
  }
 }

 return <form onSubmit={submit} className="mt-3">
  <input type="hidden" name="applicationId" value={applicationId}/>
  {state.message&&<p role={state.ok?'status':'alert'} className={state.ok?'mb-3 rounded-xl border border-green-200 bg-green-50 p-3 text-sm':'mb-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm'}>{state.message}</p>}
  <button disabled={pending} className="rounded-full bg-primary px-4 py-2 font-semibold text-white disabled:cursor-wait disabled:opacity-60">
   {pending?'Sending invitation…':'Send account invitation'}
  </button>
 </form>;
}
