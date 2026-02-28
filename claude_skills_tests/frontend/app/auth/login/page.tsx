import type { Metadata } from "next";
import { Sparkles } from "lucide-react";
import Link from "next/link";
import { OTPLoginForm } from "@/components/auth/otp-login-form";
import { OAuthButtons } from "@/components/auth/oauth-buttons";

export const metadata: Metadata = {
  title: "Вход",
  description: "Войдите в PromptSpace через Email OTP или OAuth",
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center px-4 py-12">
      {/* Background glow */}
      <div className="pointer-events-none fixed -top-32 left-1/2 -translate-x-1/2 w-[500px] h-[300px] rounded-full bg-purple-600/15 blur-[120px]" />

      <div className="relative w-full max-w-sm space-y-8">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3 text-center">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-purple-600/20 border border-purple-500/30">
              <Sparkles className="w-5 h-5 text-purple-400" />
            </div>
            <span className="text-xl font-bold font-mono tracking-tight text-zinc-100">
              PromptSpace
            </span>
          </Link>
          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-zinc-100">Добро пожаловать</h1>
            <p className="text-sm text-zinc-400">Войдите или создайте аккаунт</p>
          </div>
        </div>

        {/* Card */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 space-y-6">

          {/* OTP Form */}
          <div className="space-y-3">
            <p className="text-xs font-mono text-zinc-500 uppercase tracking-widest">
              Email + одноразовый код
            </p>
            <OTPLoginForm />
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-zinc-800" />
            <span className="text-xs text-zinc-600 font-mono">или</span>
            <div className="flex-1 h-px bg-zinc-800" />
          </div>

          {/* OAuth */}
          <div className="space-y-3">
            <p className="text-xs font-mono text-zinc-500 uppercase tracking-widest">
              Быстрый вход
            </p>
            <OAuthButtons />
          </div>
        </div>

        {/* Legal */}
        <p className="text-center text-xs text-zinc-600 leading-relaxed">
          Продолжая, вы соглашаетесь с{" "}
          <Link href="/legal/terms" className="text-zinc-400 hover:text-zinc-200 underline underline-offset-2">
            условиями использования
          </Link>{" "}
          и{" "}
          <Link href="/legal/privacy" className="text-zinc-400 hover:text-zinc-200 underline underline-offset-2">
            политикой конфиденциальности
          </Link>{" "}
          (152-ФЗ)
        </p>
      </div>
    </div>
  );
}
