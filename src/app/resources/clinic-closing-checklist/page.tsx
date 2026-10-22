import Link from "next/link";

const sections = [
  {
    title: "1. Patient release & ClinicDay records",
    owner: "Front Room System + Back Room Documentation",
    items: [
      "Confirm that every patient has been released to the correct owner, rescue representative, or authorized caregiver. Escalate any discrepancy immediately.",
      "Confirm each visit has the correct release and completion status in ClinicDay; reconcile patients still showing in recovery or awaiting pickup.",
      "Verify that discharge instructions, rabies certificates, and other required documents were provided or arranged.",
      "Reconcile payments, refunds, and outstanding balances. Flag anything that needs follow-up.",
      "Flag incomplete case notes, missing services, or data discrepancies for the appropriate team member rather than guessing or silently closing records."
    ]
  },
  {
    title: "2. Surgery & recovery areas",
    owner: "Back Room volunteers + veterinary team",
    items: [
      "Confirm the veterinary team has finished all patient-related clinical tasks and cleared the areas for closing.",
      "Remove used disposable materials and waste according to clinic policy; keep sharps and regulated medical waste in approved containers.",
      "Clean and disinfect examination, surgery-support, recovery, and cage surfaces with approved products, observing their required contact times.",
      "Clean and return cages, carriers, blankets, towels, and handling equipment to designated locations; separate items awaiting laundering.",
      "Restock clean bedding and essential supplies for the next clinic."
    ]
  },
  {
    title: "3. Instruments & sterilization",
    owner: "Instrument Sterilization volunteer + trained staff",
    items: [
      "Account for used instrument sets and move contaminated instruments through the designated dirty-to-clean workflow.",
      "Clean, inspect, assemble, wrap, and label instrument packs only as trained and per the clinic's approved procedure.",
      "Confirm sterilization cycles, indicators, and required records are reviewed by the designated trained person. Do not assume a pack is sterile because a cycle finished.",
      "Store cleared sterile packs in their designated clean, dry location; segregate questionable or damaged packs for reprocessing.",
      "Leave the autoclave, sink, counters, and instrument workstations clean and in the manufacturer-recommended end-of-day condition."
    ]
  },
  {
    title: "4. Medications, vaccines & clinical handoff",
    owner: "Veterinarian / veterinary technician only",
    items: [
      "Confirm required medical documentation and controlled-substance logs or reconciliations are complete according to clinic policy.",
      "Secure controlled drugs, other medications, and clinical equipment in designated locations.",
      "Check that vaccines and other temperature-sensitive products have been returned to approved storage.",
      "Communicate adverse events, follow-up care, medication concerns, or outstanding clinical issues to the responsible person."
    ]
  },
  {
    title: "5. Inventory & operational reset",
    owner: "General Volunteers + designated inventory lead",
    items: [
      "Restock frequently used items in the front room, preparation area, surgery, recovery, and sterilization stations.",
      "Check for supplies running low and record reorder needs in the Clinic Inventory tool; do not place orders unless authorized.",
      "Note expired, damaged, or unusable items and separate them according to policy.",
      "Return equipment, paperwork, labels, and reusable materials to their assigned locations.",
      "Remove trash and recycling and replenish trash liners, cleaning products, gloves, and hand-hygiene supplies."
    ]
  },
  {
    title: "6. Final walkthrough & sign-off",
    owner: "Designated closing lead",
    items: [
      "Check each room to confirm that no patients, carriers, medication, dirty instruments, or unresolved hazards remain.",
      "Confirm veterinary staff have completed clinical closeout and controlled-substance security.",
      "Confirm equipment is powered down or left on as required, refrigeration remains running, and water or utilities are secured as appropriate.",
      "Verify cleaning, trash removal, doors, windows, lights, and building security.",
      "Record unresolved issues and who will follow up; notify the appropriate coordinator before leaving."
    ]
  }
];

export default function ClinicClosingChecklistPage() {
  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-5xl px-5 py-10 sm:px-8 sm:py-14">
        <Link href="/portal/clinic?section=training" className="text-sm font-semibold text-primary hover:underline">← Back to Clinic Training Resources</Link>
        <article className="mt-5 overflow-hidden rounded-3xl border bg-white shadow-sm">
          <header className="border-b bg-primary/5 px-6 py-8 sm:px-10">
            <p className="text-sm font-bold uppercase tracking-wider text-primary">General Clinic Education</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Clinic Closing Checklist</h1>
            <p className="mt-4 max-w-3xl leading-7 text-muted-foreground">Use after the final patient has been released. Work within your assigned training and responsibilities. A designated closing lead verifies completion before the team leaves.</p>
            <div className="mt-5 flex flex-wrap gap-3 print:hidden">
              <Link href="/resources/clinic-flow-team-roles" className="rounded-full border border-primary px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/5">Review Clinic Flow and Team Roles</Link>
            </div>
          </header>
          <div className="space-y-7 px-6 py-8 sm:px-10">
            <aside className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
              <h2 className="font-bold text-amber-950">Closing safety rule</h2>
              <p className="mt-2 text-sm leading-6 text-amber-950">Volunteers must not perform clinical judgments, medication or controlled-substance reconciliation, sharps handling outside training, or sterilizer release decisions without appropriate authorization. Report incomplete tasks to the closing lead. Do not mark them complete.</p>
            </aside>
            {sections.map((section) => (
              <section key={section.title} className="rounded-2xl border p-5 sm:p-6">
                <h2 className="text-xl font-bold">{section.title}</h2>
                <p className="mt-1 text-sm font-semibold text-primary">{section.owner}</p>
                <ul className="mt-4 space-y-3">
                  {section.items.map((item) => (
                    <li key={item} className="flex items-start gap-3 text-sm leading-6">
                      <span aria-hidden="true" className="mt-1 h-4 w-4 shrink-0 rounded border-2 border-slate-400" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
            <section className="rounded-2xl border bg-slate-50 p-5">
              <h2 className="text-lg font-bold">Closing sign-off</h2>
              <p className="mt-2 text-sm text-muted-foreground">Closing lead confirms all required items are complete or assigned for follow-up.</p>
              <div className="mt-5 grid gap-5 text-sm sm:grid-cols-2">
                <div>Clinic date: <span className="inline-block w-40 border-b border-slate-400" /></div>
                <div>Closing lead: <span className="inline-block w-40 border-b border-slate-400" /></div>
                <div>Time: <span className="inline-block w-40 border-b border-slate-400" /></div>
                <div>Outstanding issues / follow-up: <span className="inline-block w-32 border-b border-slate-400" /></div>
              </div>
            </section>
            <p className="text-sm leading-6 text-muted-foreground">This operational checklist supplements, rather than replaces, the clinic's approved cleaning, surgical, veterinary, infection prevention, and equipment procedures.</p>
          </div>
        </article>
      </div>
    </main>
  );
}
