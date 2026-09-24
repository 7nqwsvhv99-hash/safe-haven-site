'use client';

import {useState} from 'react';

const control='mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm';

export function ClinicRoleFields({
 initialRole,
 initialCredentials,
 roles,
}:{initialRole:string;initialCredentials:boolean;roles:string[]}) {
 const [role,setRole]=useState(initialRole);
 const professional=role==='Veterinarian'||role==='Vet Tech';

 return <>
  <label className="block text-sm font-medium">Approved clinic role
   <select name="clinicRole" value={role} onChange={event=>setRole(event.target.value)} className={control}>
    <option value="">Not a clinic team member / not approved yet</option>
    {roles.map(item=><option key={item} value={item}>{item==='Vet Tech'?'Veterinary Technician':item}</option>)}
   </select>
  </label>
  {professional&&<label className="flex items-start gap-3 text-sm">
   <input type="checkbox" name="credentials" defaultChecked={initialCredentials} className="mt-1"/>
   I verified the professional credentials for the {role==='Veterinarian'?'veterinarian':'veterinary technician'} role.
  </label>}
 </>;
}
