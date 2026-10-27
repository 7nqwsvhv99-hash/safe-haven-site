"use client";
import { useFormStatus } from "react-dom";
export function SaveCountButton({saved=false}:{saved?:boolean}){
 const {pending}=useFormStatus();
 return <button type="submit" disabled={pending} aria-live="polite" className="rounded-full border border-primary px-4 py-2.5 text-sm font-semibold text-primary disabled:opacity-60">{pending?"Saving…":saved?"Saved":"Save count"}</button>;
}
