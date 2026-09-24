'use client';

import {useFormState,useFormStatus} from 'react-dom';
import {saveWaiver,type WaiverSaveState} from './actions';

const control='mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm';
const initialState:WaiverSaveState={ok:false,message:''};

function SaveButton(){
 const {pending}=useFormStatus();
 return <button disabled={pending} className="rounded-full border border-primary px-5 py-3 font-semibold text-primary disabled:cursor-wait disabled:opacity-60">
  {pending?'Saving signed waiver…':'Save signed waiver'}
 </button>;
}

export function WaiverForm({applicationId,signer,signedDate}:{applicationId:string;signer:string;signedDate:string}){
 const [state,formAction]=useFormState(saveWaiver,initialState);
 return <form action={formAction} className="space-y-4">
  <input type="hidden" name="applicationId" value={applicationId}/>
  <label className="block text-sm font-medium">Signed document
   <input required type="file" name="waiver" accept="application/pdf,image/jpeg,image/png" className={control}/>
  </label>
  <div className="grid gap-4 sm:grid-cols-2">
   <label className="text-sm font-medium">Signed by<input required name="signer" defaultValue={signer} className={control}/></label>
   <label className="text-sm font-medium">Signing date<input required type="date" name="signedDate" defaultValue={signedDate} className={control}/></label>
  </div>
  <label className="flex gap-3 text-sm"><input required type="checkbox" name="verified"/>I reviewed this signed waiver, including guardian requirements where applicable.</label>
  {state.message&&<p role="status" className={state.ok?'rounded-xl border border-green-200 bg-green-50 p-3 text-sm':'rounded-xl border border-red-200 bg-red-50 p-3 text-sm'}>{state.message}</p>}
  <SaveButton/>
 </form>;
}
