import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { permissions } from "@/lib/permissions";
import { AppHeader } from "@/components/app-header";
import { RequestsSearchBar } from "@/components/requests-search-bar";
import { RequestsFilterBar } from "@/components/requests-filter-bar";
import { RequestsTableView } from "@/components/requests-table-view";
import { Pagination } from "@/components/pagination";
import { searchRequests, ACTIVE_STATUSES, type SortKey } from "@/server-actions/search-requests";

export default async function RequestsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!permissions.canViewAllRequests(session.user.role)) redirect("/my-requests");

  const params = await searchParams;
  const isAdmin = session.user.role === "ADMIN";
  const canReschedule = permissions.canReschedule(session.user.role);
  const canCreate = permissions.canCreateRequest(session.user.role);
  const canViewPhotos = session.user.role === "ADMIN" || session.user.role === "CURATOR";

  const [result, services, masters] = await Promise.all([
    searchRequests({
      scope: "active",
      query: params.q,
      status: params.status,
      service: params.service,
      masterId: params.masterId,
      dateFrom: params.dateFrom,
      dateTo: params.dateTo,
      page: params.page ? Number(params.page) : 1,
      sortKey: params.sortKey as SortKey | undefined,
      sortDir: params.sortDir as "asc" | "desc" | undefined,
    }),
    prisma.serviceType.findMany({ orderBy: { name: "asc" } }),
    prisma.user.findMany({
      where: { role: "MASTER" },
      orderBy: { fullName: "asc" },
      select: { id: true, fullName: true },
    }),
  ]);

  return (
    <>
      <AppHeader role={session.user.role} />
      <main className="p-8 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Заявки</h1>
            <p className="text-sm text-slate-500">Активные: новые, назначенные, в работе</p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/archive"
              className="rounded-lg border border-slate-300 text-slate-700 text-sm font-medium px-4 py-2.5 hover:bg-slate-50 transition"
            >
              Архив
            </Link>
            {canCreate && (
              <Link
                href="/requests/new"
                className="rounded-lg bg-slate-900 text-white text-sm font-medium px-4 py-2.5 hover:bg-slate-800 transition"
              >
                + Новая заявка
              </Link>
            )}
          </div>
        </div>

        <div className="mb-4">
          <RequestsSearchBar />
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden mb-0">
          <RequestsFilterBar
            statusOptions={ACTIVE_STATUSES}
            services={services.map((s) => s.name)}
            masters={masters.map((m) => ({ id: m.id, name: m.fullName }))}
            exportBasePath="/api/requests/export"
            scope="active"
          />
        </div>

        <div className="mt-4">
          <RequestsTableView
            requests={result.items}
            showFullFinance={isAdmin}
            canReschedule={canReschedule}
            canViewPhotos={canViewPhotos}
          />
          <div className="bg-white rounded-b-xl border border-t-0 border-slate-200">
            <Pagination page={result.page} totalPages={result.totalPages} total={result.total} />
          </div>
        </div>
      </main>
    </>
  );
}
