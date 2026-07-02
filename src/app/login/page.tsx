import { LoginForm } from "@/components/login-form";

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-full max-w-sm bg-white rounded-xl shadow-sm border border-slate-200 p-8">
        <h1 className="text-xl font-semibold text-slate-900 mb-1">CRM Мастеров</h1>
        <p className="text-sm text-slate-500 mb-6">Войдите, чтобы продолжить</p>
        <LoginForm />
      </div>
    </main>
  );
}
