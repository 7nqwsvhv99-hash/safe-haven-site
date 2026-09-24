import {NextResponse} from 'next/server';
import {
  airtableList,
  airtableUpdate,
  airtableUploadAttachment,
  getPortalContext,
  TABLES,
} from '@/lib/portal';

export const runtime='nodejs';

export async function POST(request:Request){
 try{
  const context=await getPortalContext();
  if(!context.canOnboard){
   return NextResponse.json({ok:false,message:'You do not have permission to manage volunteer onboarding.'},{status:403});
  }

  const form=await request.formData();
  const applicationId=String(form.get('applicationId')||'');
  const signer=String(form.get('signer')||'').trim();
  const signedDate=String(form.get('signedDate')||'');
  const verified=form.get('verified')==='on';
  const file=form.get('waiver');

  if(!/^rec[A-Za-z0-9]{14}$/.test(applicationId)){
   return NextResponse.json({ok:false,message:'Application not found.'},{status:400});
  }
  if(!signer||!/^\d{4}-\d{2}-\d{2}$/.test(signedDate)||signedDate>new Date().toISOString().slice(0,10)||!verified){
   return NextResponse.json({ok:false,message:'Enter the signer and signing date, and confirm you reviewed the signed document.'},{status:400});
  }
  if(!(file instanceof File)||!file.size||!['application/pdf','image/jpeg','image/png'].includes(file.type)||file.size>5*1024*1024){
   return NextResponse.json({ok:false,message:'Upload a signed PDF, JPG, or PNG up to 5 MB.'},{status:400});
  }

  const applications=await airtableList(TABLES.volunteerApplications,['Applicant Name'],{
   filterByFormula:"RECORD_ID()='"+applicationId+"'",
  });
  if(!applications.length){
   return NextResponse.json({ok:false,message:'Application not found.'},{status:404});
  }

  await airtableUploadAttachment(applicationId,'fldd0FD8FDEKWNFgj',file,true);
  await airtableUpdate(TABLES.volunteerApplications,applicationId,{
   'Waiver Signed By':signer,
   'Waiver Signed Date':signedDate,
  });

  return NextResponse.json({ok:true,message:'Signed waiver saved with this application.'});
 }catch(error){
  console.error('Volunteer waiver upload route failed',error);
  return NextResponse.json({ok:false,message:'Could not save the signed waiver. Please retry.'},{status:500});
 }
}
