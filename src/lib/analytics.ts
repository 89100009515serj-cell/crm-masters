import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";

export interface PeriodRange {
  from: Date;
  to: Date;
}

export type PeriodPreset = "today" | "7d" | "30d" | "all";

const ALL_TIME_START = new Date("2020-01-01T00:00:00.000Z");

/**
 * Резолвит пресет периода в конкретный диапазон дат.
 * "today" — с полуночи локального дня сервера до сейчас.
 */
export function resolvePeriod(preset: PeriodPreset, customFrom?: string, customTo?: string): PeriodRange {
  const now = new Date();

  if (customFrom || customTo) {
    return {
      from: customFrom ? new Date(customFrom) : ALL_TIME_START,
      to: customTo ? new Date(customTo) : now,
    };
  }

  switch (preset) {
    case "today": {
      const from = new Date(now);
      from.setHours(0, 0, 0, 0);
      return { from, to: now };
    }
    case "7d":
      return { from: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), to: now };
    case "30d":
      return { from: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), to: now };
    case "all":
    default:
      return { from: ALL_TIME_START, to: now };
  }
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

// Примечание по методологии: количество/конверсия заявок считаются по createdAt
// (когда заявка появилась в системе), а выручка/прибыль/средний чек — по completedAt
// (когда реально прошли деньги). Это даёт корректную выручку за период, даже если
// заявка была создана раньше периода, но закрыта внутри него.

interface RawRequestForAnalytics {
  id: string;
  status: string;
  createdAt: Date;
  completedAt: Date | null;
  totalReceipt: number | null;
  expense: number | null;
  netReceipt: number | null;
  masterPayout: number | null;
  companyProfit: number | null;
  sourceName: string;
  serviceName: string;
  masterId: string | null;
  masterName: string | null;
}

const fetchAdminRows = unstable_cache(
  async (fromIso: string, toIso: string): Promise<RawRequestForAnalytics[]> => {
    const from = new Date(fromIso);
    const to = new Date(toIso);

    const rows = await prisma.request.findMany({
      where: {
        OR: [{ createdAt: { gte: from, lte: to } }, { completedAt: { gte: from, lte: to } }],
      },
      select: {
        id: true,
        status: true,
        createdAt: true,
        completedAt: true,
        totalReceipt: true,
        expense: true,
        netReceipt: true,
        masterPayout: true,
        companyProfit: true,
        source: { select: { name: true } },
        serviceType: { select: { name: true } },
        assignedMaster: { select: { id: true, fullName: true } },
      },
      take: 5000,
    });

    return rows.map((r) => ({
      id: r.id,
      status: r.status,
      createdAt: r.createdAt,
      completedAt: r.completedAt,
      totalReceipt: r.totalReceipt ? Number(r.totalReceipt) : null,
      expense: r.expense ? Number(r.expense) : null,
      netReceipt: r.netReceipt ? Number(r.netReceipt) : null,
      masterPayout: r.masterPayout ? Number(r.masterPayout) : null,
      companyProfit: r.companyProfit ? Number(r.companyProfit) : null,
      sourceName: r.source.name,
      serviceName: r.serviceType.name,
      masterId: r.assignedMaster?.id ?? null,
      masterName: r.assignedMaster?.fullName ?? null,
    }));
  },
  ["admin-analytics-rows"],
  { revalidate: 60, tags: ["analytics"] }
);

export interface AdminAnalytics {
  revenue: number;
  companyProfit: number;
  completedCount: number;
  avgReceipt: number;
  avgExpense: number;
  topMastersByCount: { masterId: string; masterName: string; count: number }[];
  topMastersByEarnings: { masterId: string; masterName: string; earnings: number }[];
  sourceStats: { source: string; requestCount: number; totalReceipt: number; conversionRate: number }[];
  serviceStats: { service: string; requestCount: number; totalReceipt: number }[];
  revenueByDay: { date: string; revenue: number }[];
  statusDistribution: { status: string; count: number }[];
}

export async function getAdminAnalytics(range: PeriodRange): Promise<AdminAnalytics> {
  const rows = await fetchAdminRows(range.from.toISOString(), range.to.toISOString());

  const inCreatedRange = (r: RawRequestForAnalytics) => r.createdAt >= range.from && r.createdAt <= range.to;
  const isCompletedInRange = (r: RawRequestForAnalytics) =>
    r.status === "COMPLETED" && r.completedAt && r.completedAt >= range.from && r.completedAt <= range.to;

  const createdInRange = rows.filter(inCreatedRange);
  const completedInRange = rows.filter(isCompletedInRange);

  const revenue = completedInRange.reduce((s, r) => s + (r.totalReceipt ?? 0), 0);
  const companyProfit = completedInRange.reduce((s, r) => s + (r.companyProfit ?? 0), 0);
  const totalExpense = completedInRange.reduce((s, r) => s + (r.expense ?? 0), 0);
  const completedCount = completedInRange.length;

  const avgReceipt = completedCount ? round2(revenue / completedCount) : 0;
  const avgExpense = completedCount ? round2(totalExpense / completedCount) : 0;

  // Топ мастеров
  const masterMap = new Map<string, { masterName: string; count: number; earnings: number }>();
  for (const r of completedInRange) {
    if (!r.masterId) continue;
    const entry = masterMap.get(r.masterId) ?? { masterName: r.masterName ?? "—", count: 0, earnings: 0 };
    entry.count += 1;
    entry.earnings += r.masterPayout ?? 0;
    masterMap.set(r.masterId, entry);
  }
  const masterEntries = Array.from(masterMap.entries());
  const topMastersByCount = masterEntries
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 3)
    .map(([masterId, v]) => ({ masterId, masterName: v.masterName, count: v.count }));
  const topMastersByEarnings = masterEntries
    .sort((a, b) => b[1].earnings - a[1].earnings)
    .slice(0, 3)
    .map(([masterId, v]) => ({ masterId, masterName: v.masterName, earnings: round2(v.earnings) }));

  // Источники: считаем созданные в периоде, конверсия = доля COMPLETED среди них
  const sourceMap = new Map<string, { requestCount: number; completed: number; totalReceipt: number }>();
  for (const r of createdInRange) {
    const entry = sourceMap.get(r.sourceName) ?? { requestCount: 0, completed: 0, totalReceipt: 0 };
    entry.requestCount += 1;
    if (r.status === "COMPLETED") {
      entry.completed += 1;
      entry.totalReceipt += r.totalReceipt ?? 0;
    }
    sourceMap.set(r.sourceName, entry);
  }
  const sourceStats = Array.from(sourceMap.entries())
    .map(([source, v]) => ({
      source,
      requestCount: v.requestCount,
      totalReceipt: round2(v.totalReceipt),
      conversionRate: v.requestCount ? round2((v.completed / v.requestCount) * 100) : 0,
    }))
    .sort((a, b) => b.requestCount - a.requestCount);

  // Сервисы: по завершённым в периоде (выручка имеет смысл только для завершённых)
  const serviceMap = new Map<string, { requestCount: number; totalReceipt: number }>();
  for (const r of completedInRange) {
    const entry = serviceMap.get(r.serviceName) ?? { requestCount: 0, totalReceipt: 0 };
    entry.requestCount += 1;
    entry.totalReceipt += r.totalReceipt ?? 0;
    serviceMap.set(r.serviceName, entry);
  }
  const serviceStats = Array.from(serviceMap.entries())
    .map(([service, v]) => ({ service, requestCount: v.requestCount, totalReceipt: round2(v.totalReceipt) }))
    .sort((a, b) => b.requestCount - a.requestCount);

  // Выручка по дням (за выбранный период, по completedAt)
  const dayMap = new Map<string, number>();
  for (const r of completedInRange) {
    if (!r.completedAt) continue;
    const day = r.completedAt.toISOString().slice(0, 10);
    dayMap.set(day, (dayMap.get(day) ?? 0) + (r.totalReceipt ?? 0));
  }
  const revenueByDay = Array.from(dayMap.entries())
    .map(([date, revenue]) => ({ date, revenue: round2(revenue) }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Распределение по статусам (созданные в периоде)
  const statusMap = new Map<string, number>();
  for (const r of createdInRange) {
    statusMap.set(r.status, (statusMap.get(r.status) ?? 0) + 1);
  }
  const statusDistribution = Array.from(statusMap.entries()).map(([status, count]) => ({ status, count }));

  return {
    revenue: round2(revenue),
    companyProfit: round2(companyProfit),
    completedCount,
    avgReceipt,
    avgExpense,
    topMastersByCount,
    topMastersByEarnings,
    sourceStats,
    serviceStats,
    revenueByDay,
    statusDistribution,
  };
}

export interface ManagerAnalytics {
  createdCount: number;
  completedCount: number;
  conversionRate: number;
  avgReceipt: number;
}

export async function getManagerAnalytics(userId: string, range: PeriodRange): Promise<ManagerAnalytics> {
  const rows = await prisma.request.findMany({
    where: { createdById: userId, createdAt: { gte: range.from, lte: range.to } },
    select: { status: true, totalReceipt: true },
    take: 5000,
  });

  const createdCount = rows.length;
  const completed = rows.filter((r) => r.status === "COMPLETED");
  const completedCount = completed.length;
  const totalReceipt = completed.reduce((s, r) => s + (r.totalReceipt ? Number(r.totalReceipt) : 0), 0);

  return {
    createdCount,
    completedCount,
    conversionRate: createdCount ? round2((completedCount / createdCount) * 100) : 0,
    avgReceipt: completedCount ? round2(totalReceipt / completedCount) : 0,
  };
}

export interface MasterAnalytics {
  completedCount: number;
  earnings: number;
  avgReceipt: number;
  topServices: { service: string; count: number }[];
}

export async function getMasterAnalytics(userId: string, range: PeriodRange): Promise<MasterAnalytics> {
  const rows = await prisma.request.findMany({
    where: {
      assignedMasterId: userId,
      status: "COMPLETED",
      completedAt: { gte: range.from, lte: range.to },
    },
    select: { totalReceipt: true, masterPayout: true, serviceType: { select: { name: true } } },
    take: 5000,
  });

  const completedCount = rows.length;
  const earnings = rows.reduce((s, r) => s + (r.masterPayout ? Number(r.masterPayout) : 0), 0);
  const totalReceipt = rows.reduce((s, r) => s + (r.totalReceipt ? Number(r.totalReceipt) : 0), 0);

  const serviceMap = new Map<string, number>();
  for (const r of rows) {
    serviceMap.set(r.serviceType.name, (serviceMap.get(r.serviceType.name) ?? 0) + 1);
  }
  const topServices = Array.from(serviceMap.entries())
    .map(([service, count]) => ({ service, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  return {
    completedCount,
    earnings: round2(earnings),
    avgReceipt: completedCount ? round2(totalReceipt / completedCount) : 0,
    topServices,
  };
}
