/**
 * Auth Zustand Store
 * Источник: promptspace-release.md §12.14, §5.2
 *
 * Access token — только в памяти (не персистируется).
 * Refresh token — HttpOnly cookie (управляется сервером).
 */
"use client";

import { create } from "zustand";
import { authApi, setAccessToken } from "@/lib/api";

interface AuthState {
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  email: string | null;

  // Actions
  login: (accessToken: string) => void;
  logout: () => Promise<void>;
  refreshToken: () => Promise<boolean>;
  setEmail: (email: string | null) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  accessToken: null,
  isAuthenticated: false,
  isLoading: false,
  email: null,

  login: (token: string) => {
    setAccessToken(token);
    set({ accessToken: token, isAuthenticated: true });
  },

  logout: async () => {
    set({ isLoading: true });
    try {
      await authApi.logout();
    } catch {
      // Logout всегда очищает локальное состояние
    } finally {
      setAccessToken(null);
      set({ accessToken: null, isAuthenticated: false, isLoading: false });
    }
  },

  refreshToken: async () => {
    try {
      const res = await authApi.refresh();
      get().login(res.access_token);
      return true;
    } catch {
      setAccessToken(null);
      set({ accessToken: null, isAuthenticated: false });
      return false;
    }
  },

  setEmail: (email) => set({ email }),
}));
