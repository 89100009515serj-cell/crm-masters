import type { AdminAnalytics } from "@/lib/analytics";
import { RevenueByDayChart, StatusDistributionChart } from "@/components/analytics-charts";

export function AdminDashboard({
  analytics,
  isAdmin,
  exportHref,
}: {
  analytics: AdminAnalytics;
  isAdmin: boolean;
  exportHref: string;
}) {
  return (
    <div className="space-y-8">
      <div className="flex justify-end">
        <a
          href={exportHref}
          className="text-xs font-medium bg-emerald-600 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-700 transition"
        >
          Экспорт аналитики в Excel
        </a>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard label="Выручка" value={`${analytics.revenue.toLocaleString("ru-RU")} ₽`} />
        {isAdmin && (
          <StatCard label="Прибыль компании" value={`${analytics.companyProfit.toLocaleString("ru-RU")} ₽`} />
        )}
        <StatCard label="Выполнено заявок" value={analytics.completedCount} />
        <StatCard label="Средний чек" value={`${analytics.avgReceipt.toLocaleString("ru-RU")} ₽`} />
        <StatCard label="Средний расход" value={`${analytics.avgExpense.toLocaleString("ru-RU")} ₽`} />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-medium text-slate-700 mb-3">Топ-3 мастера по количеству заявок</h3>
          <RankedList
            items={analytics.topMastersByCount.map((m) => ({
              label: m.masterName,
              value: `${m.count} заявок`,
            }))}
          />
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-medium text-slate-700 mb-3">Топ-3 мастера по заработку</h3>
          <RankedList
            items={analytics.topMastersByEarnings.map((m) => ({
              label: m.masterName,
              value: `${m.earnings.toLocaleString("ru-RU")} ₽`,
            }))}
          />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-medium text-slate-700 mb-3">Выручка по дням</h3>
          <RevenueByDayChart data={analytics.revenueByDay} />
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-medium text-slate-700 mb-3">Заявки по статусам</h3>
          <StatusDistributionChart data={analytics.statusDistribution} />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <h3 className="text-sm font-medium text-slate-700 px-5 py-4 border-b border-slate-100">
          Статистика по источникам
        </h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-left text-slate-500 text-xs uppercase tracking-wide">
              <th className="px-5 py-2">Источник</th>
              <th className="px-5 py-2 text-right">Кол-во заявок</th>
              <th className="px-5 py-2 text-right">Сумма чеков</th>
              <th className="px-5 py-2 text-right">Конверсия</th>
            </tr>
          </thead>
          <tbody>
            {analytics.sourceStats.map((s) => (
              <tr key={s.source} className="border-t border-slate-100">
                <td className="px-5 py-2.5">{s.source}</td>
                <td className="px-5 py-2.5 text-right">{s.requestCount}</td>
                <td className="px-5 py-2.5 text-right">{s.totalReceipt.toLocaleString("ru-RU")} ₽</td>
                <td className="px-5 py-2.5 text-right">{s.conversionRate}%</td>
              </tr>
            ))}
            {analytics.sourceStats.length === 0 && (
              <tr>
                <td colSpan={4} className="px-5 py-8 text-center text-slate-400">
                  Нет данных
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <h3 className="text-sm font-medium text-slate-700 px-5 py-4 border-b border-slate-100">
          Статистика по сервисам
        </h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-left text-slate-500 text-xs uppercase tracking-wide">
              <th className="px-5 py-2">Сервис</th>
              <th className="px-5 py-2 text-right">Выполнено заявок</th>
              <th className="px-5 py-2 text-right">Сумма чеков</th>
            </tr>
          </thead>
          <tbody>
            {analytics.serviceStats.map((s) => (
              <tr key={s.service} className="border-t border-slate-100">
                <td className="px-5 py-2.5">{s.service}</td>
                <td className="px-5 py-2.5 text-right">{s.requestCount}</td>
                <td className="px-5 py-2.5 text-right">{s.totalReceipt.toLocaleString("ru-RU")} ₽</td>
              </tr>
            ))}
            {analytics.serviceStats.length === 0 && (
              <tr>
                <td colSpan={3} className="px-5 py-8 text-center text-slate-400">
                  Нет данных
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <p className="text-sm text-slate-500 mb-1">{label}</p>
      <p className="text-xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function RankedList({ items }: { items: { label: string; value: string }[] }) {
  if (items.length === 0) return <p className="text-sm text-slate-400">Нет данных</p>;
  return (
    <ol className="space-y-2">
      {items.map((item, i) => (
        <li key={item.label} className="flex items-center justify-between text-sm">
          <span className="text-slate-700">
            <span className="text-slate-400 mr-2">{i + 1}.</span>
            {item.label}
          </span>
          <span className="font-medium text-slate-900">{item.value}</span>
        </li>
      ))}
    </ol>
  );
}
