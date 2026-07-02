"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { permissions, ForbiddenError } from "@/lib/permissions";
import { revalidatePath } from "next/cache";

const addMasterSchema = z.object({
  fullName: z.string().min(1),
  phone: z.string().min(5),
  email: z.string().email(),
  password: z.string().min(6, "Минимум 6 символов"),
});

export async function addMaster(input: z.infer<typeof addMasterSchema>) {
  const session = await auth();
  if (!session?.user) throw new ForbiddenError("Не авторизован");
  if (!permissions.canAddMaster(session.user.role)) {
    throw new ForbiddenError("Добавление мастеров недоступно для вашей роли");
  }

  const data = addMasterSchema.parse(input);
  const passwordHash = await bcrypt.hash(data.password, 10);

  const master = await prisma.user.create({
    data: {
      fullName: data.fullName,
      phone: data.phone,
      email: data.email,
      passwordHash,
      role: "MASTER",
    },
  });

  revalidatePath("/dashboard");
  return { id: master.id, fullName: master.fullName };
}

export async function setMasterActive(masterId: string, isActive: boolean) {
  const session = await auth();
  if (!session?.user) throw new ForbiddenError("Не авторизован");
  if (!permissions.canDisableMaster(session.user.role)) {
    throw new ForbiddenError("Отключение мастеров недоступно для вашей роли");
  }

  const master = await prisma.user.update({
    where: { id: masterId },
    data: { isActive },
  });

  revalidatePath("/dashboard");
  return { id: master.id, isActive: master.isActive };
}
