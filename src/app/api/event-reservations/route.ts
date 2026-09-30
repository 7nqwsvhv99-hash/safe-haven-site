import { NextResponse } from "next/server";
import { randomUUID } from "crypto";

const AIRTABLE_BASE_ID="app2vpch2JJVrP9pu";
const EVENTS_TABLE_ID="tbl1wjnnJXBI5a3fy";
const OPTIONS_TABLE_ID="tblVvPwgFWUhjQolD";
const RESERVATIONS_TABLE_ID="tblaAz2TlR1JASNLM";
const PAYPAL_BUSINESS_EMAIL="safehavenbookkeeper1471@gmail.com";

function text(v:FormDataEntryValue|null){return typeof v==="string"?v.trim():"";}

async function airtableGet(table:string,id:string,token:string){
 const response=await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${table}/${id}`,{headers:{Authorization:`Bearer ${token}`},cache:"no-store"});
 const result=await response.json();
 if(!response.ok)throw new Error("Could not load reservation data");
 return result as {id:string;fields:Record<string,unknown>};
}
async function airtableList(table:string,fields:string[],token:string){
 const params=new URLSearchParams();params.set("pageSize","100");
 fields.forEach(f=>params.append("fields[]",f));
 const records:{id:string;fields:Record<string,unknown>}[]=[];let offset:string|undefined;
 do{
  if(offset)params.set("offset",offset);
  const response=await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${table}?${params}`,{headers:{Authorization:`Bearer ${token}`},cache:"no-store"});
  const result=await response.json();if(!response.ok)throw new Error("Could not check reservation capacity");
  records.push(...(result.records||[]));offset=result.offset;
 }while(offset);
 return records as {id:string;fields:Record<string,unknown>}[];
}

export async function POST(request:Request){
 try{
  const token=process.env.AIRTABLE_ACCESS_TOKEN;
  if(!token)return NextResponse.json({error:"Server configuration is incomplete."},{status:500});
  const form=await request.formData();
  const eventId=text(form.get("eventId")), optionId=text(form.get("optionId"));
  const firstName=text(form.get("firstName")),lastName=text(form.get("lastName")),email=text(form.get("email")),phone=text(form.get("phone"));
  const guestNames=text(form.get("guestNames")),specialRequests=text(form.get("specialRequests"));
  const quantity=Math.max(1,Math.min(20,Number(text(form.get("quantity")))||1));
  if(!eventId||!optionId||!firstName||!lastName||!email)return NextResponse.json({error:"Please complete the required reservation fields."},{status:400});

  const [event,option]=await Promise.all([airtableGet(EVENTS_TABLE_ID,eventId,token),airtableGet(OPTIONS_TABLE_ID,optionId,token)]);
  if(event.fields["Publish on Website"]!==true||event.fields["Event Status"]!=="Published")return NextResponse.json({error:"This event is not currently accepting public reservations."},{status:400});
  const optionEvents=Array.isArray(option.fields.Event)?option.fields.Event as string[]:[];
  if(!optionEvents.includes(eventId)||option.fields.Active!==true)return NextResponse.json({error:"That ticket or package is not currently available."},{status:400});
  const today=new Date().toISOString().slice(0,10);
  const salesStart=typeof option.fields["Sales Start"]==="string"?option.fields["Sales Start"]:"";
  const salesEnd=typeof option.fields["Sales End"]==="string"?option.fields["Sales End"]:"";
  if((salesStart&&salesStart>today)||(salesEnd&&salesEnd<today))return NextResponse.json({error:"Sales are not currently open for that option."},{status:400});

  const price=typeof option.fields.Price==="number"?option.fields.Price:0;
  if(price<=0)return NextResponse.json({error:"This paid reservation option is not configured with a valid price."},{status:400});
  const capacity=typeof option.fields["Capacity Units"]==="number"?option.fields["Capacity Units"]:0;
  if(capacity>0){
    const reservations=await airtableList(RESERVATIONS_TABLE_ID,["Ticket / Package Option","Quantity","Reservation Status"],token);
    const used=reservations.filter(r=>{
      const links=Array.isArray(r.fields["Ticket / Package Option"])?r.fields["Ticket / Package Option"] as string[]:[];
      return links.includes(optionId)&&r.fields["Reservation Status"]!=="Cancelled";
    }).reduce((sum,r)=>sum+(typeof r.fields.Quantity==="number"?r.fields.Quantity:0),0);
    if(used+quantity>capacity)return NextResponse.json({error:"There are not enough remaining reservations for that quantity. Please choose a smaller quantity."},{status:409});
  }

  const confirmationNumber=`SH-${new Date().getFullYear()}-${randomUUID().slice(0,8).toUpperCase()}`;
  const eventName=typeof event.fields["Event Name"]==="string"?event.fields["Event Name"]:"Safe Haven Event";
  const optionName=typeof option.fields["Option Name"]==="string"?option.fields["Option Name"]:"Reservation";
  const amount=Number((price*quantity).toFixed(2));
  const response=await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${RESERVATIONS_TABLE_ID}`,{
    method:"POST",headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"},
    body:JSON.stringify({records:[{fields:{
      "Reservation Name":`${confirmationNumber} · ${lastName}`,
      Event:[eventId],"Ticket / Package Option":[optionId],Quantity:quantity,
      "Purchaser First Name":firstName,"Purchaser Last Name":lastName,"Purchaser Email":email,"Purchaser Phone":phone,
      "Guest Names":guestNames,"Special Requests":specialRequests,"Amount Due":amount,"Amount Paid":0,
      "Payment Status":"Pending Payment","Payment Method":"PayPal","Reservation Status":"Pending",
      "Confirmation Number":confirmationNumber,"Submitted At":new Date().toISOString()
    }}],typecast:true}),cache:"no-store"
  });
  const result=await response.json();
  if(!response.ok)throw new Error("Could not save reservation");
  const origin=new URL(request.url).origin;
  return NextResponse.json({
    confirmationNumber,amount,paypalBusinessEmail:PAYPAL_BUSINESS_EMAIL,
    itemName:`${eventName} - ${optionName} x${quantity}`,
    returnUrl:`${origin}/events/reservation-complete?confirmation=${encodeURIComponent(confirmationNumber)}`,
    cancelUrl:`${origin}/events/${eventId}?payment=cancelled`
  });
 }catch(error){
  console.error("Event reservation error",error);
  return NextResponse.json({error:"We could not create your reservation right now. Please try again."},{status:500});
 }
}
