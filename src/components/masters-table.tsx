"use client";

import { useState, useTransition } from "react";
import { Modal } from "@/components/modal";
import { addMaster, setMasterActive } from "@/server-actions/master-management";
import { useToast } from "@/components/toast";

interface MasterRow {
  id: string;
  fullName: string;
  phone: string;
  email: string | null;
  isActive: boolean;
  completedCount: number;
  totalPayout: number;
}

export function MastersTable({ initialMasters }: { initialMasters: MasterRow[] }) {
  const [masters, setMasters] = useState(initialMasters);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { show } = useToast();

  function handleToggleActive(id: string, current: boolean) {
    startTransition(async () => {
      try {
        await setMasterActive(id, !current);
        setMasters((prev) =>
          prev.map((m) => (m.id === id ? { ...m, isActive: !current } : m))
        );
        show(!current ? "Мастер включён" : "Мастер отключён");
      } catch (e) {
        show(e instanceof Error ? e.message : "Ошибка", "error");
      }
    });
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button
          onClick={() => setShowAddModal(true)}
          className="rounded-lg bg-slate-900 text-white text-sm font-medium px-4 py-2.5 hover:bg-slate-800 transition"
        >
          + Добавить мастера
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-left text-slate-500 text-xs uppercase tracking-wide">
              <th className="px-4 py-3">ФИО</th>
              <th className="px-4 py-3">Телефон</th>
              <th className="px-4 py-3 text-right">Выполнено заявок</th>
              <th className="px-4 py-3 text-right">Сумма выплат</th>
              <th className="px-4 py-3">Статус</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {masters.map((m) => (
              <tr key={m.id} className="border-t border-slate-100">
                <td className="px-4 py-3 font-medium text-slate-900">{m.fullName}</td>
                <td className="px-4 py-3 text-slate-500">{m.phone}</td>
                <td className="px-4 py-3 text-right">{m.completedCount}</td>
                <td className="px-4 py-3 text-right">
                  {m.totalPayout.toLocaleString("ru-RU")} ₽
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`text-xs font-medium px-2 py-1 rounded-full ${
                      m.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    {m.isActive ? "Активен" : "Отключён"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    disabled={isPending}
                    onClick={() => handleToggleActive(m.id, m.isActive)}
                    className="text-xs font-medium text-slate-600 hover:text-slate-900 underline disabled:opacity-50"
                  >
                    {m.isActive ? "Отключить" : "Включить"}
                  </button>
                </td>
              </tr>
            ))}
            {masters.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                  Мастеров пока нет
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <AddMasterModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdded={(m) =>
          setMasters((prev) => [
            ...prev,
            { ...m, phone: "", email: null, isActive: true, completedCount: 0, totalPayout: 0 },
          ])
        }
      />
    </div>
  );
}

function AddMasterModal({
  open,
  onClose,
  onAdded,
}: {
  open: boolean;
  onClose: () => void;
  onAdded: (m: { id: string; fullName: string }) => void;
}) {
  const { show } = useToast();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        const master = await addMaster({
          fullName: String(formData.get("fullName")),
          phone: String(formData.get("phone")),
          email: String(formData.get("email")),
          password: String(formData.get("password")),
        });
        onAdded(master);
        show("Мастер добавлен");
        onClose();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Не удалось добавить мастера");
      }
    });
  }

  return (
    <Modal open={open} onClose={onClose} title="Добавить мастера">
      <form action={handleSubmit} className="space-y-4">
        <Field label="ФИО">
          <input name="fullName" required className={inputClass} />
        </Field>
        <Field label="Телефон">
          <input name="phone" required className={inputClass} />
        </Field>
        <Field label="Email">
          <input name="email" type="email" required className={inputClass} />
        </Field>
        <Field label="Пароль">
          <input name="password" type="password" required minLength={6} className={inputClass} />
        </Field>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-3 pt-1">
          <button
            type="submit"
            disabled={isPending}
            className="rounded-lg bg-slate-900 text-white text-sm font-medium px-4 py-2.5 hover:bg-slate-800 disabled:opacity-50 transition"
          >
            {isPending ? "Добавляем..." : "Добавить"}
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

const inputClass =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      {children}
    </div>
  );
}
