"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { permissions, ForbiddenError } from "@/lib/permissions";
import { notifyTelegram } from "@/lib/telegram";
import { revalidatePath } from "next/cache";

const rescheduleSchema = z.object({
  requestId: z.string().min(1),
  newScheduledAt: z.coerce.date(),
  reason: z.string().optional(),
});

export type RescheduleInput = z.infer<typeof rescheduleSchema>;

export async function rescheduleRequest(input: RescheduleInput) {
  const session = await auth();
  if (!session?.user) throw new ForbiddenError("Не авторизован");

  if (!permissions.canReschedule(session.user.role)) {
    throw new ForbiddenError("Перенос заявок недоступен для вашей роли");
  }

  const { requestId, newScheduledAt, reason } = rescheduleSchema.parse(input);

  const existing = await prisma.request.findUniqueOrThrow({
    where: { id: requestId },
    include: { serviceType: true },
  });

  if (existing.status === "COMPLETED" && !permissions.canEditClosedRequest(session.user.role)) {
    throw new ForbiddenError("Закрытую заявку может редактировать только Управляющий");
  }

  const { updated, notificationId } = await prisma.$transaction(async (tx) => {
    const updatedRequest = await tx.request.update({
      where: { id: requestId },
      data: { scheduledAt: newScheduledAt },
    });

    await tx.rescheduleLog.create({
      data: {
        requestId,
        oldScheduledAt: existing.scheduledAt,
        newScheduledAt,
        reason,
        changedById: session.user.id,
      },
    });

    let createdNotificationId: string | undefined;
    if (updatedRequest.assignedMasterId) {
      const notification = await tx.notification.create({
        data: {
          userId: updatedRequest.assignedMasterId,
          requestId,
          type: "RESCHEDULE",
          message: `Заявка перенесена на ${newScheduledAt.toLocaleString("ru-RU")}`,
        },
      });
      createdNotificationId = notification.id;
    }

    return { updated: updatedRequest, notificationId: createdNotificationId };
  });

  if (updated.assignedMasterId) {
    notifyTelegram({
      userId: updated.assignedMasterId,
      type: "RESCHEDULE",
      notificationId,
      newDate: newScheduledAt,
      reason,
      request: {
        id: updated.id,
        clientName: existing.clientName,
        clientAddress: existing.clientAddress,
        serviceName: existing.serviceType.name,
        scheduledAt: newScheduledAt,
      },
    });
  }

  revalidatePath("/requests");
  revalidatePath("/my-requests");
  return updated;
}
