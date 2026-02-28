/**
 * Публичная карточка промпта (SSR + ISR 300s).
 * Источник: promptspace-release.md §12, §10.5, SPEC-003
 *
 * Server Component: рендерится без JS.
 * ISR: revalidate 300s + revalidatePath при публикации.
 * OG Image: генерируется на основе метаданных.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Tag,
  Eye,
  ShoppingBag,
  User,
  Calendar,
  Lock,
  Sparkles,
  Code2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { PromptDetail } from "@/lib/api";

export const revalidate = 300;

const API_BASE = process.env.API_URL ?? "http://web:8000/api/v1";

interface PageProps {
  params: Promise<{ slug: string }>;
}

async function fetchPrompt(slug: string): Promise<PromptDetail | null> {
  try {
    const res = await fetch(`${API_BASE}/catalog/prompts/${slug}`, {
      next: { revalidate: 300 },
    });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    return res.json();
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const prompt = await fetchPrompt(slug);

  if (!prompt) {
    return { title: "Промпт не найден" };
  }

  const title = `${prompt.title}`;
  const description = prompt.short_description;
  const price = parseFloat(prompt.price) === 0 ? "Бесплатно" : `${parseFloat(prompt.price).toLocaleString("ru-RU")} ₽`;

  return {
    title,
    description,
    openGraph: {
      title: `${title} | PromptSpace`,
      description,
      type: "website",
      locale: "ru_RU",
      images: prompt.og_image_object_key
        ? [`https://storage.yandexcloud.net/promptspace-media/${prompt.og_image_object_key}`]
        : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} — ${price}`,
      description,
    },
    other: {
      "product:price:amount": prompt.price,
      "product:price:currency": "RUB",
    },
  };
}

export default async function PromptPage({ params }: PageProps) {
  const { slug } = await params;
  const prompt = await fetchPrompt(slug);

  if (!prompt) notFound();

  const price = parseFloat(prompt.price);
  const isFree = prompt.is_free || price === 0;
  const priceLabel = isFree ? "Бесплатно" : `${price.toLocaleString("ru-RU")} ₽`;
  const publishedDate = prompt.published_at
    ? new Date(prompt.published_at).toLocaleDateString("ru-RU", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  const variableKeys = Object.keys(prompt.variables ?? {});

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Background */}
      <div className="pointer-events-none fixed -top-32 left-1/2 -translate-x-1/2 w-[700px] h-[350px] rounded-full bg-purple-600/10 blur-[100px]" />

      {/* Nav */}
      <nav className="sticky top-0 z-10 border-b border-zinc-800/60 bg-zinc-950/90 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Каталог
          </Link>
          <span className="text-zinc-700">/</span>
          <span className="text-xs text-zinc-500 truncate max-w-xs">{prompt.title}</span>
        </div>
      </nav>

      <main className="relative max-w-4xl mx-auto px-4 py-10 space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* ── Main Content ── */}
          <div className="lg:col-span-2 space-y-6">

            {/* Header */}
            <header className="space-y-4">
              {prompt.category && (
                <Link href={`/?category=${prompt.category.slug}`}>
                  <Badge
                    variant="outline"
                    className="border-purple-500/40 text-purple-300 bg-purple-500/10 text-xs"
                  >
                    {prompt.category.name}
                  </Badge>
                </Link>
              )}

              <h1 className="text-2xl font-bold tracking-tight leading-snug">
                {prompt.title}
              </h1>

              <p className="text-zinc-400 leading-relaxed">
                {prompt.short_description}
              </p>
            </header>

            {/* Tags */}
            {prompt.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {prompt.tags.map((tag) => (
                  <Link key={tag.id} href={`/?tags=${tag.slug}`}>
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-xs text-zinc-500 hover:border-zinc-600 hover:text-zinc-300 transition-colors font-mono">
                      <Tag className="w-2.5 h-2.5" />
                      {tag.name}
                    </span>
                  </Link>
                ))}
              </div>
            )}

            {/* Variables (template placeholders) */}
            {variableKeys.length > 0 && (
              <section className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <Code2 className="w-4 h-4 text-indigo-400" />
                  <span className="text-sm font-medium text-zinc-200">Переменные шаблона</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {variableKeys.map((varName) => (
                    <code
                      key={varName}
                      className="px-2 py-1 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-mono"
                    >
                      {`{{${varName}}}`}
                    </code>
                  ))}
                </div>
              </section>
            )}

            {/* Content preview (locked) */}
            <section className="relative bg-zinc-900/30 border border-zinc-800 rounded-xl overflow-hidden">
              <div className="p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-zinc-500" />
                  <span className="text-sm font-medium text-zinc-400">
                    {isFree ? "Содержимое промпта" : "Предпросмотр недоступен"}
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="h-3 bg-zinc-800 rounded w-full" />
                  <div className="h-3 bg-zinc-800 rounded w-5/6" />
                  <div className="h-3 bg-zinc-800 rounded w-4/6" />
                </div>
              </div>
              {!isFree && (
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/90 via-zinc-950/50 to-transparent flex items-end justify-center pb-5">
                  <p className="text-xs text-zinc-500">Приобретите промпт для доступа к содержимому</p>
                </div>
              )}
            </section>

            {/* Author */}
            <section className="bg-zinc-900/30 border border-zinc-800 rounded-xl p-5">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-purple-600/20 border border-purple-500/20 flex items-center justify-center shrink-0">
                  <User className="w-4 h-4 text-purple-400" />
                </div>
                <div className="space-y-1 flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/seller/${prompt.seller.username}`}
                      className="text-sm font-medium text-zinc-200 hover:text-purple-300 transition-colors font-mono"
                    >
                      @{prompt.seller.username}
                    </Link>
                  </div>
                  {prompt.seller.bio && (
                    <p className="text-xs text-zinc-500 line-clamp-2">{prompt.seller.bio}</p>
                  )}
                </div>
              </div>
            </section>
          </div>

          {/* ── Sidebar ── */}
          <aside className="space-y-4">
            <div className="sticky top-20 space-y-4">

              {/* Price card */}
              <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5 space-y-4">
                <div className="text-center">
                  <span
                    className={`text-3xl font-bold ${
                      isFree ? "text-green-400" : "text-zinc-100"
                    }`}
                  >
                    {priceLabel}
                  </span>
                </div>

                <button
                  className={`w-full py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isFree
                      ? "bg-green-600 hover:bg-green-700 text-white"
                      : "bg-purple-600 hover:bg-purple-700 text-white"
                  }`}
                >
                  {isFree ? "Получить бесплатно" : "Купить"}
                </button>

                {/* Stats */}
                <div className="pt-3 border-t border-zinc-800 space-y-2">
                  <div className="flex items-center justify-between text-xs text-zinc-500">
                    <div className="flex items-center gap-1.5">
                      <Eye className="w-3.5 h-3.5" />
                      <span>Просмотры</span>
                    </div>
                    <span className="font-mono text-zinc-400">
                      {prompt.views_count.toLocaleString("ru-RU")}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-zinc-500">
                    <div className="flex items-center gap-1.5">
                      <ShoppingBag className="w-3.5 h-3.5" />
                      <span>Продажи</span>
                    </div>
                    <span className="font-mono text-zinc-400">
                      {prompt.purchases_count.toLocaleString("ru-RU")}
                    </span>
                  </div>
                  {publishedDate && (
                    <div className="flex items-center justify-between text-xs text-zinc-500">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Опубликован</span>
                      </div>
                      <span className="font-mono text-zinc-400 text-right">{publishedDate}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Info */}
              <div className="bg-zinc-900/30 border border-zinc-800 rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2 text-xs text-zinc-500">
                  <Sparkles className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                  <span>Промпт проверен модераторами</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-zinc-500">
                  <Lock className="w-3.5 h-3.5 text-green-400 shrink-0" />
                  <span>Безопасная оплата через Robokassa</span>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
