"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { acceptRequest, arriveAtSite } from "@/server-actions/master-actions";
import { completeRequest } from "@/server-actions/complete-request";
import { RescheduleHistoryModal } from "@/components/reschedule-history-modal";
import { ReceiptPhotoUpload } from "@/components/receipt-photo-upload";
import { useToast } from "@/components/toast";

interface MasterRequest {
  id: string;
  clientAddress: string;
  clientPhone: string;
  service: string;
  scheduledAt: string;
  status: string;
  description: string;
  wasRescheduled: boolean;
  receiptPhotoUrls: string[];
}

const statusLabels: Record<string, string> = {
  NEW: "Новая",
  ASSIGNED: "Назначена",
  ACCEPTED: "Принята",
  ON_SITE: "На адресе",
  COMPLETED: "Завершена",
};

export function MasterRequestCard({ request }: { request: MasterRequest }) {
  const router = useRouter();
  const [status, setStatus] = useState(request.status);
  const [showCloseForm, setShowCloseForm] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [photoUrls, setPhotoUrls] = useState(request.receiptPhotoUrls);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const { show } = useToast();

  function handleAccept() {
    startTransition(async () => {
      try {
        await acceptRequest(request.id);
        setStatus("ACCEPTED");
      } catch (e) {
        show(e instanceof Error ? e.message : "Не удалось обновить статус", "error");
      }
    });
  }

  function handleArrive() {
    startTransition(async () => {
      try {
        await arriveAtSite(request.id);
        setStatus("ON_SITE");
        setShowCloseForm(true);
      } catch (e) {
        show(e instanceof Error ? e.message : "Не удалось обновить статус", "error");
      }
    });
  }

  function handleComplete(formData: FormData) {
    setError(null);

    const totalReceipt = Number(formData.get("totalReceipt"));
    const expense = Number(formData.get("expense"));

    if (!formData.get("totalReceipt") || Number.isNaN(totalReceipt) || totalReceipt <= 0) {
      setError("Укажите сумму общего чека");
      return;
    }
    if (formData.get("expense") === null || formData.get("expense") === "" || Number.isNaN(expense)) {
      setError("Укажите расход (если расхода не было — введите 0)");
      return;
    }

    startTransition(async () => {
      try {
        await completeRequest({
          requestId: request.id,
          totalReceipt,
          expense,
          comment: String(formData.get("comment") ?? ""),
        });
        setStatus("COMPLETED");
        setShowCloseForm(false);
        show("Заявка завершена");
        // заявка должна уйти из активного списка — серверный запрос исключает COMPLETED
        router.refresh();
      } catch (e) {
        const message = e instanceof Error ? e.message : "Ошибка при завершении заявки";
        setError(message);
        show(message, "error");
      }
    });
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium px-2 py-1 rounded-full bg-slate-100 text-slate-700">
          {statusLabels[status]}
        </span>
        {request.wasRescheduled && (
          <button
            onClick={() => setShowHistory(true)}
            className="text-[10px] font-medium bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full hover:bg-violet-200 transition"
          >
            Перенесено
          </button>
        )}
      </div>

      <h3 className="font-medium text-slate-900">{request.service}</h3>
      <p className="text-sm text-slate-500 mt-1">{request.clientAddress}</p>
      <p className="text-sm text-slate-500">{request.clientPhone}</p>
      <p className="text-sm text-slate-700 mt-2">{request.description}</p>
      <p className="text-sm font-medium text-slate-900 mt-2">
        {new Date(request.scheduledAt).toLocaleString("ru-RU")}
      </p>

      {status === "ASSIGNED" && (
        <button
          onClick={handleAccept}
          disabled={isPending}
          className="mt-3 w-full rounded-lg bg-slate-900 text-white text-sm font-medium py-2.5 disabled:opacity-50"
        >
          Принял
        </button>
      )}

      {status === "ACCEPTED" && (
        <button
          onClick={handleArrive}
          disabled={isPending}
          className="mt-3 w-full rounded-lg bg-slate-900 text-white text-sm font-medium py-2.5 disabled:opacity-50"
        >
          На адресе
        </button>
      )}

      {status === "ON_SITE" && !showCloseForm && (
        <button
          onClick={() => setShowCloseForm(true)}
          className="mt-3 w-full rounded-lg bg-emerald-600 text-white text-sm font-medium py-2.5"
        >
          Завершить заявку
        </button>
      )}

      {status === "ON_SITE" && showCloseForm && (
        <form action={handleComplete} className="mt-3 space-y-3 border-t border-slate-100 pt-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Общий чек, ₽</label>
            <input
              name="totalReceipt"
              type="number"
              step="0.01"
              min="0"
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Расход, ₽</label>
            <input
              name="expense"
              type="number"
              step="0.01"
              min="0"
              defaultValue={0}
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Комментарий</label>
            <textarea
              name="comment"
              rows={2}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <ReceiptPhotoUpload
            requestId={request.id}
            initialUrls={photoUrls}
            onChange={setPhotoUrls}
          />

          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={isPending}
            className="w-full rounded-lg bg-emerald-600 text-white text-sm font-medium py-2.5 disabled:opacity-50"
          >
            {isPending ? "Сохраняем..." : "Подтвердить завершение"}
          </button>
        </form>
      )}

      {status === "COMPLETED" && (
        <p className="mt-3 text-sm text-emerald-600 font-medium">Заявка завершена</p>
      )}

      <RescheduleHistoryModal
        open={showHistory}
        onClose={() => setShowHistory(false)}
        requestId={request.id}
      />
    </div>
  );
}
