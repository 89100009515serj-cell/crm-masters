"use client";

import { useRouter, useSearchParams } from "next/navigation";

const presets: { value: string; label: string }[] = [
  { value: "today", label: "Сегодня" },
  { value: "7d", label: "7 дней" },
  { value: "30d", label: "30 дней" },
  { value: "all", label: "Весь период" },
];

export function PeriodPicker({ current }: { current: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function setPreset(preset: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("period", preset);
    params.delete("from");
    params.delete("to");
    router.push(`/dashboard?${params.toString()}`);
  }

  function setCustomDate(key: "from" | "to", value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
      params.set("period", "custom");
    } else {
      params.delete(key);
    }
    router.push(`/dashboard?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {presets.map((p) => (
        <button
          key={p.value}
          onClick={() => setPreset(p.value)}
          className={`text-xs font-medium px-3 py-1.5 rounded-full transition ${
            current === p.value
              ? "bg-slate-900 text-white"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          {p.label}
        </button>
      ))}
      <span className="text-xs text-slate-400 ml-2">или произвольный период:</span>
      <input
        type="date"
        defaultValue={searchParams.get("from") ?? ""}
        onChange={(e) => setCustomDate("from", e.target.value)}
        className="text-xs rounded-lg border border-slate-300 px-2 py-1.5"
      />
      <span className="text-xs text-slate-400">—</span>
      <input
        type="date"
        defaultValue={searchParams.get("to") ?? ""}
        onChange={(e) => setCustomDate("to", e.target.value)}
        className="text-xs rounded-lg border border-slate-300 px-2 py-1.5"
      />
    </div>
  );
}
