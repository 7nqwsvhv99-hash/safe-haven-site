import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  BedDouble,
  Boxes,
  CalendarDays,
  ClipboardList,
  ClipboardPlus,
  FileText,
  Globe2,
  HeartHandshake,
  Megaphone,
  PawPrint,
  UserCheck,
  Users,
  UsersRound,
} from "lucide-react";
import { getPortalContext, getStaffPortalData } from "@/lib/portal";

const cardClass =
  "staff-command-card group block h-full rounded-2xl border bg-white p-5 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2";

function IconTile({ icon: Icon }: { icon: typeof PawPrint }) {
  return (
    <div className="rounded-2xl bg-primary/10 p-3 text-primary">
      <Icon className="h-6 w-6" />
    </div>
  );
}

export default async function StaffPortalPage() {
  const context = await getPortalContext();
  if (!context.canStaff) redirect(context.canOnboard ? "/portal/staff/onboarding" : "/portal");
  const data = await getStaffPortalData();

  const shelterInventory = data.inventory.filter((item) => item.area === "Shelter");
  const highPriorityNeeds = data.highPriorityNeedsCount;
  const inventoryAttention = data.inventoryAttentionCount;
  const notCounted = data.inventoryNotCountedCount;

  const attention = [
    {
      title: "High-Priority Needs",
      value: highPriorityNeeds,
      detail: highPriorityNeeds === 1 ? "active high-priority need" : "active high-priority needs",
      href: "/portal/staff/needs",
      icon: AlertTriangle,
    },
    {
      title: "Inventory Attention",
      value: inventoryAttention,
      detail: inventoryAttention === 1 ? "item needs reorder attention" : "items need reorder attention",
      href: "/portal/staff/inventory?attention=1",
      icon: Boxes,
    },
    {
      title: "Foster Alerts",
      value: data.fosterAlertCount,
      detail: data.fosterAlertCount === 1 ? "foster concern needs follow-up" : "foster concerns need follow-up",
      href: "/portal/staff/fosters?attention=1#foster-attention",
      icon: HeartHandshake,
    },
    {
      title: "Medical Review",
      value: data.medical.pendingReviewCount,
      detail: data.medical.pendingReviewCount === 1 ? "record awaits review" : "records await review",
      href: "/portal/medical?view=review",
      icon: Activity,
    },
  ];

  const animalCare = [
    {
      title: "Animal Management",
      description: "Add animals, update shelter records, and open the unified animal profile.",
      href: "/portal/staff/animals",
      icon: PawPrint,
    },
    {
      title: "Kennel, Daily Care & Housing",
      description: "Manage housing, move animals, record daily care, and resolve care follow-ups.",
      href: "/portal/staff/care",
      icon: BedDouble,
    },
    {
      title: "Adoption Management",
      description: "Review applications, approve adopters, complete placements, and manage follow-up.",
      href: "/portal/staff/adoptions",
      icon: UserCheck,
    },
    {
      title: "Foster Management",
      description: "Review applications, manage placements and check-ins, and resolve foster concerns.",
      href: "/portal/staff/fosters",
      icon: HeartHandshake,
    },
    {
      title: "Intake & Owner Surrender",
      description: "Review surrender requests, accept animals into care, and record direct intakes.",
      href: "/portal/staff/intake",
      icon: ClipboardPlus,
    },
    {
      title: "Medical Care",
      description: "View medical history, record care, and work the veterinarian review queue.",
      href: "/portal/medical",
      icon: Activity,
    },
  ];

  const peopleOperations = [
    {
      title: "Staff Scheduling",
      description: "Shift assignments, confirmations, and staffing coverage.",
      href: "/portal/staff/schedule",
      icon: CalendarDays,
    },
    {
      title: "Volunteer Opportunity Requests",
      description: "Review requests from current volunteers who want to help in another area.",
      href: "/portal/staff/volunteer-opportunities",
      icon: ClipboardList,
    },
    {
      title: "Staff Onboarding",
      description: "Training materials, assigned onboarding tasks, and completion reviews.",
      href: "/portal/staff/training",
      icon: Users,
    },
    ...(context.canViewOnboarding
      ? [{
          title: "Volunteer Onboarding",
          description: "Applications, credentials, waivers, roster links, and portal access.",
          href: "/portal/staff/onboarding",
          icon: UserCheck,
        }]
      : []),
  ];

  const operations = [
    {
      title: "Shelter Inventory",
      description: `${shelterInventory.length} active supplies · ${inventoryAttention} need attention · ${notCounted} awaiting initial count`,
      href: "/portal/staff/inventory",
      icon: Boxes,
    },
    {
      title: "Current Needs",
      description: `${data.needs.length} active needs · ${highPriorityNeeds} high priority`,
      href: "/portal/staff/needs",
      icon: ClipboardList,
    },
    {
      title: "Upcoming Events",
      description: `${data.upcomingEvents.length} upcoming event${data.upcomingEvents.length === 1 ? "" : "s"} currently scheduled`,
      href: "/portal/staff/content",
      icon: CalendarDays,
    },
  ];

  const admin = [
    {
      title: "People & Contacts",
      description: "See each person's complete relationship with Safe Haven.",
      href: "/portal/staff/people",
      icon: UsersRound,
    },
    {
      title: "Website & Content",
      description: "Manage events and website content.",
      href: "/portal/staff/content",
      icon: Globe2,
    },
    {
      title: "Documents & Agreements",
      description: "Manage contracts, waivers, releases, receipts, and signed files.",
      href: "/portal/staff/documents",
      icon: FileText,
    },
    {
      title: "Reports & Dashboards",
      description: "Open shelter reporting and operational dashboards.",
      href: "/portal/staff/reports",
      icon: BarChart3,
    },
    {
      title: "Review Resources",
      description: "Open the public pet-owner resources page.",
      href: "/resources",
      icon: Globe2,
    },
    {
      title: "Review Clinic Page",
      description: "Review the public spay/neuter clinic experience.",
      href: "/clinic",
      icon: Activity,
    },
  ];

  return (
    <div className="min-h-[calc(100vh-5rem)] bg-slate-50">
      <section className="container-custom py-8 md:py-10">
        <div className="mx-auto max-w-7xl">
          <Link href="/portal" className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline">
            <ArrowLeft className="h-4 w-4" /> Team Portal
          </Link>

          <header className="mb-7">
            <p className="mb-2 text-sm font-semibold uppercase tracking-[0.18em] text-primary">Staff Portal</p>
            <h1 className="text-4xl font-bold tracking-tight md:text-5xl">Animal Care First</h1>
            <p className="mt-3 max-w-3xl text-muted-foreground">
              See what needs attention, choose the work you need to do, and open the focused workspace for that task.
            </p>
          </header>

          {data.announcements.length > 0 && (
            <section className="mb-6 rounded-2xl border bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center gap-3">
                <Megaphone className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-bold">Staff Announcements</h2>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {data.announcements.slice(0, 4).map((item) => (
                  <div key={item.id} className="rounded-xl bg-slate-50 p-4">
                    <p className="font-semibold">{item.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{item.message}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          <div className="sticky top-20 z-20 mb-8 -mx-1 bg-slate-50/95 px-1 py-2 backdrop-blur">
            <nav className="flex flex-wrap gap-2" aria-label="Staff Navigation">
              {[
                ["Animal Care", "#animal-care"],
                ["Staff & Volunteers", "#people-volunteers"],
                ["Medical", "/portal/medical"],
                ["Inventory", "/portal/staff/inventory"],
                ["Operations", "#operations"],
                ["Reports", "/portal/staff/reports"],
              ].map(([label, href]) => (
                <Link key={href} href={href} className="whitespace-nowrap rounded-full border bg-white px-4 py-2 text-sm font-semibold text-muted-foreground shadow-sm transition hover:border-primary/40 hover:bg-primary/5 hover:text-primary">
                  {label}
                </Link>
              ))}
            </nav>
          </div>

          <section id="attention" className="scroll-mt-36">
            <div className="mb-4">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">Needs Attention Now</p>
            </div>
            <div className="mb-10 grid grid-cols-2 gap-4 lg:grid-cols-4">
              {attention.map(({ title, value, detail, href, icon: Icon }) => (
                <Link key={title} href={href} className={cardClass}>
                  <Icon className="mb-3 h-5 w-5 text-primary" />
                  <p className="text-3xl font-bold">{value}</p>
                  <p className="mt-1 font-semibold">{title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
                </Link>
              ))}
            </div>
          </section>

          <section id="animal-care" className="scroll-mt-36">
            <div className="mb-4">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">Animal Care & Placement</p>
            </div>
            <div className="mb-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {animalCare.map(({ title, description, href, icon }) => (
                <Link key={title} href={href} className={cardClass}>
                  <div className="flex items-start gap-4">
                    <IconTile icon={icon} />
                    <div>
                      <h2 className="text-xl font-bold">{title}</h2>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          <section id="people-volunteers" className="scroll-mt-36">
            <div className="mb-4">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">Staff & Volunteer Operations</p>
            </div>
            <div className="mb-10 grid gap-4 md:grid-cols-2">
              {peopleOperations.map(({ title, description, href, icon }) => (
                <Link key={title} href={href} className={cardClass}>
                  <div className="flex items-start gap-4">
                    <IconTile icon={icon} />
                    <div>
                      <h2 className="text-xl font-bold">{title}</h2>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          <section id="operations" className="scroll-mt-36">
            <div className="mb-4">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">Operations</p>
            </div>
            <div className="mb-6 grid gap-4 md:grid-cols-3">
              {operations.map(({ title, description, href, icon }) => (
                <Link key={title} href={href} className={cardClass}>
                  <div className="flex items-start gap-4">
                    <IconTile icon={icon} />
                    <div>
                      <h2 className="text-xl font-bold">{title}</h2>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

          </section>

          <section id="administration" className="scroll-mt-36">
            <div className="mb-4">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">Administration & Reporting</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {admin.map(({ title, description, href, icon }) => (
                <Link key={title} href={href} className={cardClass}>
                  <div className="flex items-start gap-4">
                    <IconTile icon={icon} />
                    <div>
                      <h2 className="text-xl font-bold">{title}</h2>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {context.isAdministrator && (
              <p className="mt-5 text-sm text-muted-foreground">
                Administrator access is active on this account, so Volunteer, Clinic Team, and Staff areas are all available.
              </p>
            )}
          </section>
        </div>
      </section>
    </div>
  );
}
