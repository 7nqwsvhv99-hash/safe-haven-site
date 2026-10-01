import Link from "next/link";

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
              Ear tipping is a simple, widely recognized way to show that a community cat has already been spayed or neutered through a Trap-Neuter-Return program.
            </p>
          </header>

          <div className="space-y-8 px-6 py-8 sm:px-10 sm:py-10">
            <section>
              <h2 className="text-xl font-bold">What is ear tipping?</h2>
              <p className="mt-3 leading-7 text-muted-foreground">
                Ear tipping is a small trim on the tip of a cat&apos;s ear. It is done while the cat is under anesthesia during spay or neuter surgery.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold">Why is it done?</h2>
              <p className="mt-3 leading-7 text-muted-foreground">
                It is the universal visual sign that a community cat, meaning a cat without an owner that lives outdoors, has already been spayed or neutered. This helps animal control, rescue groups, caregivers, and veterinary teams identify altered cats and helps prevent them from being trapped or anesthetized again unnecessarily.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold">Which cats receive an ear tip?</h2>
              <p className="mt-3 leading-7 text-muted-foreground">
                Ear tipping is typically done only for community cats and TNR, or Trap-Neuter-Return, cats. It is usually not done for owned pets.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold">Will it hurt the cat?</h2>
              <p className="mt-3 leading-7 text-muted-foreground">
                The trim removes about <strong>1/4 inch from the tip of the ear</strong> and is performed while the cat is under anesthesia.
              </p>
            </section>

            <aside className="rounded-2xl border border-primary/20 bg-primary/5 p-5">
              <h2 className="text-lg font-bold">Why this matters on clinic day</h2>
              <p className="mt-2 leading-7 text-muted-foreground">
                Before surgery, confirm the ear-tip decision for community and TNR cats as part of the patient&apos;s clinic record. After surgery, the ear tip becomes a permanent visual marker that helps protect the cat from unnecessary repeat trapping and anesthesia.
              </p>
            </aside>

            <section className="rounded-2xl bg-slate-50 p-5">
              <h2 className="text-lg font-bold">Key takeaway</h2>
              <p className="mt-2 leading-7 text-muted-foreground">
                An ear tip is not an injury or an accidental change to the ear. It is an intentional identification method used in humane community-cat programs to show that the cat has already been sterilized.
              </p>
            </section>
          </div>
        </article>
      </div>
    </main>
  );
}
