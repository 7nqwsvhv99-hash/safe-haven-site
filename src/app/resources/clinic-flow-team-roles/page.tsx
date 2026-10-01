import Link from "next/link";

const flowSteps = [
  {
    number: "1",
    title: "Check-in",
    text: "Confirm the patient, client or caregiver, planned services, required consent, and any information the clinical team needs before treatment begins.",
  },
  {
    number: "2",
    title: "Pre-op readiness",
    text: "The veterinary team reviews the patient, confirms readiness for anesthesia and surgery, and resolves medical questions before proceeding.",
  },
  {
    number: "3",
    title: "Surgery",
    text: "Patients move through anesthesia, preparation, surgery, and required treatments using a steady, coordinated workflow.",
  },
  {
    number: "4",
    title: "Recovery",
    text: "Each patient is monitored through recovery and moved forward only when the veterinary team determines the patient is ready.",
  },
  {
    number: "5",
    title: "Pickup and release",
    text: "Final services and records are confirmed, discharge information is reviewed, and the patient is released to the correct client or caregiver.",
  },
  {
    number: "6",
    title: "Closeout and reset",
    text: "Documentation is completed, instruments and work areas are processed, supplies are reset, and unresolved issues are handed off before the clinic ends.",
  },
];

const roles = [
  {
    title: "Front Room System",
    text: "Manages the client-facing flow: check-in, identity and appointment confirmation, required paperwork and communication, payments, and pickup or release steps.",
  },
  {
    title: "Back Room Documentation",
    text: "Keeps the patient record aligned with what is happening clinically by tracking patient status and documenting surgery, vaccines, medications, and other completed services.",
  },
  {
    title: "Instrument Sterilization",
    text: "Keeps clean, correctly prepared sterile packs available by cleaning instruments, assembling and wrapping packs, operating the autoclave according to procedure, and maintaining the clean-to-dirty workflow.",
  },
  {
    title: "Veterinarian",
    text: "Makes medical decisions, evaluates surgical suitability, performs surgery, directs treatment, and responds to medical or surgical concerns.",
  },
  {
    title: "Veterinary Technician",
    text: "Supports anesthesia, surgery, monitoring, and recovery within the technician's training and assigned responsibilities, while helping maintain safe patient flow.",
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
              A high-level orientation to the clinic-day workflow and how Front Room, Back Room Documentation, Instrument Sterilization, veterinary staff, and general volunteers work together.
            </p>
          </header>

          <div className="space-y-8 px-6 py-8 sm:px-10 sm:py-10">
            <section>
              <h2 className="text-xl font-bold">What good clinic flow looks like</h2>
              <p className="mt-3 leading-7 text-muted-foreground">
                Effective spay/neuter clinics use <strong>clear roles, predictable patient movement, accurate identification, and timely communication</strong>. The goal is not speed for its own sake. The goal is a safe, steady workflow in which each team member knows what comes next and important information moves with the patient.
              </p>
            </section>

            <section className="rounded-2xl border bg-slate-50 p-5 sm:p-6">
              <h2 className="text-lg font-bold">Clinic day at a glance</h2>
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

            <section className="rounded-2xl border border-primary/20 bg-primary/5 p-5 sm:p-6">
              <h2 className="text-lg font-bold">The handoffs that matter most</h2>
              <div className="mt-4 grid gap-4 md:grid-cols-3">
                <div>
                  <h3 className="font-semibold">Identify before acting</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Confirm the correct patient and record before medications, procedures, documentation changes, or release.
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

            <aside className="rounded-2xl border bg-slate-50 p-5">
              <h2 className="text-lg font-bold">Clinic-day takeaway</h2>
              <p className="mt-2 leading-7 text-muted-foreground">
                A strong clinic day depends on coordinated handoffs. <strong>Do your assigned role well, keep the patient record current, communicate changes promptly, and help the next person receive a patient who is ready for the next step.</strong>
              </p>
            </aside>

            <section className="border-t pt-6">
              <h2 className="text-base font-bold">Evidence and best-practice guidance</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                This resource combines Safe Haven&apos;s clinic roles with high-quality, high-volume spay/neuter guidance emphasizing defined responsibilities, predictable patient flow, clear communication, accurate patient identification, sterile processing, and standardized medical care.
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
