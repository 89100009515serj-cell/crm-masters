"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { ForbiddenError } from "@/lib/permissions";
import { calculateFinance } from "@/lib/finance";
import { revalidatePath } from "next/cache";

const completeSchema = z.object({
  requestId: z.string().min(1),
  totalReceipt: z.coerce.number().positive("Общий чек должен быть больше нуля"),
  expense: z.coerce.number().nonnegative("Расход не может быть отрицательным"),
  comment: z.string().optional(),
});

export type CompleteRequestInput = z.infer<typeof completeSchema>;

export async function completeRequest(input: CompleteRequestInput) {
  const session = await auth();
  if (!session?.user || session.user.role !== "MASTER") {
    throw new ForbiddenError("Доступно только мастеру");
  }

  const data = completeSchema.parse(input);

  const request = await prisma.request.findUniqueOrThrow({ where: { id: data.requestId } });
  if (request.assignedMasterId !== session.user.id) {
    throw new ForbiddenError("Это не ваша заявка");
  }
  if (request.status === "COMPLETED") {
    throw new Error("Заявка уже завершена");
  }
  if (data.expense > data.totalReceipt) {
    throw new Error("Расход не может превышать общий чек");
  }
  

  const finance = calculateFinance({
    totalReceipt: data.totalReceipt,
    expense: data.expense,
  });

  const updated = await prisma.request.update({
    where: { id: data.requestId },
    data: {
      totalReceipt: data.totalReceipt,
      expense: data.expense,
      comment: data.comment,
      status: "COMPLETED",
      completedAt: new Date(),
      netReceipt: finance.netReceipt,
      masterPayout: finance.masterPayout,
      managerPayout: finance.managerPayout,
      curatorPayout: finance.curatorPayout,
      companyProfit: finance.companyProfit,
    },
  });

  revalidatePath("/my-requests");
  revalidatePath("/requests");
  return updated;
}
