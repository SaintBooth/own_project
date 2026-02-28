"use client";

import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

interface OAuthProvider {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  className: string;
}

const YandexIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M13.52 3H10.4C7.25 3 5.5 4.67 5.5 7.2c0 2.14 1.07 3.44 3.12 4.78L5.5 21h3.09l3-8.55L14.81 21H18l-3.45-9.27C16.4 10.3 17.5 8.9 17.5 7.2 17.5 4.64 15.7 3 13.52 3zm-.44 7.26h-1.94V5.54h1.94c1.35 0 2.12.67 2.12 2.35 0 1.62-.84 2.37-2.12 2.37z" />
  </svg>
);

const VKIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M15.07 2H8.93C3.33 2 2 3.33 2 8.93v6.14C2 20.67 3.33 22 8.93 22h6.14C20.67 22 22 20.67 22 15.07V8.93C22 3.33 20.67 2 15.07 2zm3.08 14.12h-1.71c-.65 0-.85-.52-2-1.67-1-.98-1.44-.77-1.44-.15v1.54c0 .35-.11.56-1.02.56-1.5 0-3.17-.91-4.34-2.6-1.77-2.48-2.25-4.34-2.25-4.72 0-.19.07-.37.37-.37h1.71c.28 0 .38.13.49.43.53 1.54 1.43 2.89 1.8 2.89.14 0 .2-.06.2-.4V9.06c-.04-.73-.43-.79-.43-1.05 0-.14.11-.28.29-.28h2.69c.23 0 .31.12.31.38v2.34c0 .23.1.31.16.31.14 0 .25-.08.51-.34 1.06-1.09 1.82-2.78 1.82-2.78.1-.21.3-.4.58-.4h1.71c.52 0 .63.26.52.59-.27.95-2.72 3.63-2.72 3.63-.22.35-.3.51 0 .89.22.28 1 .97 1.5 1.55.94 1.05 1.65 1.94 1.85 2.55.16.56-.13.85-.69.85z" />
  </svg>
);

const TelegramIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8l-1.68 7.92c-.12.56-.46.7-.93.44l-2.56-1.88-1.24 1.19c-.14.14-.25.25-.51.25l.18-2.6 4.68-4.23c.2-.18-.04-.28-.32-.1L7.6 14.97l-2.5-.78c-.54-.17-.55-.54.12-.8l9.77-3.77c.45-.17.84.1.65.18z" />
  </svg>
);

export function OAuthButtons() {
  const providers: OAuthProvider[] = [
    {
      id: "yandex",
      label: "Яндекс ID",
      description: "Войти через Яндекс",
      icon: <YandexIcon />,
      href: `${API_BASE}/auth/yandex/callback`,
      className:
        "bg-[#FC3F1D]/10 border-[#FC3F1D]/30 text-[#FC3F1D] hover:bg-[#FC3F1D]/20 hover:border-[#FC3F1D]/50",
    },
    {
      id: "vk",
      label: "VK ID",
      description: "Войти через ВКонтакте",
      icon: <VKIcon />,
      href: `${API_BASE}/auth/vk/callback`,
      className:
        "bg-[#0077FF]/10 border-[#0077FF]/30 text-[#0077FF] hover:bg-[#0077FF]/20 hover:border-[#0077FF]/50",
    },
    {
      id: "telegram",
      label: "Telegram",
      description: "Войти через Telegram",
      icon: <TelegramIcon />,
      href: `${API_BASE}/auth/telegram/callback`,
      className:
        "bg-[#229ED9]/10 border-[#229ED9]/30 text-[#229ED9] hover:bg-[#229ED9]/20 hover:border-[#229ED9]/50",
    },
  ];

  return (
    <div className="flex flex-col gap-2">
      {providers.map((provider) => (
        <a
          key={provider.id}
          href={provider.href}
          className={cn(
            "flex items-center gap-3 px-4 py-3 rounded-lg border text-sm font-medium",
            "transition-all duration-150",
            provider.className,
          )}
        >
          <span className="shrink-0">{provider.icon}</span>
          <span className="flex-1">{provider.label}</span>
          <ExternalLink className="w-3.5 h-3.5 opacity-50" />
        </a>
      ))}
    </div>
  );
}
