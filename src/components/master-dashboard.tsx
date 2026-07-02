import type { MasterAnalytics } from "@/lib/analytics";

export function MasterDashboard({ analytics }: { analytics: MasterAnalytics }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <StatCard label="Выполнено заявок" value={analytics.completedCount} />
        <StatCard label="Заработок" value={`${analytics.earnings.toLocaleString("ru-RU")} ₽`} />
        <StatCard label="Средний чек" value={`${analytics.avgReceipt.toLocaleString("ru-RU")} ₽`} />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="text-sm font-medium text-slate-700 mb-3">Топ-3 самых частых сервиса</h3>
        {analytics.topServices.length === 0 ? (
          <p className="text-sm text-slate-400">Нет данных за выбранный период</p>
        ) : (
          <ol className="space-y-2">
            {analytics.topServices.map((s, i) => (
              <li key={s.service} className="flex items-center justify-between text-sm">
                <span className="text-slate-700">
                  <span className="text-slate-400 mr-2">{i + 1}.</span>
                  {s.service}
                </span>
                <span className="font-medium text-slate-900">{s.count}</span>
              </li>
            ))}
          </ol>
        )}
      </div>
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
