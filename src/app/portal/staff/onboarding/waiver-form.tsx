'use client';

import {FormEvent,useRef,useState} from 'react';
import {useRouter} from 'next/navigation';

type WaiverSaveState={ok:boolean;message:string};

const control='mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm';

export function WaiverForm({applicationId,signer,signedDate}:{applicationId:string;signer:string;signedDate:string}){
 const formRef=useRef<HTMLFormElement>(null);
 const router=useRouter();
 const [pending,setPending]=useState(false);
 const [state,setState]=useState<WaiverSaveState>({ok:false,message:''});

 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();
  if(pending)return;

  const formData=new FormData(event.currentTarget);
  const file=formData.get('waiver');
  if(!(file instanceof File)||!file.size){
   setState({ok:false,message:'Choose the signed waiver file before saving.'});
   return;
  }
  if(file.size>5*1024*1024){
   setState({ok:false,message:'Upload a signed PDF, JPG, or PNG up to 5 MB.'});
   return;
  }

  setPending(true);
  setState({ok:false,message:''});

  try{
   const response=await fetch('/api/portal/staff/onboarding/waiver',{
    method:'POST',
    body:formData,
    credentials:'same-origin',
   });
   const result=await response.json().catch(()=>({ok:false,message:'The server returned an unexpected response.'})) as WaiverSaveState;
   if(!response.ok||!result.ok){
    setState({ok:false,message:result.message||'Could not save the signed waiver. Please retry.'});
    return;
   }

   setState(result);
   const fileInput=formRef.current?.elements.namedItem('waiver');
   if(fileInput instanceof HTMLInputElement)fileInput.value='';
   const verified=formRef.current?.elements.namedItem('verified');
   if(verified instanceof HTMLInputElement)verified.checked=false;
   router.refresh();
  }catch(error){
   console.error('Signed waiver upload failed',error);
   setState({ok:false,message:'Could not save the signed waiver. Please retry.'});
  }finally{
   setPending(false);
  }
 }

 return <form ref={formRef} onSubmit={submit} className="space-y-4">
  <input type="hidden" name="applicationId" value={applicationId}/>
  <label className="block text-sm font-medium">Signed document
   <input required type="file" name="waiver" accept="application/pdf,image/jpeg,image/png" className={control}/>
  </label>
  <div className="grid gap-4 sm:grid-cols-2">
   <label className="text-sm font-medium">Volunteer or Guardian Who Signed the Waiver<input required name="signer" defaultValue={signer} className={control}/></label>
   <label className="text-sm font-medium">Date Waiver Signed<input required type="date" name="signedDate" defaultValue={signedDate} className={control}/></label>
  </div>
  <label className="flex gap-3 text-sm"><input required type="checkbox" name="verified"/>I reviewed this signed waiver, including guardian requirements where applicable.</label>
  {state.message&&<p role={state.ok?'status':'alert'} className={state.ok?'rounded-xl border border-green-200 bg-green-50 p-3 text-sm':'rounded-xl border border-red-200 bg-red-50 p-3 text-sm'}>{state.message}</p>}
  <button disabled={pending} className="rounded-full border border-primary px-5 py-3 font-semibold text-primary disabled:cursor-wait disabled:opacity-60">
   {pending?'Saving signed waiver…':'Save signed waiver'}
  </button>
 </form>;
}
