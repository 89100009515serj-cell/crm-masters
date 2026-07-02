import { prisma } from "@/lib/prisma";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const APP_URL = process.env.APP_URL ?? "http://localhost:3000";

export type TelegramNotificationType = "ASSIGNED" | "RESCHEDULE" | "ACCEPTED" | "ON_SITE";

interface RequestLike {
  id: string;
  clientName: string;
  clientAddress: string;
  serviceName: string;
  scheduledAt: Date;
}

/**
 * Низкоуровневая отправка сообщения через Telegram Bot API.
 * Используется fetch напрямую — без сторонних библиотек и без long-polling,
 * что подходит для serverless/однократных вызовов из server actions.
 */
async function sendRaw(chatId: string, text: string): Promise<boolean> {
  if (!BOT_TOKEN) {
    console.warn("TELEGRAM_BOT_TOKEN не задан — Telegram-уведомление пропущено");
    return false;
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    });
    if (!res.ok) {
      console.error("Telegram API error", await res.text());
      return false;
    }
    return true;
  } catch (err) {
    console.error("Не удалось отправить Telegram-сообщение", err);
    return false;
  }
}

/**
 * Простая неблокирующая "очередь": ставит отправку в микротаск после
 * текущего тика, не дожидаясь её внутри server action. Этого достаточно,
 * чтобы не задерживать ответ пользователю; при необходимости можно заменить
 * на настоящую очередь (BullMQ/QStash), сохранив тот же интерфейс enqueue().
 */
function enqueue(task: () => Promise<void>) {
  setTimeout(() => {
    task().catch((err) => console.error("Telegram queue task failed", err));
  }, 0);
}

function escapeHtml(text: string) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function formatDateTime(date: Date) {
  return date.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function requestLink(requestId: string) {
  return `${APP_URL}/requests?highlight=${requestId}`;
}

const templates: Record<
  TelegramNotificationType,
  (r: RequestLike, extra?: { newDate?: Date; reason?: string }) => string
> = {
  ASSIGNED: (r) =>
    `<b>Новая заявка №${shortId(r.id)}</b>\n` +
    `Клиент: ${escapeHtml(r.clientName)}\n` +
    `Адрес: ${escapeHtml(r.clientAddress)}\n` +
    `Сервис: ${escapeHtml(r.serviceName)}\n` +
    `Время: ${formatDateTime(r.scheduledAt)}\n` +
    `Ссылка: ${requestLink(r.id)}`,

  RESCHEDULE: (r, extra) =>
    `<b>Заявка №${shortId(r.id)} перенесена</b>\n` +
    `Клиент: ${escapeHtml(r.clientName)}\n` +
    `Новое время: ${formatDateTime(extra?.newDate ?? r.scheduledAt)}\n` +
    (extra?.reason ? `Причина: ${escapeHtml(extra.reason)}\n` : "") +
    `Ссылка: ${requestLink(r.id)}`,

  ACCEPTED: (r) =>
    `<b>Мастер принял заявку №${shortId(r.id)}</b>\n` +
    `Клиент: ${escapeHtml(r.clientName)}\n` +
    `Время: ${formatDateTime(r.scheduledAt)}\n` +
    `Ссылка: ${requestLink(r.id)}`,

  ON_SITE: (r) =>
    `<b>Мастер на адресе — заявка №${shortId(r.id)}</b>\n` +
    `Клиент: ${escapeHtml(r.clientName)}\n` +
    `Адрес: ${escapeHtml(r.clientAddress)}\n` +
    `Ссылка: ${requestLink(r.id)}`,
};

function shortId(id: string) {
  return id.slice(-6).toUpperCase();
}

/**
 * Отправляет Telegram-уведомление пользователю, если у него подключён Telegram,
 * включены уведомления и данный тип уведомления не отключён в настройках.
 * Не блокирует вызывающий код — ставится в очередь и выполняется асинхронно.
 * Если передан notificationId, по факту отправки помечает Notification.deliveredToTelegram.
 */
export function notifyTelegram(params: {
  userId: string;
  type: TelegramNotificationType;
  request: RequestLike;
  notificationId?: string;
  newDate?: Date;
  reason?: string;
}) {
  enqueue(async () => {
    const user = await prisma.user.findUnique({
      where: { id: params.userId },
      select: { telegramChatId: true, telegramEnabled: true, telegramNotifyTypes: true },
    });

    if (!user?.telegramChatId || !user.telegramEnabled) return;
    if (!user.telegramNotifyTypes.includes(params.type)) return;

    const text = templates[params.type](params.request, {
      newDate: params.newDate,
      reason: params.reason,
    });

    const delivered = await sendRaw(user.telegramChatId, text);

    if (delivered && params.notificationId) {
      await prisma.notification.update({
        where: { id: params.notificationId },
        data: { deliveredToTelegram: true },
      });
    }
  });
}

/**
 * Проверяет связку Telegram ID, отправив тестовое сообщение.
 * Используется при подключении Telegram в профиле пользователя.
 */
export async function sendTelegramTestMessage(chatId: string): Promise<boolean> {
  return sendRaw(
    chatId,
    "✅ Telegram подключён к CRM Мастеров. Вы будете получать уведомления о заявках здесь."
  );
}
