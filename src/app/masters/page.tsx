import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { permissions } from "@/lib/permissions";
import { MastersTable } from "@/components/masters-table";
import { getMastersWithStats } from "@/server-actions/get-masters";
import { AppHeader } from "@/components/app-header";

export default async function MastersPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!permissions.canAddMaster(session.user.role) && !permissions.canDisableMaster(session.user.role)) {
    redirect("/dashboard");
  }

  const masters = await getMastersWithStats();

  return (
    <>
      <AppHeader role={session.user.role} />
      <main className="p-8 max-w-5xl mx-auto">
        <h1 className="text-2xl font-semibold text-slate-900 mb-6">Мастера</h1>
        <MastersTable initialMasters={masters} />
      </main>
    </>
  );
}
