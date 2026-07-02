import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { permissions } from "@/lib/permissions";
import type { Prisma } from "@prisma/client";

const statusLabels: Record<string, string> = {
  NEW: "Новая",
  ASSIGNED: "Назначена",
  ACCEPTED: "Принята",
  ON_SITE: "На адресе",
  COMPLETED: "Завершена",
  CANCELLED: "Отменена",
};

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user || !permissions.canViewAllRequests(session.user.role)) {
    return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
  }

  const isAdmin = session.user.role === "ADMIN";
  const { searchParams } = new URL(req.url);

  const status = searchParams.get("status");
  const service = searchParams.get("service");
  const masterId = searchParams.get("masterId");
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");
  const q = searchParams.get("q");
  const scope = searchParams.get("scope");

  const where: Prisma.RequestWhereInput = {};
  if (status && status !== "ALL") {
    where.status = status as Prisma.RequestWhereInput["status"];
  } else if (scope === "archive") {
    where.status = { in: ["COMPLETED", "CANCELLED"] };
  } else if (scope === "active") {
    where.status = { in: ["NEW", "ASSIGNED", "ACCEPTED", "ON_SITE"] };
  }
  if (service && service !== "ALL") where.serviceType = { name: service };
  if (masterId && masterId !== "ALL") where.assignedMasterId = masterId;
  if (dateFrom || dateTo) {
    where.scheduledAt = {
      ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
      ...(dateTo ? { lte: new Date(dateTo) } : {}),
    };
  }
  if (q?.trim()) {
    where.OR = [
      { id: { contains: q, mode: "insensitive" } },
      { clientName: { contains: q, mode: "insensitive" } },
      { clientPhone: { contains: q, mode: "insensitive" } },
      { clientAddress: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
      { assignedMaster: { fullName: { contains: q, mode: "insensitive" } } },
    ];
  }

  const requests = await prisma.request.findMany({
    where,
    orderBy: { scheduledAt: "desc" },
    include: {
      source: true,
      serviceType: true,
      assignedMaster: { select: { fullName: true } },
    },
    take: 5000,
  });

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Заявки");

  const baseColumns = [
    { header: "Дата создания", key: "createdAt", width: 18 },
    { header: "Источник", key: "source", width: 14 },
    { header: "Сервис", key: "service", width: 22 },
    { header: "Запланировано", key: "scheduledAt", width: 18 },
    { header: "Факт. выполнение", key: "completedAt", width: 18 },
    { header: "Клиент", key: "clientName", width: 18 },
    { header: "Адрес", key: "clientAddress", width: 24 },
    { header: "Мастер", key: "master", width: 18 },
    { header: "Статус", key: "status", width: 14 },
    { header: "Комментарий", key: "comment", width: 24 },
  ];

  const financeColumns = [
    { header: "Общий чек", key: "totalReceipt", width: 14 },
    { header: "Расход", key: "expense", width: 12 },
    { header: "Чистый чек", key: "netReceipt", width: 14 },
    { header: "Мастеру (40%)", key: "masterPayout", width: 16 },
    { header: "Менеджерские (4%)", key: "managerPayout", width: 18 },
    { header: "Кураторские (5%)", key: "curatorPayout", width: 16 },
    { header: "Прибыль компании", key: "companyProfit", width: 18 },
  ];

  sheet.columns = isAdmin
    ? [...baseColumns.slice(0, 8), ...financeColumns, ...baseColumns.slice(8)]
    : baseColumns;

  sheet.getRow(1).font = { bold: true };

  for (const r of requests) {
    const row: Record<string, unknown> = {
      createdAt: r.createdAt.toLocaleString("ru-RU"),
      source: r.source.name,
      service: r.serviceType.name,
      scheduledAt: r.scheduledAt.toLocaleString("ru-RU"),
      completedAt: r.completedAt ? r.completedAt.toLocaleString("ru-RU") : "",
      clientName: r.clientName,
      clientAddress: r.clientAddress,
      master: r.assignedMaster?.fullName ?? "",
      status: statusLabels[r.status] ?? r.status,
      comment: r.comment ?? "",
    };

    if (isAdmin) {
      row.totalReceipt = r.totalReceipt ? Number(r.totalReceipt) : "";
      row.expense = r.expense ? Number(r.expense) : "";
      row.netReceipt = r.netReceipt ? Number(r.netReceipt) : "";
      row.masterPayout = r.masterPayout ? Number(r.masterPayout) : "";
      row.managerPayout = r.managerPayout ? Number(r.managerPayout) : "";
      row.curatorPayout = r.curatorPayout ? Number(r.curatorPayout) : "";
      row.companyProfit = r.companyProfit ? Number(r.companyProfit) : "";
    }

    sheet.addRow(row);
  }

  const buffer = await workbook.xlsx.writeBuffer();

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="requests-export-${new Date()
        .toISOString()
        .slice(0, 10)}.xlsx"`,
    },
  });
}
