"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { ForbiddenError } from "@/lib/permissions";

export async function getMyNotifications() {
  const session = await auth();
  if (!session?.user) throw new ForbiddenError("Не авторизован");

  const notifications = await prisma.notification.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  const unreadCount = await prisma.notification.count({
    where: { userId: session.user.id, isRead: false },
  });

  return {
    unreadCount,
    items: notifications.map((n) => ({
      id: n.id,
      type: n.type,
      message: n.message,
      isRead: n.isRead,
      createdAt: n.createdAt.toISOString(),
      requestId: n.requestId,
    })),
  };
}

export async function markNotificationsRead() {
  const session = await auth();
  if (!session?.user) throw new ForbiddenError("Не авторизован");

  await prisma.notification.updateMany({
    where: { userId: session.user.id, isRead: false },
    data: { isRead: true },
  });
}
