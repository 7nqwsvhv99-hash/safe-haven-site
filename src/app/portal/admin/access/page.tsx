import Link from "next/link";
import { revalidatePath } from "next/cache";
import { ArrowLeft, UserCog } from "lucide-react";
import {
  requireAdministrator,
  requireAdministratorOrBoard,
  getPortalAccessRecords,
  airtableCreate,
  airtableUpdate,
  TABLES,
  PortalRole,
} from "@/lib/portal";

const portalRoles: PortalRole[] = ["Volunteer", "Foster", "Clinic Team", "Staff", "Medical", "Volunteer Coordinator", "Shelter Manager", "Board", "Administrator"];

export default async function PortalAccessPage() {
  await requireAdministratorOrBoard();
  const records = await getPortalAccessRecords();

  async function addAccess(formData: FormData) {
    "use server";
    await requireAdministrator();

    const email = String(formData.get("email") || "").trim().toLowerCase();
    const displayName = String(formData.get("displayName") || "").trim();
    const roles = portalRoles.filter((role) => formData.get(role) === "on");

    if (!email || roles.length === 0) return;

    await airtableCreate(TABLES.portalAccess, {
      Email: email,
      "Display Name": displayName,
      Roles: roles,
      Active: true,
    }, true);

    revalidatePath("/portal/admin/access");
  }

  async function updateAccess(formData: FormData) {
    "use server";
    await requireAdministrator();

    const recordId = String(formData.get("recordId") || "");
    const roles = portalRoles.filter((role) => formData.get(role) === "on");
    const active = formData.get("active") === "on";
    if (!recordId || roles.length === 0) return;

    await airtableUpdate(TABLES.portalAccess, recordId, {
      Roles: roles,
      Active: active,
    }, true);

    revalidatePath("/portal/admin/access");
  }

  return (
    <div className="min-h-[calc(100vh-5rem)] bg-slate-50">
      <section className="container-custom py-10 md:py-12">
        <div className="mx-auto max-w-6xl">
          <Link href="/portal" className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline">
            <ArrowLeft className="h-4 w-4" /> Team Portal
          </Link>

          <div className="mb-10">
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-primary">Administrator</p>
            <h1 className="text-4xl font-bold tracking-tight md:text-5xl">Portal Access</h1>
            <p className="mt-4 max-w-3xl text-muted-foreground">
              One account can have one or more Safe Haven roles. Board access is universal and read-only; Administrator access can manage roles and settings.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[0.8fr_1.2fr]">
            <section className="rounded-3xl border bg-white p-7 shadow-sm">
              <div className="mb-5 flex items-center gap-3">
                <UserCog className="h-6 w-6 text-primary" />
                <h2 className="text-2xl font-bold">Add Portal Access</h2>
              </div>
              <form action={addAccess} className="space-y-4">
                <label className="block text-sm font-medium">
                  Name
                  <input name="displayName" className="mt-2 w-full rounded-xl border px-3 py-2" />
                </label>
                <label className="block text-sm font-medium">
                  Sign-in email
                  <input required type="email" name="email" className="mt-2 w-full rounded-xl border px-3 py-2" />
                </label>
                <fieldset>
                  <legend className="text-sm font-medium">Roles</legend>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {portalRoles.map((role) => (
                      <label key={role} className="flex items-center gap-2 rounded-xl border p-3 text-sm">
                        <input type="checkbox" name={role} /> {role}
                      </label>
                    ))}
                  </div>
                </fieldset>
                <button type="submit" className="rounded-full bg-primary px-5 py-2.5 font-semibold text-white shadow-sm hover:opacity-90">
                  Add Access
                </button>
              </form>
            </section>

            <section className="rounded-3xl border bg-white p-7 shadow-sm">
              <h2 className="text-2xl font-bold">Current Access</h2>
              <div className="mt-5 space-y-4">
                {records.length ? records.map((record) => (
                  <form key={record.id} action={updateAccess} className="rounded-2xl bg-slate-50 p-5">
                    <input type="hidden" name="recordId" value={record.id} />
                    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                      <div>
                        <p className="font-semibold">{record.displayName || record.email}</p>
                        <p className="text-sm text-muted-foreground">{record.email}</p>
                      </div>
                      <label className="flex items-center gap-2 text-sm font-medium">
                        <input type="checkbox" name="active" defaultChecked={record.active} /> Active
                      </label>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      {portalRoles.map((role) => (
                        <label key={role} className="flex items-center gap-2 text-sm">
                          <input type="checkbox" name={role} defaultChecked={record.roles.includes(role)} /> {role}
                        </label>
                      ))}
                    </div>
                    <button type="submit" className="mt-4 rounded-full border px-4 py-2 text-sm font-semibold hover:bg-white">
                      Save Roles
                    </button>
                  </form>
                )) : (
                  <p className="text-muted-foreground">No portal access records have been created yet.</p>
                )}
              </div>
            </section>
          </div>
        </div>
      </section>
    </div>
  );
}
