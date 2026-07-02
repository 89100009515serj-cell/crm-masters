"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";

const statusLabels: Record<string, string> = {
  NEW: "Новая",
  ASSIGNED: "Назначена",
  ACCEPTED: "Принята",
  ON_SITE: "На адресе",
  COMPLETED: "Завершена",
  CANCELLED: "Отменена",
};

export function RequestsFilterBar({
  statusOptions,
  services,
  masters,
  exportBasePath,
  scope,
}: {
  statusOptions: string[];
  services: string[];
  masters: { id: string; name: string }[];
  exportBasePath: string;
  scope: "active" | "archive";
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function update(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "ALL") params.set(key, value);
    else params.delete(key);
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  function handleExport() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("page");
    params.set("scope", scope);
    window.location.href = `${exportBasePath}?${params.toString()}`;
  }

  const currentStatus = searchParams.get("status") ?? "ALL";

  return (
    <div className="p-4 border-b border-slate-200 flex flex-wrap gap-2 items-center">
      <button
        onClick={() => update("status", "ALL")}
        className={`text-xs font-medium px-3 py-1.5 rounded-full transition ${
          currentStatus === "ALL"
            ? "bg-slate-900 text-white"
            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
        }`}
      >
        Все статусы
      </button>
      {statusOptions.map((s) => (
        <button
          key={s}
          onClick={() => update("status", s)}
          className={`text-xs font-medium px-3 py-1.5 rounded-full transition ${
            currentStatus === s
              ? "bg-slate-900 text-white"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          {statusLabels[s] ?? s}
        </button>
      ))}

      <select
        value={searchParams.get("service") ?? "ALL"}
        onChange={(e) => update("service", e.target.value)}
        className="text-xs rounded-lg border border-slate-300 px-2 py-1.5 ml-2"
      >
        <option value="ALL">Все сервисы</option>
        {services.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>

      <select
        value={searchParams.get("masterId") ?? "ALL"}
        onChange={(e) => update("masterId", e.target.value)}
        className="text-xs rounded-lg border border-slate-300 px-2 py-1.5"
      >
        <option value="ALL">Все мастера</option>
        {masters.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name}
          </option>
        ))}
      </select>

      <input
        type="date"
        value={searchParams.get("dateFrom") ?? ""}
        onChange={(e) => update("dateFrom", e.target.value)}
        className="text-xs rounded-lg border border-slate-300 px-2 py-1.5"
      />
      <span className="text-xs text-slate-400">—</span>
      <input
        type="date"
        value={searchParams.get("dateTo") ?? ""}
        onChange={(e) => update("dateTo", e.target.value)}
        className="text-xs rounded-lg border border-slate-300 px-2 py-1.5"
      />

      <button
        onClick={handleExport}
        className="ml-auto text-xs font-medium bg-emerald-600 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-700 transition"
      >
        Экспорт в Excel
      </button>
    </div>
  );
}
