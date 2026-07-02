"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { permissions, ForbiddenError } from "@/lib/permissions";
import { notifyTelegram } from "@/lib/telegram";
import { revalidatePath } from "next/cache";

const createRequestSchema = z.object({
  sourceId: z.string().min(1),
  clientName: z.string().min(1, "Укажите ФИО клиента"),
  clientPhone: z.string().min(5, "Укажите телефон"),
  clientAddress: z.string().min(1, "Укажите адрес"),
  description: z.string().min(1, "Опишите работы"),
  serviceTypeId: z.string().min(1, "Выберите сервис / вид работ"),
  scheduledAt: z.coerce.date({ required_error: "Укажите дату и время сервиса" }),
  assignedMasterId: z.string().optional(),
});

export type CreateRequestInput = z.infer<typeof createRequestSchema>;

export async function createRequest(input: CreateRequestInput) {
  const session = await auth();
  if (!session?.user) throw new ForbiddenError("Не авторизован");

  if (!permissions.canCreateRequest(session.user.role)) {
    throw new ForbiddenError("Создание заявок недоступно для вашей роли");
  }

  const data = createRequestSchema.parse(input);

  const request = await prisma.request.create({
    data: {
      sourceId: data.sourceId,
      clientName: data.clientName,
      clientPhone: data.clientPhone,
      clientAddress: data.clientAddress,
      description: data.description,
      serviceTypeId: data.serviceTypeId,
      scheduledAt: data.scheduledAt,
      createdById: session.user.id,
      assignedMasterId: data.assignedMasterId ?? null,
      status: data.assignedMasterId ? "ASSIGNED" : "NEW",
    },
    include: { serviceType: true },
  });

  if (data.assignedMasterId) {
    const notification = await prisma.notification.create({
      data: {
        userId: data.assignedMasterId,
        requestId: request.id,
        type: "ASSIGNED",
        message: `Вам назначена новая заявка на ${data.scheduledAt.toLocaleString("ru-RU")}`,
      },
    });

    notifyTelegram({
      userId: data.assignedMasterId,
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
  }

  revalidatePath("/requests");
  return request;
}
