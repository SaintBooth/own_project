"use client";

import { useState, useEffect } from "react";
import { X, Cookie } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const CONSENT_KEY = "ps_cookie_consent";

/**
 * Cookie consent banner.
 * Источник: promptspace-release.md §12.13, SPEC-010
 *
 * Яндекс.Метрика НЕ инициализируется до получения согласия (152-ФЗ).
 * После согласия — ym() вызов инициализирует счётчик.
 */
export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem(CONSENT_KEY);
    if (!consent) {
      // Небольшая задержка для лучшего UX
      const timer = setTimeout(() => setVisible(true), 1500);
      return () => clearTimeout(timer);
    }
    if (consent === "accepted") {
      initYandexMetrika();
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem(CONSENT_KEY, "accepted");
    setVisible(false);
    initYandexMetrika();
  };

  const handleDecline = () => {
    localStorage.setItem(CONSENT_KEY, "declined");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Согласие на использование cookie"
      className={cn(
        "fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-sm z-50",
        "bg-zinc-900 border border-zinc-700 rounded-xl p-4 shadow-2xl",
        "animate-in slide-in-from-bottom-4 duration-300",
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 shrink-0 mt-0.5">
          <Cookie className="w-4 h-4 text-amber-400" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-zinc-100 mb-1">Мы используем cookie</p>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Аналитика помогает нам улучшать сервис. Данные обрабатываются в
            соответствии с{" "}
            <a
              href="/legal/privacy"
              className="text-purple-400 hover:underline underline-offset-2"
            >
              152-ФЗ
            </a>
            .
          </p>

          <div className="flex items-center gap-2 mt-3">
            <Button
              size="sm"
              onClick={handleAccept}
              className="h-7 text-xs bg-purple-600 hover:bg-purple-700 text-white px-3"
            >
              Согласен
            </Button>
            <button
              type="button"
              onClick={handleDecline}
              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              Отказаться
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={handleDecline}
          aria-label="Закрыть"
          className="shrink-0 text-zinc-600 hover:text-zinc-400 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

/**
 * Инициализирует Яндекс.Метрику.
 * Вызывается ТОЛЬКО после получения явного согласия пользователя.
 * Не вызывается при отказе (152-ФЗ).
 */
function initYandexMetrika(): void {
  const counterId = process.env.NEXT_PUBLIC_YM_COUNTER_ID;
  if (!counterId || typeof window === "undefined") return;

  // Проверяем, не инициализирован ли уже счётчик
  if ((window as unknown as Record<string, unknown>)[`yaCounter${counterId}`]) return;

  // Динамически загружаем скрипт Яндекс.Метрики только после согласия
  const script = document.createElement("script");
  script.src = "https://mc.yandex.ru/metrika/tag.js";
  script.async = true;
  script.onload = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (typeof (window as any).ym === "function") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).ym(Number(counterId), "init", {
        clickmap: true,
        trackLinks: true,
        accurateTrackBounce: true,
        webvisor: false, // без веб-визора (GDPR)
      });
    }
  };
  document.head.appendChild(script);
}
