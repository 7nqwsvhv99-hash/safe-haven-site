import Link from "next/link";

const tnrSteps = [
  {
    number: "1",
    title: "Trap",
    text: "Humanely trap the community cat and transport the cat safely to the clinic in the trap.",
  },
  {
    number: "2",
    title: "Neuter",
    text: "The cat is spayed or neutered, vaccinated according to clinic protocol, ear-tipped, and allowed to recover.",
  },
  {
    number: "3",
    title: "Return",
    text: "After recovery, the cat is returned to the outdoor location where the cat was trapped.",
  },
];

const clinicServices = [
  {
    title: "Spay or neuter",
    text: "Sterilization prevents future litters and reduces mating-related behaviors such as roaming, fighting, spraying, and yowling.",
  },
  {
    title: "Vaccination",
    text: "Rabies vaccination is an important public-health measure and is commonly provided during TNR. Other vaccines may be given according to veterinary and program protocols.",
  },
  {
    title: "Ear tip",
    text: "A small portion of the tip of the left ear is removed while the cat is under anesthesia. The ear tip is the visible sign that the cat has already been sterilized through a TNR program.",
  },
];

export default function TnrBasicsResourcePage() {
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
              TNR Basics
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-muted-foreground">
              An introduction to Trap-Neuter-Return, why community cats are sterilized and vaccinated, and how TNR supports humane population management.
            </p>
          </header>

          <div className="space-y-8 px-6 py-8 sm:px-10 sm:py-10">
            <section>
              <h2 className="text-xl font-bold">What is TNR?</h2>
              <p className="mt-3 leading-7 text-muted-foreground">
                <strong>Trap-Neuter-Return (TNR)</strong> is a humane approach to managing community cats. Cats are humanely trapped, taken to a veterinary clinic for sterilization and preventive care, allowed to recover, and then returned to the outdoor location where they were found.
              </p>
            </section>

            <section className="rounded-2xl border bg-slate-50 p-5 sm:p-6">
              <h2 className="text-lg font-bold">TNR at a glance</h2>
              <div className="mt-4 grid gap-4 md:grid-cols-3">
                {tnrSteps.map((step) => (
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
              <h2 className="text-xl font-bold">What is a community cat?</h2>
              <p className="mt-3 leading-7 text-muted-foreground">
                A community cat is an unowned cat who lives outdoors. Some community cats are comfortable around people, while others are unsocialized and avoid close human contact. Friendly cats should be evaluated for possible reunification with an owner or adoption rather than automatically returned outdoors.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold">What happens at the clinic?</h2>
              <div className="mt-4 grid gap-4 md:grid-cols-3">
                {clinicServices.map((item) => (
                  <div key={item.title} className="rounded-2xl border p-4">
                    <h3 className="font-semibold">{item.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.text}</p>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h2 className="text-xl font-bold">Why does sterilization matter?</h2>
              <p className="mt-3 leading-7 text-muted-foreground">
                The population-management benefit of TNR comes from stopping reproduction. When a large share of the cats in an area are sterilized and new intact cats are identified and treated promptly, fewer kittens are born and the population can stabilize and decline over time.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold">Why vaccinate community cats?</h2>
              <p className="mt-3 leading-7 text-muted-foreground">
                Vaccination protects individual cats and supports public health. Rabies vaccination is especially important because it reduces the risk of rabies in the community. Additional vaccines may be provided based on veterinary judgment and the clinic&apos;s protocol.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold">Why are cats returned to the same location?</h2>
              <p className="mt-3 leading-7 text-muted-foreground">
                Community cats know their territory, food and water sources, shelter, and other cats in the area. Returning them to the location where they were trapped allows them to resume life in familiar surroundings after recovery.
              </p>
            </section>

            <section className="rounded-2xl border bg-slate-50 p-5">
              <h2 className="text-lg font-bold">Monitoring is part of effective TNR</h2>
              <p className="mt-2 leading-7 text-muted-foreground">
                Effective programs continue after the first clinic visit. Caregivers and community partners monitor the area, provide appropriate food, water, and shelter when available, identify cats that need medical attention, and arrange TNR for new intact cats that arrive.
              </p>
            </section>

            <aside className="rounded-2xl border border-primary/20 bg-primary/5 p-5">
              <h2 className="text-lg font-bold">Clinic-day takeaway</h2>
              <p className="mt-2 leading-7 text-muted-foreground">
                For every TNR patient, follow safe trap-handling procedures, confirm the planned services and ear-tip decision, document the care provided, and make sure the cat is appropriately recovered before release back to the caregiver.
              </p>
            </aside>

            <section className="border-t pt-6">
              <h2 className="text-base font-bold">Evidence and best-practice guidance</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                This resource is based on guidance from the ASPCA, ASPCApro, and Alley Cat Allies on community-cat management, humane trapping, sterilization, vaccination, ear tipping, return, and ongoing monitoring.
              </p>
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold">
                <a
                  href="https://www.aspca.org/about-us/aspca-policy-and-position-statements/position-statement-on-community-cats"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  ASPCA Community Cat Position
                </a>
                <a
                  href="https://www.aspcapro.org/resource/best-practices-guide-trapping-community-and-stray-cats-support-tnr-efforts"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  ASPCApro TNR Best Practices
                </a>
                <a
                  href="https://www.alleycat.org/resources/trap-neuter-return-for-community-cats-the-basics/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Alley Cat Allies TNR Basics
                </a>
              </div>
            </section>
          </div>
        </article>
      </div>
    </main>
  );
}
