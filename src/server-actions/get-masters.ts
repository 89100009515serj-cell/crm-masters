"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { permissions, ForbiddenError } from "@/lib/permissions";

export async function getMastersWithStats() {
  const session = await auth();
  if (!session?.user) throw new ForbiddenError("Не авторизован");
  if (!permissions.canAddMaster(session.user.role) && !permissions.canDisableMaster(session.user.role)) {
    throw new ForbiddenError("Недостаточно прав");
  }

  const masters = await prisma.user.findMany({
    where: { role: "MASTER" },
    orderBy: { fullName: "asc" },
    include: {
      requestsAssigned: {
        where: { status: "COMPLETED" },
        select: { masterPayout: true },
      },
    },
  });

  return masters.map((m) => ({
    id: m.id,
    fullName: m.fullName,
    phone: m.phone,
    email: m.email,
    isActive: m.isActive,
    completedCount: m.requestsAssigned.length,
    totalPayout: m.requestsAssigned.reduce(
      (sum, r) => sum + Number(r.masterPayout ?? 0),
      0
    ),
  }));
}
