"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { ForbiddenError } from "@/lib/permissions";

export async function getRescheduleHistory(requestId: string) {
  const session = await auth();
  if (!session?.user) throw new ForbiddenError("Не авторизован");

  const logs = await prisma.rescheduleLog.findMany({
    where: { requestId },
    orderBy: { createdAt: "desc" },
    include: { changedBy: { select: { fullName: true } } },
  });

  return logs.map((l) => ({
    id: l.id,
    oldScheduledAt: l.oldScheduledAt.toISOString(),
    newScheduledAt: l.newScheduledAt.toISOString(),
    reason: l.reason,
    changedByName: l.changedBy.fullName,
    createdAt: l.createdAt.toISOString(),
  }));
}
