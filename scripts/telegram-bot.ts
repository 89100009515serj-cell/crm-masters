/**
 * Простой long-polling бот для выдачи пользователю его Telegram chat_id.
 * Это отдельный процесс, не часть Next.js-приложения — запускается
 * самостоятельно (см. README, раздел "Telegram-бот").
 *
 * Использование: npx tsx scripts/telegram-bot.ts
 */

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

if (!BOT_TOKEN) {
  console.error("Укажите TELEGRAM_BOT_TOKEN в переменных окружения перед запуском");
  process.exit(1);
}

const API_BASE = `https://api.telegram.org/bot${BOT_TOKEN}`;

interface TelegramUpdate {
  update_id: number;
  message?: {
    chat: { id: number };
    text?: string;
    from?: { first_name?: string };
  };
}

let offset = 0;

async function sendMessage(chatId: number, text: string) {
  await fetch(`${API_BASE}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
}

async function poll() {
  try {
    const res = await fetch(`${API_BASE}/getUpdates?offset=${offset}&timeout=30`);
    const data = (await res.json()) as { result: TelegramUpdate[] };

    for (const update of data.result) {
      offset = update.update_id + 1;
      const msg = update.message;
      if (!msg?.text) continue;

      if (msg.text.startsWith("/start")) {
        const name = msg.from?.first_name ?? "";
        await sendMessage(
          msg.chat.id,
          `Здравствуйте${name ? ", " + name : ""}!\n\n` +
            `Ваш Telegram ID: ${msg.chat.id}\n\n` +
            `Скопируйте это число и вставьте в поле "Telegram ID" в настройках профиля CRM, ` +
            `чтобы подключить уведомления.`
        );
      }
    }
  } catch (err) {
    console.error("Ошибка опроса Telegram API", err);
  }

  setTimeout(poll, 1000);
}

console.log("Telegram-бот запущен, ожидаю команду /start от пользователей...");
poll();
