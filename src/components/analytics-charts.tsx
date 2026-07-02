"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

const statusLabels: Record<string, string> = {
  NEW: "Новая",
  ASSIGNED: "Назначена",
  ACCEPTED: "Принята",
  ON_SITE: "На адресе",
  COMPLETED: "Завершена",
  CANCELLED: "Отменена",
};

const STATUS_COLORS: Record<string, string> = {
  NEW: "#94a3b8",
  ASSIGNED: "#3b82f6",
  ACCEPTED: "#f59e0b",
  ON_SITE: "#fb923c",
  COMPLETED: "#10b981",
  CANCELLED: "#ef4444",
};

export function RevenueByDayChart({ data }: { data: { date: string; revenue: number }[] }) {
  if (data.length === 0) {
    return <p className="text-sm text-slate-400 py-10 text-center">Нет данных за выбранный период</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11 }}
          tickFormatter={(d) => new Date(d).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" })}
        />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip
          labelFormatter={(d) => new Date(d as string).toLocaleDateString("ru-RU")}
          formatter={(value: number) => [`${value.toLocaleString("ru-RU")} ₽`, "Выручка"]}
        />
        <Line type="monotone" dataKey="revenue" stroke="#0f172a" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function StatusDistributionChart({ data }: { data: { status: string; count: number }[] }) {
  if (data.length === 0) {
    return <p className="text-sm text-slate-400 py-10 text-center">Нет данных за выбранный период</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie
          data={data}
          dataKey="count"
          nameKey="status"
          cx="50%"
          cy="50%"
          outerRadius={90}
          label={(entry) => statusLabels[entry.status as string] ?? entry.status}
        >
          {data.map((d) => (
            <Cell key={d.status} fill={STATUS_COLORS[d.status] ?? "#cbd5e1"} />
          ))}
        </Pie>
        <Tooltip formatter={(value: number, _name, item) => [value, statusLabels[item.payload.status]]} />
        <Legend formatter={(value) => statusLabels[value] ?? value} />
      </PieChart>
    </ResponsiveContainer>
  );
}
