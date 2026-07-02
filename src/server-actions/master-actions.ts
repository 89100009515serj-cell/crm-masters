"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { ForbiddenError } from "@/lib/permissions";
import { notifyTelegram } from "@/lib/telegram";
import { revalidatePath } from "next/cache";

async function assertOwnRequest(requestId: string, masterId: string) {
  const request = await prisma.request.findUniqueOrThrow({
    where: { id: requestId },
    include: { serviceType: true },
  });
  if (request.assignedMasterId !== masterId) {
    throw new ForbiddenError("Это не ваша заявка");
  }
  return request;
}

export async function acceptRequest(requestId: string) {
  const session = await auth();
  if (!session?.user || session.user.role !== "MASTER") {
    throw new ForbiddenError("Доступно только мастеру");
  }

  const existing = await assertOwnRequest(requestId, session.user.id);

  const updated = await prisma.request.update({
    where: { id: requestId },
    data: { status: "ACCEPTED" },
  });

  const notification = await prisma.notification.create({
    data: {
      userId: updated.createdById,
      requestId: updated.id,
      type: "ACCEPTED",
      message: `Мастер принял заявку на ${updated.scheduledAt.toLocaleString("ru-RU")}`,
    },
  });

  notifyTelegram({
    userId: updated.createdById,
    type: "ACCEPTED",
    notificationId: notification.id,
    request: {
      id: updated.id,
      clientName: existing.clientName,
      clientAddress: existing.clientAddress,
      serviceName: existing.serviceType.name,
      scheduledAt: updated.scheduledAt,
    },
  });

  revalidatePath("/my-requests");
  return { id: updated.id, status: updated.status };
}

export async function arriveAtSite(requestId: string) {
  const session = await auth();
  if (!session?.user || session.user.role !== "MASTER") {
    throw new ForbiddenError("Доступно только мастеру");
  }

  const existing = await assertOwnRequest(requestId, session.user.id);

  const updated = await prisma.request.update({
    where: { id: requestId },
    data: { status: "ON_SITE", actualStartAt: new Date() },
  });

  const notification = await prisma.notification.create({
    data: {
      userId: updated.createdById,
      requestId: updated.id,
      type: "ON_SITE",
      message: `Мастер на адресе по заявке ${existing.clientAddress}`,
    },
  });

  notifyTelegram({
    userId: updated.createdById,
    type: "ON_SITE",
    notificationId: notification.id,
    request: {
      id: updated.id,
      clientName: existing.clientName,
      clientAddress: existing.clientAddress,
      serviceName: existing.serviceType.name,
      scheduledAt: updated.scheduledAt,
    },
  });

  revalidatePath("/my-requests");
  return { id: updated.id, status: updated.status };
}