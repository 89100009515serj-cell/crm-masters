import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AppHeader } from "@/components/app-header";
import { TelegramSettings } from "@/components/telegram-settings";
import { getMyProfile } from "@/server-actions/profile";

const roleLabels: Record<string, string> = {
  ADMIN: "Управляющий",
  CURATOR: "Куратор",
  MANAGER: "Менеджер",
  MASTER: "Мастер",
};

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const profile = await getMyProfile();

  return (
    <>
      <AppHeader role={session.user.role} />
      <main className="p-8 max-w-xl mx-auto">
        <h1 className="text-2xl font-semibold text-slate-900 mb-1">Профиль</h1>
        <p className="text-slate-500 mb-6">
          {profile.fullName} · {roleLabels[profile.role]}
        </p>

        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-1 mb-6">
          <Row label="Телефон" value={profile.phone} />
          <Row label="Email" value={profile.email ?? "—"} />
        </div>

        <TelegramSettings
          isAdminOrCurator={profile.role === "ADMIN" || profile.role === "CURATOR"}
          initialConnected={!!profile.telegramChatId}
          initialEnabled={profile.telegramEnabled}
          initialTypes={profile.telegramNotifyTypes}
        />
      </main>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm py-1.5">
      <span className="text-slate-500">{label}</span>
      <span className="text-slate-900 font-medium">{value}</span>
    </div>
  );
}
