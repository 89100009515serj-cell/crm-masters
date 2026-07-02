import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { auth } from "@/lib/auth";
import { permissions } from "@/lib/permissions";
import { getAdminAnalytics, resolvePeriod, type PeriodPreset } from "@/lib/analytics";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user || !permissions.canViewAllRequests(session.user.role)) {
    return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const period = (searchParams.get("period") as PeriodPreset) ?? "30d";
  const from = searchParams.get("from") ?? undefined;
  const to = searchParams.get("to") ?? undefined;

  const range = resolvePeriod(period, from, to);
  const analytics = await getAdminAnalytics(range);

  const workbook = new ExcelJS.Workbook();

  const summarySheet = workbook.addWorksheet("Сводка");
  summarySheet.columns = [
    { header: "Показатель", key: "label", width: 28 },
    { header: "Значение", key: "value", width: 20 },
  ];
  summarySheet.getRow(1).font = { bold: true };
  summarySheet.addRows([
    { label: "Период с", value: range.from.toLocaleDateString("ru-RU") },
    { label: "Период по", value: range.to.toLocaleDateString("ru-RU") },
    { label: "Выручка", value: analytics.revenue },
    { label: "Прибыль компании", value: analytics.companyProfit },
    { label: "Выполнено заявок", value: analytics.completedCount },
    { label: "Средний чек", value: analytics.avgReceipt },
    { label: "Средний расход", value: analytics.avgExpense },
  ]);

  const sourceSheet = workbook.addWorksheet("Источники");
  sourceSheet.columns = [
    { header: "Источник", key: "source", width: 20 },
    { header: "Кол-во заявок", key: "requestCount", width: 16 },
    { header: "Сумма чеков", key: "totalReceipt", width: 16 },
    { header: "Конверсия, %", key: "conversionRate", width: 14 },
  ];
  sourceSheet.getRow(1).font = { bold: true };
  sourceSheet.addRows(analytics.sourceStats);

  const serviceSheet = workbook.addWorksheet("Сервисы");
  serviceSheet.columns = [
    { header: "Сервис", key: "service", width: 24 },
    { header: "Выполнено заявок", key: "requestCount", width: 18 },
    { header: "Сумма чеков", key: "totalReceipt", width: 16 },
  ];
  serviceSheet.getRow(1).font = { bold: true };
  serviceSheet.addRows(analytics.serviceStats);

  const mastersSheet = workbook.addWorksheet("Мастера");
  mastersSheet.columns = [
    { header: "Мастер", key: "masterName", width: 22 },
    { header: "Заявок выполнено", key: "count", width: 18 },
    { header: "Заработок", key: "earnings", width: 16 },
  ];
  mastersSheet.getRow(1).font = { bold: true };
  const masterRows = new Map<string, { masterName: string; count: number; earnings: number }>();
  for (const m of analytics.topMastersByCount) {
    masterRows.set(m.masterId, { masterName: m.masterName, count: m.count, earnings: 0 });
  }
  for (const m of analytics.topMastersByEarnings) {
    const existing = masterRows.get(m.masterId);
    if (existing) existing.earnings = m.earnings;
    else masterRows.set(m.masterId, { masterName: m.masterName, count: 0, earnings: m.earnings });
  }
  mastersSheet.addRows(Array.from(masterRows.values()));

  const buffer = await workbook.xlsx.writeBuffer();

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="analytics-${new Date().toISOString().slice(0, 10)}.xlsx"`,
    },
  });
}
