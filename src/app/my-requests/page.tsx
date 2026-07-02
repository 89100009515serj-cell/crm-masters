import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MasterRequestCard } from "@/components/master-request-card";
import { NotificationBell } from "@/components/notification-bell";

export default async function MyRequestsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "MASTER") redirect("/requests");

  const requests = await prisma.request.findMany({
    where: {
      assignedMasterId: session.user.id,
      status: { notIn: ["CANCELLED", "COMPLETED"] },
    },
    orderBy: { scheduledAt: "asc" },
    include: {
      serviceType: true,
      reschedules: { select: { id: true } },
    },
  });

  return (
    <main className="min-h-screen bg-slate-50 pb-10">
      <div className="bg-white border-b border-slate-200 px-4 py-4 sticky top-0 z-10 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Мои заявки</h1>
          <p className="text-sm text-slate-500">{session.user.fullName}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <NotificationBell />
          <a href="/profile" className="text-xs text-slate-500 underline">
            Профиль
          </a>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-3 max-w-md mx-auto">
        {requests.length === 0 && (
          <p className="text-center text-slate-400 py-10">Активных заявок нет</p>
        )}
        {requests.map((r) => (
          <MasterRequestCard
            key={r.id}
            request={{
              id: r.id,
              clientAddress: r.clientAddress,
              clientPhone: r.clientPhone,
              service: r.serviceType.name,
              scheduledAt: r.scheduledAt.toISOString(),
              status: r.status,
              description: r.description,
              wasRescheduled: r.reschedules.length > 0,
              receiptPhotoUrls: r.receiptPhotoUrls,
            }}
          />
        ))}
      </div>
    </main>
  );
}
