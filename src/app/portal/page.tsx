import Link from "next/link";
import { UserButton } from "@clerk/nextjs";\nimport { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function PortalPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  return (
    <div className="bg-slate-50 min-h-[calc(100vh-5rem)]">
      <section className="container-custom section-padding">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-start justify-between gap-6 mb-10">
            <div>
              <p className="text-sm md:text-base font-semibold uppercase tracking-[0.18em] text-primary mb-3">
                Safe Haven Team
              </p>
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight">Team Portal</h1>
              <p className="mt-4 text-muted-foreground max-w-2xl">
                Your secure starting point for volunteer, clinic team, and staff tools.
              </p>
            </div>
            <UserButton />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="rounded-2xl border bg-white p-7 shadow-sm">
              <h2 className="text-xl font-bold mb-2">Volunteer Portal</h2>
              <p className="text-sm text-muted-foreground mb-5">
                Scheduling, hours, current needs, and volunteer resources.
              </p>
              <span className="text-sm font-medium text-muted-foreground">Coming next</span>
            </div>

            <div className="rounded-2xl border bg-white p-7 shadow-sm">
              <h2 className="text-xl font-bold mb-2">Clinic Team Portal</h2>
              <p className="text-sm text-muted-foreground mb-5">
                Clinic scheduling, attendance confirmations, staffing alerts, and clinic inventory.
              </p>
              <span className="text-sm font-medium text-muted-foreground">Coming next</span>
            </div>

            <div className="rounded-2xl border bg-white p-7 shadow-sm">
              <h2 className="text-xl font-bold mb-2">Staff Portal</h2>
              <p className="text-sm text-muted-foreground mb-5">
                Events, shelter inventory, internal tools, and operational resources.
              </p>
              <span className="text-sm font-medium text-muted-foreground">Coming next</span>
            </div>
          </div>

          <div className="mt-10">
            <Link href="/" className="text-sm font-medium text-primary hover:underline">
              Return to the Safe Haven website
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
