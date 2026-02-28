/**
 * Главная страница — каталог промптов (SSR + ISR 300s).
 * Источник: promptspace-release.md §12, SPEC-003
 *
 * Server Component: рендерится на сервере, без JS требует.
 * ISR: revalidate 300s; при публикации промпта → revalidatePath() из API.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { Sparkles, Search, SlidersHorizontal, LogIn } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PromptCard, PromptCardSkeleton } from "@/components/catalog/prompt-card";
import { Suspense } from "react";
import type { CatalogFilters } from "@/lib/api";

export const revalidate = 300; // ISR 5 мин

export const metadata: Metadata = {
  title: "Каталог AI-промптов",
  description: "Лучшие AI-промпты для ChatGPT, Claude, Midjourney и других моделей. Российский рынок.",
};

const API_BASE = process.env.API_URL ?? "http://web:8000/api/v1";

interface SearchParams {
  category?: string;
  q?: string;
  is_free?: string;
  sort?: string;
  cursor?: string;
}

interface PageProps {
  searchParams: Promise<SearchParams>;
}

async function fetchCatalog(filters: CatalogFilters = {}) {
  const params = new URLSearchParams();
  if (filters.category) params.set("category", filters.category);
  if (filters.q) params.set("q", filters.q);
  if (filters.is_free !== undefined) params.set("is_free", String(filters.is_free));
  if (filters.sort) params.set("sort", filters.sort);
  if (filters.cursor) params.set("cursor", filters.cursor);

  const query = params.toString();
  const url = `${API_BASE}/catalog/prompts${query ? `?${query}` : ""}`;

  try {
    const res = await fetch(url, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

const SORT_OPTIONS = [
  { value: "newest", label: "Новые" },
  { value: "popular", label: "Популярные" },
  { value: "price_asc", label: "Дешевле" },
  { value: "price_desc", label: "Дороже" },
];

export default async function CatalogPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const currentSort = params.sort ?? "newest";

  const catalogData = await fetchCatalog({
    category: params.category,
    q: params.q,
    is_free: params.is_free === "true" ? true : params.is_free === "false" ? false : undefined,
    sort: currentSort as CatalogFilters["sort"],
    cursor: params.cursor,
  });

  const items = catalogData?.items ?? [];
  const hasNext = catalogData?.has_next ?? false;
  const nextCursor = catalogData?.next_cursor ?? null;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Background grid */}
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.025]"
        style={{
          backgroundImage:
            "linear-gradient(to right, #a855f7 1px, transparent 1px), linear-gradient(to bottom, #a855f7 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />
      <div className="pointer-events-none fixed -top-32 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full bg-purple-600/10 blur-[120px]" />

      {/* Nav */}
      <nav className="sticky top-0 z-10 border-b border-zinc-800/60 bg-zinc-950/90 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-purple-600/20 border border-purple-500/30">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            </div>
            <span className="text-sm font-bold font-mono tracking-tight">PromptSpace</span>
          </Link>

          <div className="flex items-center gap-2">
            <Link
              href="/auth/login"
              className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors px-3 py-1.5 rounded-lg border border-zinc-800 hover:border-zinc-700"
            >
              <LogIn className="w-3.5 h-3.5" />
              Войти
            </Link>
          </div>
        </div>
      </nav>

      <main className="relative max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* Hero */}
        <header className="text-center space-y-3 py-4">
          <h1 className="text-3xl font-bold tracking-tight">
            Каталог{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-400">
              AI-промптов
            </span>
          </h1>
          <p className="text-zinc-400 text-sm max-w-md mx-auto">
            Готовые промпты для Claude, ChatGPT и других AI-моделей
          </p>
        </header>

        {/* Search + Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <form action="/" method="GET" className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
            <input
              name="q"
              type="search"
              defaultValue={params.q ?? ""}
              placeholder="Поиск промптов..."
              className="w-full h-9 pl-9 pr-4 rounded-lg bg-zinc-900 border border-zinc-700 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/30"
            />
            {params.category && (
              <input type="hidden" name="category" value={params.category} />
            )}
            {params.sort && (
              <input type="hidden" name="sort" value={params.sort} />
            )}
          </form>

          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-zinc-500 shrink-0" />
            <div className="flex gap-1">
              {SORT_OPTIONS.map((opt) => (
                <Link
                  key={opt.value}
                  href={buildFilterUrl({ ...params, sort: opt.value })}
                  className={`px-2.5 py-1.5 text-xs rounded-md transition-colors ${
                    currentSort === opt.value
                      ? "bg-purple-600/20 text-purple-300 border border-purple-500/30"
                      : "bg-zinc-900 text-zinc-500 border border-zinc-800 hover:border-zinc-700 hover:text-zinc-300"
                  }`}
                >
                  {opt.label}
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Free filter */}
        <div className="flex items-center gap-2">
          <Link
            href={buildFilterUrl({ ...params, is_free: undefined, cursor: undefined })}
            className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
              !params.is_free
                ? "bg-zinc-800 text-zinc-200 border-zinc-700"
                : "bg-transparent text-zinc-500 border-zinc-800 hover:border-zinc-700"
            }`}
          >
            Все
          </Link>
          <Link
            href={buildFilterUrl({ ...params, is_free: "true", cursor: undefined })}
            className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
              params.is_free === "true"
                ? "bg-green-500/15 text-green-400 border-green-500/30"
                : "bg-transparent text-zinc-500 border-zinc-800 hover:border-zinc-700"
            }`}
          >
            Бесплатные
          </Link>
        </div>

        {/* Grid */}
        <Suspense fallback={<CatalogSkeleton />}>
          {items.length === 0 ? (
            <EmptyState hasFilters={!!(params.q || params.category || params.is_free)} />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {items.map((prompt: Parameters<typeof PromptCard>[0]["prompt"]) => (
                <PromptCard key={prompt.id} prompt={prompt} />
              ))}
            </div>
          )}
        </Suspense>

        {/* Pagination */}
        {hasNext && nextCursor && (
          <div className="flex justify-center pt-4">
            <Link
              href={buildFilterUrl({ ...params, cursor: nextCursor })}
              className="px-6 py-2.5 rounded-lg bg-zinc-900 border border-zinc-700 text-sm text-zinc-300 hover:border-purple-500/50 hover:text-purple-300 transition-colors"
            >
              Загрузить ещё
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────

function buildFilterUrl(params: Record<string, string | undefined>): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") p.set(k, v);
  }
  const qs = p.toString();
  return qs ? `/?${qs}` : "/";
}

function CatalogSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <PromptCardSkeleton key={i} />
      ))}
    </div>
  );
}

function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div className="flex flex-col items-center gap-4 py-20 text-center">
      <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
        <Sparkles className="w-6 h-6 text-zinc-600" />
      </div>
      <div className="space-y-1">
        <p className="text-zinc-300 font-medium">
          {hasFilters ? "Ничего не найдено" : "Каталог пока пуст"}
        </p>
        <p className="text-zinc-600 text-sm">
          {hasFilters
            ? "Попробуйте изменить параметры поиска"
            : "Скоро здесь появятся первые промпты"}
        </p>
      </div>
      {hasFilters && (
        <Link
          href="/"
          className="text-sm text-purple-400 hover:text-purple-300 underline underline-offset-4"
        >
          Сбросить фильтры
        </Link>
      )}
    </div>
  );
}
