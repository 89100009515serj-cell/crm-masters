import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { permissions } from "@/lib/permissions";
import { NewRequestForm } from "@/components/new-request-form";

export default async function NewRequestPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!permissions.canCreateRequest(session.user.role)) redirect("/requests");

  const [sources, services, masters] = await Promise.all([
    prisma.source.findMany({ orderBy: { name: "asc" } }),
    prisma.serviceType.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.user.findMany({
      where: { role: "MASTER", isActive: true },
      orderBy: { fullName: "asc" },
      select: { id: true, fullName: true },
    }),
  ]);

  return (
    <main className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-semibold text-slate-900 mb-6">Новая заявка</h1>
      <NewRequestForm sources={sources} services={services} masters={masters} />
    </main>
  );
}
