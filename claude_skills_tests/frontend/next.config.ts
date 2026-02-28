/**
 * PromptSpace Next.js Config
 * Источник: promptspace-release.md §12.13
 */
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",

  // ── Изображения ────────────────────────────────────────────────────────
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "storage.yandexcloud.net",
        pathname: "/promptspace-media/**",
      },
    ],
  },

  // ── Security Headers (§12.13, §18) ────────────────────────────────────
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          // CSP: 'unsafe-inline' для dev/Sprint-0.
          // В production (Sprint 4) заменяется middleware с nonce (§12.13).
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https://storage.yandexcloud.net",
              "font-src 'self' data:",
              "connect-src 'self' https://mc.yandex.ru",
              "frame-ancestors 'none'",
            ].join("; "),
          },
        ],
      },
    ];
  },

  // ── Webpack / SWC ──────────────────────────────────────────────────────
  experimental: {
    turbo: {},
  },
};

export default nextConfig;
