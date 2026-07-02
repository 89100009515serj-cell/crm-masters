import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminPassword = await bcrypt.hash("admin123", 10);

  await prisma.user.upsert({
    where: { email: "admin@crm.local" },
    update: {},
    create: {
      fullName: "Главный Управляющий",
      phone: "+70000000000",
      email: "admin@crm.local",
      passwordHash: adminPassword,
      role: Role.ADMIN,
    },
  });

  await prisma.source.createMany({
    data: [{ name: "Сайт" }, { name: "Авито" }, { name: "Звонок" }, { name: "Рекомендация" }],
    skipDuplicates: true,
  });

  await prisma.serviceType.createMany({
    data: [
      { name: "Ремонт стиральной машины" },
      { name: "Ремонт холодильника" },
      { name: "Установка кондиционера" },
      { name: "Сантехника" },
    ],
    skipDuplicates: true,
  });

  console.log("Seed завершён. Логин: admin@crm.local / admin123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
