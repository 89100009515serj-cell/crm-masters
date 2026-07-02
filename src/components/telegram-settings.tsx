"use client";

import { useState, useTransition } from "react";
import {
  connectTelegram,
  disconnectTelegram,
  setTelegramEnabled,
  setTelegramNotifyTypes,
} from "@/server-actions/profile";
import { useToast } from "@/components/toast";

const TYPE_LABELS: Record<string, string> = {
  ASSIGNED: "Назначение заявки",
  RESCHEDULE: "Перенос заявки",
  ACCEPTED: "Мастер принял заявку",
  ON_SITE: "Мастер на адресе",
};

export function TelegramSettings({
  isAdminOrCurator,
  initialConnected,
  initialEnabled,
  initialTypes,
}: {
  isAdminOrCurator: boolean;
  initialConnected: boolean;
  initialEnabled: boolean;
  initialTypes: string[];
}) {
  const { show } = useToast();
  const [connected, setConnected] = useState(initialConnected);
  const [enabled, setEnabled] = useState(initialEnabled);
  const [types, setTypes] = useState<string[]>(initialTypes);
  const [chatIdInput, setChatIdInput] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleConnect() {
    setError(null);
    startTransition(async () => {
      try {
        await connectTelegram({ telegramChatId: chatIdInput });
        setConnected(true);
        setEnabled(true);
        show("Telegram подключён, проверьте сообщение от бота");
      } catch (e) {
        const message = e instanceof Error ? e.message : "Не удалось подключить Telegram";
        setError(message);
        show(message, "error");
      }
    });
  }

  function handleDisconnect() {
    startTransition(async () => {
      await disconnectTelegram();
      setConnected(false);
      setEnabled(false);
      show("Telegram отключён");
    });
  }

  function handleToggleEnabled() {
    const next = !enabled;
    startTransition(async () => {
      await setTelegramEnabled(next);
      setEnabled(next);
    });
  }

  function handleToggleType(type: string) {
    const next = types.includes(type) ? types.filter((t) => t !== type) : [...types, type];
    setTypes(next);
    startTransition(async () => {
      await setTelegramNotifyTypes({ types: next as never });
    });
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <h2 className="font-medium text-slate-900 mb-1">Telegram-уведомления</h2>
      <p className="text-sm text-slate-500 mb-4">
        Чтобы узнать свой Telegram ID, напишите боту{" "}
        <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">/start</code> — он пришлёт ваш ID
        в ответ.
      </p>

      {!connected ? (
        <div className="space-y-3">
          <input
            value={chatIdInput}
            onChange={(e) => setChatIdInput(e.target.value)}
            placeholder="Например: 123456789"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            onClick={handleConnect}
            disabled={isPending || !chatIdInput}
            className="rounded-lg bg-slate-900 text-white text-sm font-medium px-4 py-2.5 hover:bg-slate-800 disabled:opacity-50 transition"
          >
            {isPending ? "Подключаем..." : "Подключить Telegram"}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-emerald-700 font-medium">✓ Telegram подключён</span>
            <button
              onClick={handleDisconnect}
              disabled={isPending}
              className="text-xs text-slate-500 hover:text-red-600 underline disabled:opacity-50"
            >
              Отключить
            </button>
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={enabled}
              onChange={handleToggleEnabled}
              disabled={isPending}
              className="rounded border-slate-300"
            />
            Получать уведомления в Telegram
          </label>

          {isAdminOrCurator && (
            <div>
              <p className="text-sm font-medium text-slate-700 mb-2">Какие уведомления получать</p>
              <div className="space-y-1.5">
                {Object.entries(TYPE_LABELS).map(([type, label]) => (
                  <label key={type} className="flex items-center gap-2 text-sm text-slate-600">
                    <input
                      type="checkbox"
                      checked={types.includes(type)}
                      onChange={() => handleToggleType(type)}
                      disabled={isPending || !enabled}
                      className="rounded border-slate-300"
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
