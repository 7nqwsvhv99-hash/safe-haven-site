import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { HeartHandshake, Stethoscope, ShieldCheck, ArrowRight, UserCog, PawPrint } from "lucide-react";
import { getPortalContext } from "@/lib/portal";

export default async function PortalPage() {
  const context = await getPortalContext();

  const sections = [
    {
      title: "Volunteer Portal",
      description: "My schedule, hours, announcements, current needs, and volunteer tools.",
      href: "/portal/volunteer",
      icon: HeartHandshake,
      show: context.isAdministrator || context.canVolunteer,
    },
    {
      title: "Foster Portal",
      description: "Current foster placements, care instructions, updates, resources, and support.",
      href: "/portal/foster",
      icon: PawPrint,
      show: context.isAdministrator || context.canFoster,
    },
    {
      title: "Clinic Team Portal",
      description: "Clinic dates, availability, attendance reconfirmation, staffing, inventory, and clinic resources.",
      href: "/portal/clinic",
      icon: Stethoscope,
      show: context.isAdministrator || context.canClinic,
    },
    {
      title: "Staff Portal",
      description: "Action Required, shelter inventory, events, current needs, volunteer administration, clinic oversight, and resources.",
      href: "/portal/staff",
      icon: ShieldCheck,
      show: context.isAdministrator || context.canStaff,
    },
    {
      title: "Administrator",
      description: "Manage portal access and assign one or more roles to each person's single sign-in.",
      href: "/portal/admin/access",
      icon: UserCog,
      show: context.isAdministrator,
    },
  ].filter((section) => section.show);

  return (
    <div className="min-h-[calc(100vh-5rem)] bg-slate-50">
      <section className="container-custom py-10 md:py-14">
        <div className="mx-auto max-w-6xl">
          <div className="mb-10 flex items-start justify-between gap-6">
            <div>
              <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-primary">
                Safe Haven Team
              </p>
              <h1 className="text-4xl font-bold tracking-tight md:text-5xl">Team Portal</h1>
              <p className="mt-4 max-w-2xl text-muted-foreground">
                <span className="block">
                  Welcome{context.displayName ? `, ${context.displayName}` : ""}. Your assigned roles are shown below.
                </span>
                {context.isAdministrator && (
                  <span className="block">
                    Administrator access also allows you to open every portal area.
                  </span>
                )}
              </p>
              {context.roles.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {context.roles.map((role) => (
                    <span key={role} className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                      {role}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <UserButton />
          </div>

          {sections.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
              {sections.map((section) => {
                const Icon = section.icon;
                return (
                  <Link
                    key={section.title}
                    href={section.href}
                    className="group rounded-3xl border bg-white p-7 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <h2 className="text-xl font-bold">{section.title}</h2>
                    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{section.description}</p>
                    <div className="mt-6 flex items-center gap-2 text-sm font-semibold text-primary">
                      Open portal <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="rounded-3xl border bg-white p-8 shadow-sm">
              <h2 className="text-2xl font-bold">Your account is signed in, but portal access has not been assigned yet.</h2>
              <p className="mt-3 max-w-2xl text-muted-foreground">
                Safe Haven can assign portal access by email. Volunteer, Foster, and Clinic Team access can also be recognized automatically when your sign-in email matches an active Safe Haven record.
              </p>
            </div>
          )}

          {context.isAdministrator && (
            <div className="mt-8 rounded-2xl border border-primary/15 bg-primary/5 p-5 text-sm">
              <strong>Administrator access:</strong> you can open every portal area from this account.
            </div>
          )}

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
