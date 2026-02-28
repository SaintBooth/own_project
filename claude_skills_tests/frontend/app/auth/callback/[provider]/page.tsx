"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";

interface CallbackPageProps {
  params: Promise<{ provider: string }>;
}

/**
 * OAuth callback page — обрабатывает access_token из query param.
 * Источник: §5.3
 *
 * Сервер редиректит сюда с ?access_token=...
 * Мы сохраняем его в Zustand (memory only) и редиректим на главную.
 */
export default function OAuthCallbackPage({ params: _params }: CallbackPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuthStore();

  useEffect(() => {
    const accessToken = searchParams.get("access_token");
    const error = searchParams.get("error");

    if (error) {
      router.replace(`/auth/login?error=${encodeURIComponent(error)}`);
      return;
    }

    if (accessToken) {
      login(accessToken);
      router.replace("/");
    } else {
      router.replace("/auth/login?error=no_token");
    }
  }, [searchParams, login, router]);

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4 text-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
        <p className="text-zinc-400 text-sm">Авторизация...</p>
      </div>
    </div>
  );
}
