/**
 * PromptSpace API Client
 * JWT: access token in memory, refresh via HttpOnly cookie
 * Источник: promptspace-release.md §5.2, §12.14
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

// Access token хранится только в памяти (не в localStorage/sessionStorage)
let accessToken: string | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

// ── Types ─────────────────────────────────────────────────────────────────

export interface OTPSendResponse {
  message: string;
  retry_after?: number;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

export interface ApiError {
  detail: string;
}

export interface PromptListItem {
  id: string;
  slug: string;
  title: string;
  short_description: string;
  category: { id: number; name: string; slug: string } | null;
  tags: Array<{ id: number; name: string; slug: string }>;
  price: string;
  is_free: boolean;
  seller: {
    id: string;
    username: string;
    bio: string;
    avatar_url: string | null;
  };
  views_count: number;
  purchases_count: number;
  published_at: string | null;
}

export interface CatalogPage {
  items: PromptListItem[];
  next_cursor: string | null;
  has_next: boolean;
  total_hint: number | null;
}

export interface PromptDetail extends PromptListItem {
  variables: Record<string, unknown>;
  og_image_object_key: string;
}

export interface CatalogFilters {
  category?: string;
  tags?: string[];
  price_min?: string;
  price_max?: string;
  is_free?: boolean;
  q?: string;
  sort?: "newest" | "popular" | "price_asc" | "price_desc";
  cursor?: string;
}

// ── Fetch helpers ─────────────────────────────────────────────────────────

async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  withAuth = false,
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (withAuth && accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    credentials: "include", // для refresh_token cookie
  });

  if (!res.ok) {
    const errorData: ApiError = await res.json().catch(() => ({ detail: res.statusText }));
    throw Object.assign(new Error(errorData.detail), { status: res.status, data: errorData });
  }

  // 204 No Content
  if (res.status === 204) return undefined as T;

  return res.json() as Promise<T>;
}

// ── Auth API ──────────────────────────────────────────────────────────────

export const authApi = {
  sendOtp: (email: string) =>
    apiFetch<OTPSendResponse>("/auth/otp/send", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),

  verifyOtp: (email: string, code: string) =>
    apiFetch<TokenResponse>("/auth/otp/verify", {
      method: "POST",
      body: JSON.stringify({ email, code }),
    }),

  refresh: (refreshToken?: string) =>
    apiFetch<TokenResponse>("/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ refresh_token: refreshToken ?? "" }),
    }),

  logout: () =>
    apiFetch<{ message: string }>("/auth/logout", {
      method: "POST",
    }, true),

  getYandexOAuthUrl: () =>
    `${API_BASE}/auth/yandex/callback?redirect=true`,
};

// ── Catalog API ───────────────────────────────────────────────────────────

export const catalogApi = {
  listPrompts: (filters: CatalogFilters = {}) => {
    const params = new URLSearchParams();
    if (filters.category) params.set("category", filters.category);
    if (filters.q) params.set("q", filters.q);
    if (filters.is_free !== undefined) params.set("is_free", String(filters.is_free));
    if (filters.price_min) params.set("price_min", filters.price_min);
    if (filters.price_max) params.set("price_max", filters.price_max);
    if (filters.sort) params.set("sort", filters.sort);
    if (filters.cursor) params.set("cursor", filters.cursor);
    if (filters.tags?.length) filters.tags.forEach((t) => params.append("tags", t));

    const query = params.toString();
    return apiFetch<CatalogPage>(`/catalog/prompts${query ? `?${query}` : ""}`);
  },

  getPrompt: (slug: string) =>
    apiFetch<PromptDetail>(`/catalog/prompts/${slug}`),
};
