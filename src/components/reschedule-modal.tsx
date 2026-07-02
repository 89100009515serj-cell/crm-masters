"use client";

import { useState, useTransition } from "react";
import { Modal } from "@/components/modal";
import { rescheduleRequest } from "@/server-actions/reschedule-request";
import { useToast } from "@/components/toast";

interface RescheduleModalProps {
  open: boolean;
  onClose: () => void;
  requestId: string;
  currentScheduledAt: string;
  onRescheduled: (newDate: string) => void;
}

export function RescheduleModal({
  open,
  onClose,
  requestId,
  currentScheduledAt,
  onRescheduled,
}: RescheduleModalProps) {
  const { show } = useToast();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(formData: FormData) {
    setError(null);
    const newScheduledAt = String(formData.get("newScheduledAt"));
    const reason = String(formData.get("reason") ?? "");

    startTransition(async () => {
      try {
        await rescheduleRequest({
          requestId,
          newScheduledAt: new Date(newScheduledAt),
          reason: reason || undefined,
        });
        onRescheduled(new Date(newScheduledAt).toISOString());
        show("Заявка перенесена, мастер уведомлён");
        onClose();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Не удалось перенести заявку");
      }
    });
  }

  return (
    <Modal open={open} onClose={onClose} title="Перенос заявки">
      <form action={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Текущая дата и время</label>
          <p className="text-sm text-slate-500 bg-slate-50 rounded-lg px-3 py-2 border border-slate-200">
            {new Date(currentScheduledAt).toLocaleString("ru-RU")}
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Новая дата и время</label>
          <input
            name="newScheduledAt"
            type="datetime-local"
            required
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Причина переноса (необязательно)
          </label>
          <textarea
            name="reason"
            rows={2}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-3 pt-1">
          <button
            type="submit"
            disabled={isPending}
            className="rounded-lg bg-slate-900 text-white text-sm font-medium px-4 py-2.5 hover:bg-slate-800 disabled:opacity-50 transition"
          >
            {isPending ? "Сохраняем..." : "Перенести"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 text-slate-700 text-sm font-medium px-4 py-2.5 hover:bg-slate-50 transition"
          >
            Отмена
          </button>
        </div>
      </form>
    </Modal>
  );
}
