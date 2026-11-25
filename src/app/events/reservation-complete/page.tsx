import { ReservationVerification } from "./reservation-verification";

export default async function ReservationComplete({searchParams}:{searchParams:Promise<{confirmation?:string;token?:string;free?:string}>}){
 const params=await searchParams;
 return <ReservationVerification confirmation={params.confirmation||""} orderId={params.token||""} free={params.free==="1"}/>;
}
