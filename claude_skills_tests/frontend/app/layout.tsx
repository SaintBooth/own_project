import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { CookieConsent } from "@/components/cookie-consent";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "PromptSpace — маркетплейс AI-промптов",
    template: "%s | PromptSpace",
  },
  description: "Маркетплейс AI-промптов для российского рынка. Покупай и продавай качественные промпты.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    siteName: "PromptSpace",
    locale: "ru_RU",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
        {/* Cookie consent — Метрика не инициализируется до согласия (152-ФЗ) */}
        <CookieConsent />
        {/* Toast notifications */}
        <Toaster position="bottom-right" theme="dark" richColors />
      </body>
    </html>
  );
}
