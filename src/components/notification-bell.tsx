"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { getMyNotifications, markNotificationsRead } from "@/server-actions/notifications";

interface NotificationItem {
  id: string;
  type: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  requestId: string | null;
}

const POLL_INTERVAL = 30000;

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [isPending, startTransition] = useTransition();
  const containerRef = useRef<HTMLDivElement>(null);

  function load() {
    getMyNotifications()
      .then((data) => {
        setUnreadCount(data.unreadCount);
        setItems(data.items);
      })
      .catch(() => {});
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleOpen() {
    setOpen((v) => !v);
    if (!open && unreadCount > 0) {
      startTransition(async () => {
        await markNotificationsRead();
        setUnreadCount(0);
        setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
      });
    }
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={handleOpen}
        className="relative w-9 h-9 flex items-center justify-center rounded-full hover:bg-slate-100 transition"
        aria-label="Уведомления"
      >
        <span className="text-lg">🔔</span>
        {unreadCount > 0 && (
          <span className="absolute top-0.5 right-0.5 bg-red-500 text-white text-[10px] font-medium w-4 h-4 rounded-full flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto bg-white rounded-xl border border-slate-200 shadow-lg z-50">
          <div className="px-4 py-3 border-b border-slate-100 font-medium text-sm text-slate-900">
            Уведомления
          </div>
          {items.length === 0 ? (
            <p className="px-4 py-6 text-sm text-slate-400 text-center">Пока ничего нет</p>
          ) : (
            items.map((n) => (
              <div
                key={n.id}
                className={`px-4 py-3 border-b border-slate-50 text-sm ${
                  n.isRead ? "text-slate-500" : "text-slate-900 bg-slate-50"
                }`}
              >
                <p>{n.message}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {new Date(n.createdAt).toLocaleString("ru-RU")}
                </p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
