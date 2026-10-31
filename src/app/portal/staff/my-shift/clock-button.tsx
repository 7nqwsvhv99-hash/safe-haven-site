"use client";
import {useFormStatus} from "react-dom";
export default function ClockButton({clockedIn}:{clockedIn:boolean}){const {pending}=useFormStatus();return <button disabled={pending} className={`rounded-full px-6 py-3 font-semibold text-white disabled:opacity-70 ${clockedIn?"bg-orange-500":"bg-orange-500"}`}>{pending?"Saving…":clockedIn?"Clock Out":"Clock In"}</button>}
