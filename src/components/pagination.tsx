"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";

export function Pagination({
  page,
  totalPages,
  total,
}: {
  page: number;
  totalPages: number;
  total: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function goTo(p: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(p));
    router.push(`${pathname}?${params.toString()}`);
  }

  if (totalPages <= 1) {
    return <p className="px-5 py-3 text-xs text-slate-400">Всего заявок: {total}</p>;
  }

  return (
    <div className="px-5 py-3 flex items-center justify-between border-t border-slate-100">
      <p className="text-xs text-slate-400">
        Стр. {page} из {totalPages} · всего {total}
      </p>
      <div className="flex gap-1">
        <button
          onClick={() => goTo(page - 1)}
          disabled={page <= 1}
          className="text-xs font-medium px-3 py-1.5 rounded-lg border border-slate-300 disabled:opacity-40 hover:bg-slate-50"
        >
          Назад
        </button>
        <button
          onClick={() => goTo(page + 1)}
          disabled={page >= totalPages}
          className="text-xs font-medium px-3 py-1.5 rounded-lg border border-slate-300 disabled:opacity-40 hover:bg-slate-50"
        >
          Вперёд
        </button>
      </div>
    </div>
  );
}
