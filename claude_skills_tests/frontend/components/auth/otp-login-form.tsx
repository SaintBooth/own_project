"use client";

import { useState, useRef, useEffect } from "react";
import { Loader2, Mail, ArrowRight, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { authApi } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";
import { useRouter } from "next/navigation";

type Step = "email" | "otp";

export function OTPLoginForm() {
  const router = useRouter();
  const { login } = useAuthStore();

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [retryAfter, setRetryAfter] = useState(0);

  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  // Countdown timer for blocked state
  useEffect(() => {
    if (retryAfter <= 0) return;
    const interval = setInterval(() => {
      setRetryAfter((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [retryAfter]);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setError(null);
    setLoading(true);

    try {
      const res = await authApi.sendOtp(email.trim());
      if (res.retry_after && res.retry_after > 0) {
        setRetryAfter(res.retry_after);
        setError(`Слишком много попыток. Повторите через ${Math.ceil(res.retry_after / 60)} мин.`);
      } else {
        setStep("otp");
        setTimeout(() => inputRefs.current[0]?.focus(), 100);
      }
    } catch (err: unknown) {
      const e = err as { status?: number; data?: { detail?: string } };
      if (e.status === 429) {
        setError("Слишком много попыток. Повторите позже.");
      } else {
        setError("Не удалось отправить код. Попробуйте снова.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    setError(null);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Автосабмит при заполнении всех 6 цифр
    if (value && index === 5) {
      const fullCode = [...newOtp.slice(0, 5), value.slice(-1)].join("");
      if (fullCode.length === 6) {
        handleVerifyOtp(fullCode);
      }
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (text.length === 6) {
      setOtp(text.split(""));
      handleVerifyOtp(text);
    }
  };

  const handleVerifyOtp = async (code?: string) => {
    const finalCode = code ?? otp.join("");
    if (finalCode.length < 6) return;

    setError(null);
    setLoading(true);

    try {
      const res = await authApi.verifyOtp(email.trim(), finalCode);
      login(res.access_token);
      router.push("/");
    } catch (err: unknown) {
      const e = err as { status?: number; data?: { detail?: string } };
      if (e.status === 429) {
        setError("Аккаунт заблокирован на 15 минут из-за подозрительной активности.");
        setRetryAfter(900);
      } else if (e.status === 401) {
        setError(e.data?.detail ?? "Неверный код. Проверьте и попробуйте снова.");
        setOtp(["", "", "", "", "", ""]);
        setTimeout(() => inputRefs.current[0]?.focus(), 100);
      } else {
        setError("Что-то пошло не так. Попробуйте снова.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResend = () => {
    setOtp(["", "", "", "", "", ""]);
    setError(null);
    setStep("email");
  };

  return (
    <div className="w-full max-w-sm space-y-6">
      {step === "email" ? (
        <form onSubmit={handleSendOtp} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium text-zinc-300">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-9 bg-zinc-900 border-zinc-700 text-zinc-100 placeholder:text-zinc-600 focus:border-purple-500 focus:ring-purple-500/20"
                disabled={loading}
                required
              />
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-md px-3 py-2">
              {error}
            </p>
          )}

          <Button
            type="submit"
            disabled={loading || !email.trim() || retryAfter > 0}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : retryAfter > 0 ? (
              `Повторить через ${retryAfter}с`
            ) : (
              <>
                Получить код
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </Button>
        </form>
      ) : (
        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm text-zinc-400">
              Введите 6-значный код, отправленный на{" "}
              <span className="text-zinc-200 font-medium">{email}</span>
            </p>

            <div
              className="flex gap-2 justify-center"
              onPaste={handleOtpPaste}
            >
              {otp.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => { inputRefs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(i, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(i, e)}
                  disabled={loading}
                  className={cn(
                    "w-11 h-14 text-center text-xl font-mono rounded-lg border transition-colors",
                    "bg-zinc-900 text-zinc-100",
                    "focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500",
                    digit ? "border-purple-500/60" : "border-zinc-700",
                    loading && "opacity-50 cursor-not-allowed",
                  )}
                />
              ))}
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-md px-3 py-2 text-center">
              {error}
            </p>
          )}

          {loading && (
            <div className="flex justify-center">
              <Loader2 className="w-5 h-5 animate-spin text-purple-400" />
            </div>
          )}

          <button
            type="button"
            onClick={handleResend}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors mx-auto"
          >
            <RotateCcw className="w-3 h-3" />
            Отправить код повторно
          </button>
        </div>
      )}
    </div>
  );
}
