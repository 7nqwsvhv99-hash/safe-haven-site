import Link from "next/link";
import { requirePortalRole } from "@/lib/portal";
import { notFound } from "next/navigation";
import { SurgicalCapacityPlanner } from "./surgical-capacity-planner";

export const dynamic = "force-dynamic";
const SCHEDULERS = new Set(["jenpopp@hotmail.com", "rachelyn001@yahoo.com"]);
export default async function PlannerPage() {
  const context = await requirePortalRole("Clinic Team");
  if (!context.isAdministrator && !SCHEDULERS.has(context.email.trim().toLowerCase())) notFound();
  return <main className="mx-auto max-w-5xl px-4 py-8 md:px-8">
    <Link href="/portal/clinic" className="text-sm font-semibold text-primary hover:underline">← Clinic Team Portal</Link>
    <div className="mt-5"><SurgicalCapacityPlanner /></div>
  </main>;
}
