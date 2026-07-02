"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { permissions, ForbiddenError } from "@/lib/permissions";
import { notifyTelegram } from "@/lib/telegram";
import { revalidatePath } from "next/cache";

const assignSchema = z.object({
  requestId: z.string().min(1),
  masterId: z.string().min(1),
});

export async function assignMaster(input: z.infer<typeof assignSchema>) {
  const session = await auth();
  if (!session?.user) throw new ForbiddenError("Не авторизован");

  if (!permissions.canAssignMaster(session.user.role)) {
    throw new ForbiddenError("Назначение мастеров недоступно для вашей роли");
  }

  const { requestId, masterId } = assignSchema.parse(input);

  const master = await prisma.user.findUnique({ where: { id: masterId } });
  if (!master || master.role !== "MASTER" || !master.isActive) {
    throw new Error("Мастер не найден или отключён");
  }

  const request = await prisma.request.update({
    where: { id: requestId },
    data: { assignedMasterId: masterId, status: "ASSIGNED" },
    include: { serviceType: true },
  });

  const notification = await prisma.notification.create({
    data: {
      userId: masterId,
      requestId: request.id,
      type: "ASSIGNED",
      message: `Вам назначена заявка на ${request.scheduledAt.toLocaleString("ru-RU")}`,
    },
  });

  notifyTelegram({
    userId: masterId,
    type: "ASSIGNED",
    notificationId: notification.id,
    request: {
      id: request.id,
      clientName: request.clientName,
      clientAddress: request.clientAddress,
      serviceName: request.serviceType.name,
      scheduledAt: request.scheduledAt,
    },
  });

  revalidatePath("/requests");
  revalidatePath("/my-requests");
  return request;
}
