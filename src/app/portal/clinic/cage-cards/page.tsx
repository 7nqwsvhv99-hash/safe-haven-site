import Link from "next/link";
import { requirePortalRole } from "@/lib/portal";
import { loadClinicDayCageCards } from "@/lib/clinicday-cage-cards";
import { CageCardPrintClient } from "@/components/clinic-cage-cards/cage-card-print-client";

export const dynamic = "force-dynamic";

export default async function SafeHavenCageCardsPage() {
  await requirePortalRole("Clinic Team", "read");
  let data;
  try {
    data = await loadClinicDayCageCards();
  } catch (error) {
    return <main className="mx-auto max-w-4xl px-6 py-12">
      <Link className="text-orange-600 hover:underline" href="/portal/clinic">← Clinic Team Portal</Link>
      <h1 className="mt-7 text-3xl font-bold">Print Cage Cards</h1>
      <p role="alert" className="mt-5 rounded-xl border border-amber-300 bg-amber-50 p-5 text-amber-950">
        {error instanceof Error ? error.message : "The ClinicDay connection could not be loaded. Please try again."}
      </p>
    </main>;
  }
  return <main className="mx-auto max-w-6xl px-4 py-9 md:px-8">
    <Link className="text-sm font-semibold text-orange-600 hover:underline" href="/portal/clinic">← Clinic Team Portal</Link>
    <CageCardPrintClient data={data} />
  </main>;
}
