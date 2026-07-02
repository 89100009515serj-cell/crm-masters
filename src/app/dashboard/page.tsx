import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AppHeader } from "@/components/app-header";
import { PeriodPicker } from "@/components/period-picker";
import { AdminDashboard } from "@/components/admin-dashboard";
import { ManagerDashboard } from "@/components/manager-dashboard";
import { MasterDashboard } from "@/components/master-dashboard";
import {
  getAdminAnalytics,
  getManagerAnalytics,
  getMasterAnalytics,
  resolvePeriod,
  type PeriodPreset,
} from "@/lib/analytics";

const roleLabels: Record<string, string> = {
  ADMIN: "Управляющий",
  CURATOR: "Куратор",
  MANAGER: "Менеджер",
  MASTER: "Мастер",
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; from?: string; to?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const params = await searchParams;
  const periodPreset = (params.period as PeriodPreset) ?? "30d";
  const range = resolvePeriod(periodPreset, params.from, params.to);

  const exportParams = new URLSearchParams();
  exportParams.set("period", periodPreset);
  if (params.from) exportParams.set("from", params.from);
  if (params.to) exportParams.set("to", params.to);
  const exportHref = `/api/analytics/export?${exportParams.toString()}`;

  return (
    <>
      <AppHeader role={session.user.role} />
      <main className="p-8 max-w-6xl mx-auto">
        <h1 className="text-2xl font-semibold text-slate-900">
          Здравствуйте, {session.user.fullName}
        </h1>
        <p className="text-slate-500 mb-6">Роль: {roleLabels[session.user.role]}</p>

        <div className="mb-6">
          <PeriodPicker current={params.period ?? "30d"} />
        </div>

        {(session.user.role === "ADMIN" || session.user.role === "CURATOR") && (
          <AdminDashboard
            analytics={await getAdminAnalytics(range)}
            isAdmin={session.user.role === "ADMIN"}
            exportHref={exportHref}
          />
        )}

        {session.user.role === "MANAGER" && (
          <ManagerDashboard analytics={await getManagerAnalytics(session.user.id, range)} />
        )}

        {session.user.role === "MASTER" && (
          <>
            <MasterDashboard analytics={await getMasterAnalytics(session.user.id, range)} />
            <div className="mt-6">
              <a
                href="/my-requests"
                className="rounded-lg bg-slate-900 text-white text-sm font-medium px-4 py-2.5 hover:bg-slate-800 transition inline-block"
              >
                Перейти к моим заявкам
              </a>
            </div>
          </>
        )}

        {(session.user.role === "ADMIN" || session.user.role === "CURATOR") && (
          <div className="mt-8 flex gap-3">
            <a
              href="/requests"
              className="rounded-lg bg-slate-900 text-white text-sm font-medium px-4 py-2.5 hover:bg-slate-800 transition"
            >
              Перейти к заявкам
            </a>
            <a
              href="/masters"
              className="rounded-lg border border-slate-300 text-slate-700 text-sm font-medium px-4 py-2.5 hover:bg-slate-50 transition"
            >
              Управление мастерами
            </a>
          </div>
        )}
      </main>
    </>
  );
}
