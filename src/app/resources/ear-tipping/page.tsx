import Link from "next/link";

const steps = [
  {
    number: "1",
    title: "Community cat is trapped",
    text: "A community cat is brought to the clinic through a Trap-Neuter-Return program.",
  },
  {
    number: "2",
    title: "Spay/neuter + ear tip",
    text: "While the cat is under anesthesia, the cat is spayed or neutered and about 1/4 inch is trimmed from the tip of the left ear.",
  },
  {
    number: "3",
    title: "Visible marker for the future",
    text: "The ear tip shows that the cat has already been sterilized, helping avoid unnecessary repeat trapping or anesthesia.",
  },
];

export default function EarTippingResourcePage() {
  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-4xl px-5 py-10 sm:px-8 sm:py-14">
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
              Ear Tipping: What It Means and Why It Matters
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-muted-foreground">
              A quick guide to what ear tipping is, which cats receive it, and why it is an important part of TNR.
            </p>
          </header>

          <div className="space-y-8 px-6 py-8 sm:px-10 sm:py-10">
            <section>
              <h2 className="text-xl font-bold">What is ear tipping?</h2>
              <p className="mt-3 leading-7 text-muted-foreground">
                Ear tipping is a small trim on the tip of a cat&apos;s ear. The trim removes about <strong>1/4 inch from the tip of the left ear.</strong>
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold">Why is it done?</h2>
              <p className="mt-3 leading-7 text-muted-foreground">
                An ear tip is the universal visual sign that a community cat has already been spayed or neutered. It helps animal control, rescue groups, caregivers, and veterinary teams quickly identify altered cats and avoid unnecessary repeat trapping or anesthesia.
              </p>
            </section>

            <section className="rounded-2xl border bg-slate-50 p-5 sm:p-6">
              <h2 className="text-lg font-bold">TNR at a glance</h2>
              <div className="mt-4 grid gap-4 md:grid-cols-3">
                {steps.map((step) => (
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
              <h2 className="text-xl font-bold">Which cats receive an ear tip?</h2>
              <p className="mt-3 leading-7 text-muted-foreground">
                Ear tipping is typically done for <strong>community cats and TNR (Trap-Neuter-Return) cats</strong>. It is usually not done for owned pets.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold">Will it hurt the cat?</h2>
              <p className="mt-3 leading-7 text-muted-foreground">
                Ear tipping is performed while the cat is under anesthesia for spay or neuter surgery.
              </p>
            </section>

            <aside className="rounded-2xl border border-primary/20 bg-primary/5 p-5">
              <h2 className="text-lg font-bold">Why this matters on clinic day</h2>
              <p className="mt-2 leading-7 text-muted-foreground">
                Before surgery, confirm the <strong>Ear Tip Decision</strong> in the patient&apos;s ClinicDay record so the surgical team knows whether an ear tip should be performed.
              </p>
            </aside>
          </div>
        </article>
      </div>
    </main>
  );
}
