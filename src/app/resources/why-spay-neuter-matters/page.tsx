import Link from "next/link";

const impactSteps = [
  {
    number: "1",
    title: "Fewer unplanned litters",
    text: "Spaying and neutering prevents reproduction, reducing the number of puppies and kittens born without planned homes.",
  },
  {
    number: "2",
    title: "Less pressure on shelters",
    text: "When fewer unwanted animals enter the sheltering system, shelters can use limited space, staff time, foster homes, and veterinary resources more effectively.",
  },
  {
    number: "3",
    title: "Stronger community animal welfare",
    text: "Accessible spay/neuter helps families keep pets, supports humane community-cat management, and reduces preventable population growth.",
  },
];

const benefits = [
  {
    title: "Health benefits",
    text: "Spaying prevents uterine infection and eliminates the risk of ovarian and uterine cancers. Neutering eliminates testicular cancer risk and can reduce some prostate problems. Timing should be discussed with a veterinarian because the appropriate age can vary by species, breed, size, health, and individual circumstances.",
  },
  {
    title: "Mating-related behaviors",
    text: "Sterilization can reduce behaviors driven by reproductive hormones, including roaming, urine marking, and some mating-related vocalization or fighting. It is not a substitute for training, enrichment, or behavior support.",
  },
];

export default function WhySpayNeuterMattersResourcePage() {
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
              Why Spay/Neuter Matters
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-muted-foreground">
              An overview of how accessible spay/neuter reduces unwanted litters, supports shelter capacity, and improves community animal welfare.
            </p>
          </header>

          <div className="space-y-8 px-6 py-8 sm:px-10 sm:py-10">
            <section>
              <h2 className="text-xl font-bold">Why accessibility matters</h2>
              <p className="mt-3 leading-7 text-muted-foreground">
                Spay/neuter is most effective as a community strategy when services are <strong>safe, affordable, voluntary, and easy to access</strong>. Cost, transportation, scheduling, and other barriers can prevent families from obtaining care even when they want it.
              </p>
            </section>

            <section className="rounded-2xl border bg-slate-50 p-5 sm:p-6">
              <h2 className="text-lg font-bold">The community impact</h2>
              <div className="mt-4 grid gap-4 md:grid-cols-3">
                {impactSteps.map((step) => (
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
              <h2 className="text-xl font-bold">Benefits for individual animals</h2>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                {benefits.map((item) => (
                  <div key={item.title} className="rounded-2xl border p-4">
                    <h3 className="font-semibold">{item.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.text}</p>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h2 className="text-xl font-bold">Community cats and TNR</h2>
              <p className="mt-3 leading-7 text-muted-foreground">
                For unowned community cats, sterilization is a core part of <strong>Trap-Neuter-Return</strong>. Preventing new litters allows community-cat populations to stabilize and potentially decline over time, particularly when new intact cats are identified and sterilized.
              </p>
            </section>

            <section className="rounded-2xl border bg-slate-50 p-5">
              <h2 className="text-lg font-bold">One part of a larger solution</h2>
              <p className="mt-2 leading-7 text-muted-foreground">
                Strong animal-welfare systems also depend on adoption, foster care, lost-pet reunification, accessible veterinary care, pet-retention support, humane community-cat programs, and responsible shelter capacity management. Spay/neuter works best as part of that larger system.
              </p>
            </section>

            <aside className="rounded-2xl border border-primary/20 bg-primary/5 p-5">
              <h2 className="text-lg font-bold">Clinic-day takeaway</h2>
              <p className="mt-2 leading-7 text-muted-foreground">
                Every patient should receive <strong>safe surgery, accurate documentation, appropriate recovery monitoring, and clear discharge instructions</strong>. Those fundamentals are what turn access to spay/neuter into effective care.
              </p>
            </aside>

            <section className="border-t pt-6">
              <h2 className="text-base font-bold">Evidence and best-practice guidance</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                This resource is based on guidance from the ASPCA, the American Veterinary Medical Association, Humane World for Animals, and Shelter Animals Count on accessible sterilization, shelter capacity, population management, and the health and behavioral effects of spay/neuter.
              </p>
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold">
                <a
                  href="https://www.aspca.org/about-us/aspca-policy-and-position-statements/position-statement-mandatory-spayneuter-laws"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  ASPCA Spay/Neuter Access Guidance
                </a>
                <a
                  href="https://ebusiness.avma.org/files/productdownloads/mcm-client-brochures-spay-neuter-2022.pdf"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  AVMA Spay/Neuter Overview
                </a>
                <a
                  href="https://www.humaneworld.org/en/campaign/spay-neuter"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Humane World: Why Spay/Neuter Matters
                </a>
                <a
                  href="https://www.shelteranimalscount.org/altered-status-at-intake-for-2025-spay-neuter-awareness-month/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Shelter Animals Count: Altered Status at Intake
                </a>
              </div>
            </section>
          </div>
        </article>
      </div>
    </main>
  );
}
