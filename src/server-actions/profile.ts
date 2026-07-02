"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { ForbiddenError } from "@/lib/permissions";
import { sendTelegramTestMessage, type TelegramNotificationType } from "@/lib/telegram";
import { revalidatePath } from "next/cache";

const ALL_NOTIFICATION_TYPES: TelegramNotificationType[] = [
  "ASSIGNED",
  "RESCHEDULE",
  "ACCEPTED",
  "ON_SITE",
];

export async function getMyProfile() {
  const session = await auth();
  if (!session?.user) throw new ForbiddenError("Не авторизован");

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: session.user.id },
    select: {
      fullName: true,
      phone: true,
      email: true,
      role: true,
      telegramChatId: true,
      telegramEnabled: true,
      telegramNotifyTypes: true,
    },
  });

  return user;
}

const connectSchema = z.object({
  telegramChatId: z.string().min(3, "Введите корректный Telegram ID"),
});

/**
 * Связывает Telegram-аккаунт пользователя: сохраняет chat_id и сразу
 * отправляет тестовое сообщение, чтобы убедиться, что ID указан верно.
 */
export async function connectTelegram(input: z.infer<typeof connectSchema>) {
  const session = await auth();
  if (!session?.user) throw new ForbiddenError("Не авторизован");

  const { telegramChatId } = connectSchema.parse(input);

  const delivered = await sendTelegramTestMessage(telegramChatId);
  if (!delivered) {
    throw new Error(
      "Не удалось отправить тестовое сообщение. Проверьте ID и убедитесь, что вы написали боту /start"
    );
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { telegramChatId, telegramEnabled: true },
  });

  revalidatePath("/profile");
  return { connected: true };
}

export async function disconnectTelegram() {
  const session = await auth();
  if (!session?.user) throw new ForbiddenError("Не авторизован");

  await prisma.user.update({
    where: { id: session.user.id },
    data: { telegramChatId: null, telegramEnabled: false },
  });

  revalidatePath("/profile");
}

export async function setTelegramEnabled(enabled: boolean) {
  const session = await auth();
  if (!session?.user) throw new ForbiddenError("Не авторизован");

  await prisma.user.update({
    where: { id: session.user.id },
    data: { telegramEnabled: enabled },
  });

  revalidatePath("/profile");
}

const notifyTypesSchema = z.object({
  types: z.array(z.enum(["ASSIGNED", "RESCHEDULE", "ACCEPTED", "ON_SITE"])),
});

export async function setTelegramNotifyTypes(input: z.infer<typeof notifyTypesSchema>) {
  const session = await auth();
  if (!session?.user) throw new ForbiddenError("Не авторизован");

  const { types } = notifyTypesSchema.parse(input);

  await prisma.user.update({
    where: { id: session.user.id },
    data: { telegramNotifyTypes: types.length > 0 ? types : ALL_NOTIFICATION_TYPES },
  });

  revalidatePath("/profile");
}
