import type { ManagerAnalytics } from "@/lib/analytics";

export function ManagerDashboard({ analytics }: { analytics: ManagerAnalytics }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <StatCard label="Создано заявок" value={analytics.createdCount} />
      <StatCard label="Завершено" value={analytics.completedCount} />
      <StatCard label="Конверсия" value={`${analytics.conversionRate}%`} />
      <StatCard label="Средний чек" value={`${analytics.avgReceipt.toLocaleString("ru-RU")} ₽`} />
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <p className="text-sm text-slate-500 mb-1">{label}</p>
      <p className="text-2xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}
