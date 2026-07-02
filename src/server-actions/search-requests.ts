import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { permissions, ForbiddenError } from "@/lib/permissions";
import type { Prisma, RequestStatus } from "@prisma/client";

export const ACTIVE_STATUSES: RequestStatus[] = ["NEW", "ASSIGNED", "ACCEPTED", "ON_SITE"];
export const ARCHIVE_STATUSES: RequestStatus[] = ["COMPLETED", "CANCELLED"];
export type RequestsScope = "active" | "archive";
export type SortKey = "scheduledAt" | "totalReceipt" | "companyProfit";

export interface SearchRequestsParams {
  scope: RequestsScope;
  query?: string;
  status?: string;
  service?: string;
  masterId?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
  sortKey?: SortKey;
  sortDir?: "asc" | "desc";
}

export async function searchRequests(params: SearchRequestsParams) {
  const session = await auth();
  if (!session?.user) throw new ForbiddenError("Не авторизован");
  if (!permissions.canViewAllRequests(session.user.role)) {
    throw new ForbiddenError("Недостаточно прав");
  }

  const scopeStatuses = params.scope === "archive" ? ARCHIVE_STATUSES : ACTIVE_STATUSES;
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, params.pageSize ?? 20));

  const where: Prisma.RequestWhereInput = {
    status:
      params.status && params.status !== "ALL"
        ? (params.status as RequestStatus)
        : { in: scopeStatuses },
  };

  if (params.service && params.service !== "ALL") where.serviceType = { name: params.service };
  if (params.masterId && params.masterId !== "ALL") where.assignedMasterId = params.masterId;
  if (params.dateFrom || params.dateTo) {
    where.scheduledAt = {
      ...(params.dateFrom ? { gte: new Date(params.dateFrom) } : {}),
      ...(params.dateTo ? { lte: new Date(params.dateTo) } : {}),
    };
  }

  const query = params.query?.trim();
  if (query) {
    where.OR = [
      { id: { contains: query, mode: "insensitive" } },
      { clientName: { contains: query, mode: "insensitive" } },
      { clientPhone: { contains: query, mode: "insensitive" } },
      { clientAddress: { contains: query, mode: "insensitive" } },
      { description: { contains: query, mode: "insensitive" } },
      { assignedMaster: { fullName: { contains: query, mode: "insensitive" } } },
    ];
  }

  const sortKey = params.sortKey ?? "scheduledAt";
  const sortDir = params.sortDir ?? "desc";

  const [rows, total] = await Promise.all([
    prisma.request.findMany({
      where,
      orderBy: { [sortKey]: sortDir },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        source: true,
        serviceType: true,
        assignedMaster: { select: { id: true, fullName: true } },
        createdBy: { select: { fullName: true } },
        reschedules: { select: { id: true } },
      },
    }),
    prisma.request.count({ where }),
  ]);

  return {
    items: rows.map((r) => ({
      id: r.id,
      source: r.source.name,
      service: r.serviceType.name,
      scheduledAt: r.scheduledAt.toISOString(),
      actualStartAt: r.actualStartAt?.toISOString() ?? null,
      status: r.status,
      masterId: r.assignedMaster?.id ?? null,
      masterName: r.assignedMaster?.fullName ?? null,
      createdByName: r.createdBy.fullName,
      wasRescheduled: r.reschedules.length > 0,
      totalReceipt: r.totalReceipt ? Number(r.totalReceipt) : null,
      expense: r.expense ? Number(r.expense) : null,
      masterPayout: r.masterPayout ? Number(r.masterPayout) : null,
      companyProfit: r.companyProfit ? Number(r.companyProfit) : null,
      receiptPhotoUrls: r.receiptPhotoUrls,
    })),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}