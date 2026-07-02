"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createRequest } from "@/server-actions/create-request";
import { useToast } from "@/components/toast";

interface Option {
  id: string;
  name?: string;
  fullName?: string;
}

export function NewRequestForm({
  sources,
  services,
  masters,
}: {
  sources: Option[];
  services: Option[];
  masters: Option[];
}) {
  const router = useRouter();
  const { show } = useToast();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(formData: FormData) {
    setError(null);
    const assignedMasterId = formData.get("assignedMasterId");

    startTransition(async () => {
      try {
        await createRequest({
          sourceId: String(formData.get("sourceId")),
          serviceTypeId: String(formData.get("serviceTypeId")),
          clientName: String(formData.get("clientName")),
          clientPhone: String(formData.get("clientPhone")),
          clientAddress: String(formData.get("clientAddress")),
          description: String(formData.get("description")),
          scheduledAt: new Date(String(formData.get("scheduledAt"))),
          assignedMasterId: assignedMasterId ? String(assignedMasterId) : undefined,
        });
        show(
          assignedMasterId
            ? "Заявка создана, мастер уведомлён"
            : "Заявка создана"
        );
        router.push("/requests");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Не удалось создать заявку");
      }
    });
  }

  return (
    <form action={handleSubmit} className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Field label="Источник">
          <select name="sourceId" required className={inputClass}>
            <option value="">Выберите…</option>
            {sources.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Сервис / Вид работ">
          <select name="serviceTypeId" required className={inputClass}>
            <option value="">Выберите…</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="ФИО клиента">
        <input name="clientName" required className={inputClass} />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Телефон">
          <input name="clientPhone" required className={inputClass} />
        </Field>
        <Field label="Планируемая дата и время">
          <input name="scheduledAt" type="datetime-local" required className={inputClass} />
        </Field>
      </div>

      <Field label="Адрес">
        <input name="clientAddress" required className={inputClass} />
      </Field>

      <Field label="Описание работ">
        <textarea name="description" required rows={3} className={inputClass} />
      </Field>

      <Field label="Назначить мастера (необязательно)">
        <select name="assignedMasterId" className={inputClass}>
          <option value="">Не назначать сейчас</option>
          {masters.map((m) => (
            <option key={m.id} value={m.id}>
              {m.fullName}
            </option>
          ))}
        </select>
      </Field>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-slate-900 text-white text-sm font-medium px-5 py-2.5 hover:bg-slate-800 disabled:opacity-50 transition"
        >
          {isPending ? "Создаём..." : "Создать заявку"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/requests")}
          className="rounded-lg border border-slate-300 text-slate-700 text-sm font-medium px-5 py-2.5 hover:bg-slate-50 transition"
        >
          Отмена
        </button>
      </div>
    </form>
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
