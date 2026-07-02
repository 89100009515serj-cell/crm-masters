"use client";

import { useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { RescheduleModal } from "@/components/reschedule-modal";
import { RescheduleHistoryModal } from "@/components/reschedule-history-modal";
import { ReceiptPhotosModal } from "@/components/receipt-photos-modal";

interface RequestRow {
  id: string;
  source: string;
  service: string;
  scheduledAt: string;
  actualStartAt: string | null;
  status: string;
  masterId: string | null;
  masterName: string | null;
  createdByName: string;
  wasRescheduled: boolean;
  totalReceipt: number | null;
  expense: number | null;
  masterPayout: number | null;
  companyProfit: number | null;
  receiptPhotoUrls: string[];
}

const statusLabels: Record<string, string> = {
  NEW: "Новая",
  ASSIGNED: "Назначена",
  ACCEPTED: "Принята",
  ON_SITE: "На адресе",
  COMPLETED: "Завершена",
  CANCELLED: "Отменена",
};

const statusColors: Record<string, string> = {
  NEW: "bg-slate-100 text-slate-700",
  ASSIGNED: "bg-blue-100 text-blue-700",
  ACCEPTED: "bg-amber-100 text-amber-700",
  ON_SITE: "bg-orange-100 text-orange-700",
  COMPLETED: "bg-emerald-100 text-emerald-700",
  CANCELLED: "bg-red-100 text-red-700",
};

type SortKey = "scheduledAt" | "totalReceipt" | "companyProfit";

export function RequestsTableView({
  requests,
  showFullFinance,
  canReschedule,
  canViewPhotos,
  viewOnly = false,
}: {
  requests: RequestRow[];
  showFullFinance: boolean;
  canReschedule: boolean;
  canViewPhotos: boolean;
  viewOnly?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const sortKey = (searchParams.get("sortKey") as SortKey) ?? "scheduledAt";
  const sortDir = (searchParams.get("sortDir") as "asc" | "desc") ?? "desc";

  const [rescheduleTarget, setRescheduleTarget] = useState<RequestRow | null>(null);
  const [historyTarget, setHistoryTarget] = useState<string | null>(null);
  const [photosTarget, setPhotosTarget] = useState<string[] | null>(null);

  function toggleSort(key: SortKey) {
    const params = new URLSearchParams(searchParams.toString());
    if (sortKey === key) {
      params.set("sortDir", sortDir === "asc" ? "desc" : "asc");
    } else {
      params.set("sortKey", key);
      params.set("sortDir", "desc");
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  const showReschedule = canReschedule && !viewOnly;

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-left text-slate-500 text-xs uppercase tracking-wide">
              <th className="px-4 py-3">Источник</th>
              <th className="px-4 py-3">Сервис</th>
              <th
                className="px-4 py-3 cursor-pointer select-none"
                onClick={() => toggleSort("scheduledAt")}
              >
                Запланировано {sortKey === "scheduledAt" && (sortDir === "asc" ? "↑" : "↓")}
              </th>
              <th className="px-4 py-3">Факт. старт</th>
              <th className="px-4 py-3">Статус</th>
              <th className="px-4 py-3">Мастер</th>
              <th className="px-4 py-3">Создал</th>
              {canViewPhotos && <th className="px-4 py-3">Фото</th>}
              {showFullFinance && (
                <>
                  <th
                    className="px-4 py-3 text-right cursor-pointer select-none"
                    onClick={() => toggleSort("totalReceipt")}
                  >
                    Чек {sortKey === "totalReceipt" && (sortDir === "asc" ? "↑" : "↓")}
                  </th>
                  <th className="px-4 py-3 text-right">Расход</th>
                  <th className="px-4 py-3 text-right">Мастеру</th>
                  <th className="px-4 py-3 text-right">Менедж.</th>
                  <th className="px-4 py-3 text-right">Куратор.</th>
                  <th
                    className="px-4 py-3 text-right cursor-pointer select-none"
                    onClick={() => toggleSort("companyProfit")}
                  >
                    Компании {sortKey === "companyProfit" && (sortDir === "asc" ? "↑" : "↓")}
                  </th>
                </>
              )}
              {showReschedule && <th className="px-4 py-3"></th>}
            </tr>
          </thead>
          <tbody>
            {requests.map((r) => (
              <tr key={r.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-3">{r.source}</td>
                <td className="px-4 py-3">{r.service}</td>
                <td className="px-4 py-3">
                  {new Date(r.scheduledAt).toLocaleString("ru-RU")}
                  {r.wasRescheduled && (
                    <button
                      onClick={() => setHistoryTarget(r.id)}
                      className="ml-2 text-[10px] font-medium bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full hover:bg-violet-200 transition"
                    >
                      Перенесено
                    </button>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-500">
                  {r.actualStartAt ? new Date(r.actualStartAt).toLocaleString("ru-RU") : "—"}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`text-xs font-medium px-2 py-1 rounded-full ${statusColors[r.status]}`}
                  >
                    {statusLabels[r.status]}
                  </span>
                </td>
                <td className="px-4 py-3">{r.masterName ?? "—"}</td>
                <td className="px-4 py-3 text-slate-500">{r.createdByName}</td>
                {canViewPhotos && (
                  <td className="px-4 py-3">
                    {r.receiptPhotoUrls.length > 0 ? (
                      <button
                        onClick={() => setPhotosTarget(r.receiptPhotoUrls)}
                        className="text-base hover:scale-110 transition"
                        title={`${r.receiptPhotoUrls.length} фото`}
                      >
                        📷
                      </button>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                )}
                {showFullFinance && (
                  <>
                    <td className="px-4 py-3 text-right">
                      {r.totalReceipt?.toLocaleString("ru-RU") ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {r.expense?.toLocaleString("ru-RU") ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {r.masterPayout?.toLocaleString("ru-RU") ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-400">
                      {r.totalReceipt && r.expense
                        ? ((r.totalReceipt - r.expense) * 0.04).toLocaleString("ru-RU")
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-400">
                      {r.totalReceipt && r.expense
                        ? ((r.totalReceipt - r.expense) * 0.05).toLocaleString("ru-RU")
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      {r.companyProfit?.toLocaleString("ru-RU") ?? "—"}
                    </td>
                  </>
                )}
                {showReschedule && (
                  <td className="px-4 py-3 text-right">
                    {r.status !== "COMPLETED" && r.status !== "CANCELLED" && (
                      <button
                        onClick={() => setRescheduleTarget(r)}
                        className="text-xs font-medium text-slate-600 hover:text-slate-900 underline"
                      >
                        Перенести
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
            {requests.length === 0 && (
              <tr>
                <td
                  colSpan={20}
                  className="px-4 py-10 text-center text-slate-400"
                >
                  Заявок не найдено
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {rescheduleTarget && (
        <RescheduleModal
          open={!!rescheduleTarget}
          onClose={() => setRescheduleTarget(null)}
          requestId={rescheduleTarget.id}
          currentScheduledAt={rescheduleTarget.scheduledAt}
          onRescheduled={() => router.refresh()}
        />
      )}

      {historyTarget && (
        <RescheduleHistoryModal
          open={!!historyTarget}
          onClose={() => setHistoryTarget(null)}
          requestId={historyTarget}
        />
      )}

      {photosTarget && (
        <ReceiptPhotosModal
          open={!!photosTarget}
          onClose={() => setPhotosTarget(null)}
          urls={photosTarget}
        />
      )}
    </div>
  );
}
