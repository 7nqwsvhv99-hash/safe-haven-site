import Link from "next/link";

const flowSteps = [
  {
    number: "1",
    title: "Arrival & Check-In",
    text: "Patients move from Anticipated Arrivals to Checked-In after identity, appointment details, consent, planned services, and required client or caregiver information are confirmed.",
  },
  {
    number: "2",
    title: "Ready for Surgery",
    text: "Health screening and required preoperative information are completed before a surgical patient advances.",
  },
  {
    number: "3",
    title: "Controlled Drugs",
    text: "Required anesthetic medications are documented and accounted for before surgery according to ClinicDay's controlled-substance workflow.",
  },
  {
    number: "4",
    title: "In Surgery",
    text: "The veterinarian performs the procedure while the veterinary team completes the required clinical care and documentation.",
  },
  {
    number: "5",
    title: "Recovery",
    text: "The patient is monitored after surgery and moves forward only when the veterinary team determines that recovery criteria are met.",
  },
  {
    number: "6",
    title: "Ready for Pickup → Released → Visit Completed",
    text: "Final services, documentation, financial settlement, discharge information, and release are completed before the visit is closed.",
  },
];

const roles = [
  {
    title: "Front Room System",
    text: "Manages the client-facing flow: check-in, patient and client confirmation, required consent and communication, payment at check-in, pickup settlement or refund when applicable, and final release.",
  },
  {
    title: "Back Room Documentation",
    text: "Keeps ClinicDay current as the patient progresses by updating patient status and documenting the surgery, vaccines, medications, tests, microchip, and other services actually completed.",
  },
  {
    title: "Instrument Sterilization",
    text: "Keeps clean, correctly prepared sterile packs available by cleaning instruments, assembling and wrapping packs, operating the autoclave according to procedure, and maintaining the clean-to-dirty workflow. This assignment may appear as Autoclave in clinic staffing.",
  },
  {
    title: "Veterinarian",
    text: "Makes medical decisions, evaluates surgical suitability, performs surgery, directs treatment, and responds to medical or surgical concerns.",
  },
  {
    title: "Veterinary Technician",
    text: "Supports anesthesia, surgery, monitoring, and recovery within the technician's training and assigned responsibilities while helping maintain safe patient flow.",
  },
  {
    title: "General Volunteer",
    text: "Supports clinic operations through assigned non-medical tasks such as patient movement, cleaning, setup, supply support, and other duties that keep trained team members focused on their primary roles.",
  },
];

export default function ClinicFlowTeamRolesResourcePage() {
  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-5xl px-5 py-10 sm:px-8 sm:py-14">
        <Link
          href="/portal/clinic?section=training"
          className="text-sm font-semibold text-primary hover:underline"
        >
          ← Back to Clinic Training Resources
        </Link>

        <article className="mt-5 overflow-hidden rounded-3xl border bg-white shadow-sm">
          <header className="border-b bg-primary/5 px-6 py-8 sm:px-10">
            <p className="text-sm font-bold uppercase tracking-wider text-primary">
              General Clinic Education
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
              Clinic Flow and Team Roles
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-muted-foreground">
              A high-level orientation to the ClinicDay workflow and how Front Room, Back Room Documentation, Instrument Sterilization, veterinary staff, and general volunteers work together.
            </p>
          </header>

          <div className="space-y-8 px-6 py-8 sm:px-10 sm:py-10">
            <section>
              <h2 className="text-xl font-bold">What good clinic flow looks like</h2>
              <p className="mt-3 leading-7 text-muted-foreground">
                Effective spay/neuter clinics use <strong>clear roles, predictable patient movement, accurate identification, and timely communication</strong>. The goal is a safe, steady workflow in which each team member knows what comes next and important information moves with the patient.
              </p>
            </section>

            <section className="rounded-2xl border bg-slate-50 p-5 sm:p-6">
              <h2 className="text-lg font-bold">ClinicDay patient flow</h2>
              <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {flowSteps.map((step) => (
                  <div key={step.number} className="rounded-2xl border bg-white p-4">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
                      {step.number}
                    </div>
                    <h3 className="mt-3 font-semibold">{step.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{step.text}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-primary/20 bg-primary/5 p-5">
              <h2 className="text-lg font-bold">Non-surgical patients</h2>
              <p className="mt-2 leading-7 text-muted-foreground">
                Patients receiving only vaccines, testing, microchipping, parasite treatment, or other non-surgical services follow the portions of the workflow that apply to their visit and do not enter the surgical stages.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold">Who does what?</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                These roles work in parallel. Each person should stay within their assigned training and responsibilities while communicating changes that affect the next step in the patient&apos;s care.
              </p>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                {roles.map((role) => (
                  <div key={role.title} className="rounded-2xl border p-4">
                    <h3 className="font-semibold">{role.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{role.text}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border bg-slate-50 p-5 sm:p-6">
              <h2 className="text-lg font-bold">The handoffs that matter most</h2>
              <div className="mt-4 grid gap-4 md:grid-cols-3">
                <div>
                  <h3 className="font-semibold">Identify before acting</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Confirm the correct patient and ClinicDay record before medications, procedures, documentation changes, or release.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold">Use closed-loop communication</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Important instructions or changes should be stated clearly and acknowledged so the sender knows the message was received.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold">Stop when something does not match</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    If the patient, record, service plan, medication, or status is unclear or inconsistent, pause the handoff and resolve it before moving forward.
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-bold">Closeout and reset</h2>
              <p className="mt-3 leading-7 text-muted-foreground">
                Closeout is a clinic-operations task rather than a ClinicDay patient stage. Before the clinic ends, documentation should be complete, instruments and work areas processed, supplies reset, and any unresolved issues handed off to the appropriate person.
              </p>
            </section>

            <aside className="rounded-2xl border border-primary/20 bg-primary/5 p-5">
              <h2 className="text-lg font-bold">Clinic-day takeaway</h2>
              <p className="mt-2 leading-7 text-muted-foreground">
                A strong clinic day depends on coordinated handoffs. <strong>Do your assigned role well, keep ClinicDay current, communicate changes promptly, and help the next person receive a patient who is ready for the next step.</strong>
              </p>
            </aside>

            <section className="border-t pt-6">
              <h2 className="text-base font-bold">Evidence and best-practice guidance</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                This resource combines Safe Haven&apos;s ClinicDay workflow and staffing roles with high-quality, high-volume spay/neuter guidance emphasizing defined responsibilities, predictable patient flow, clear communication, accurate patient identification, sterile processing, and standardized medical care.
              </p>
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold">
                <a
                  href="https://www.aspcapro.org/topics-spayneuter/spayneuter-clinic-flow"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  ASPCApro Clinic Flow
                </a>
                <a
                  href="https://www.aspcapro.org/resource/efficient-flow-spayneuter-clinics"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  ASPCApro Efficient Flow
                </a>
                <a
                  href="https://www.aspcapro.org/resource/sterile-processing-spayneuter-clinics"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  ASPCApro Sterile Processing
                </a>
                <a
                  href="https://www.aspcapro.org/resource/spayneuter-guidelines"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Spay/Neuter Standards of Care
                </a>
              </div>
            </section>
          </div>
        </article>
      </div>
    </main>
  );
}
