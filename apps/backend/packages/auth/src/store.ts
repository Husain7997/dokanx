import { create } from "zustand";

import type { AuthState, AuthUser } from "./types";

type AuthStore = AuthState & {
  setSession: (payload: {
    accessToken: string;
    refreshToken: string;
    refreshTokenExpiresAt: string;
    user: AuthUser;
  }) => void;
  setTenant: (tenant: AuthState["tenant"]) => void;
  setStatus: (status: AuthState["status"]) => void;
  clearSession: () => void;
};

export const useAuthStore = create<AuthStore>((set) => ({
  accessToken: null,
  refreshToken: null,
  refreshTokenExpiresAt: null,
  user: null,
  tenant: null,
  status: "anonymous",
  setSession: ({ accessToken, refreshToken, refreshTokenExpiresAt, user }) =>
    set({
      accessToken,
      refreshToken,
      refreshTokenExpiresAt,
      user,
      status: "authenticated"
    }),
  setTenant: (tenant) => set({ tenant }),
  setStatus: (status) => set({ status }),
  clearSession: () =>
    set({
      accessToken: null,
      refreshToken: null,
      refreshTokenExpiresAt: null,
      user: null,
      status: "anonymous"
    })
}));
