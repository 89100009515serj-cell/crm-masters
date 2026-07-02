"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/modal";
import { getRescheduleHistory } from "@/server-actions/get-reschedule-history";

interface HistoryEntry {
  id: string;
  oldScheduledAt: string;
  newScheduledAt: string;
  reason: string | null;
  changedByName: string;
  createdAt: string;
}

export function RescheduleHistoryModal({
  open,
  onClose,
  requestId,
}: {
  open: boolean;
  onClose: () => void;
  requestId: string;
}) {
  const [history, setHistory] = useState<HistoryEntry[] | null>(null);

  useEffect(() => {
    if (open) {
      setHistory(null);
      getRescheduleHistory(requestId).then(setHistory).catch(() => setHistory([]));
    }
  }, [open, requestId]);

  return (
    <Modal open={open} onClose={onClose} title="История переносов">
      {history === null && <p className="text-sm text-slate-400">Загрузка...</p>}
      {history?.length === 0 && <p className="text-sm text-slate-400">Переносов не было</p>}
      <div className="space-y-3">
        {history?.map((h) => (
          <div key={h.id} className="border-l-2 border-violet-300 pl-3 py-1">
            <p className="text-sm text-slate-900">
              {new Date(h.oldScheduledAt).toLocaleString("ru-RU")} →{" "}
              <span className="font-medium">{new Date(h.newScheduledAt).toLocaleString("ru-RU")}</span>
            </p>
            {h.reason && <p className="text-sm text-slate-500 mt-0.5">Причина: {h.reason}</p>}
            <p className="text-xs text-slate-400 mt-0.5">
              {h.changedByName} · {new Date(h.createdAt).toLocaleString("ru-RU")}
            </p>
          </div>
        ))}
      </div>
    </Modal>
  );
}
