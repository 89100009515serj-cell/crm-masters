import Link from "next/link";
import { NotificationBell } from "@/components/notification-bell";
import type { Role } from "@prisma/client";

export function AppHeader({ role }: { role: Role }) {
  const links: { href: string; label: string }[] = [{ href: "/dashboard", label: "Дашборд" }];

  if (role !== "MASTER") {
    links.push({ href: "/requests", label: "Заявки" });
    links.push({ href: "/archive", label: "Архив" });
  } else {
    links.push({ href: "/my-requests", label: "Мои заявки" });
  }

  if (role === "ADMIN" || role === "CURATOR") {
    links.push({ href: "/masters", label: "Мастера" });
  }

  links.push({ href: "/profile", label: "Профиль" });

  return (
    <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between sticky top-0 z-20">
      <nav className="flex items-center gap-5">
        <span className="font-semibold text-slate-900 text-sm">CRM Мастеров</span>
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="text-sm text-slate-600 hover:text-slate-900 transition"
          >
            {l.label}
          </Link>
        ))}
      </nav>
      <NotificationBell />
    </header>
  );
}
