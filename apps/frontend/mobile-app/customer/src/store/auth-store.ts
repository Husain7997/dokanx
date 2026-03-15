import { create } from "zustand";

import { loginRequest } from "@/lib/api-client";

export type AuthState = {
  accessToken: string | null;
  isLoading: boolean;
  error: string | null;
  signIn: (payload: { email: string; password: string }) => Promise<boolean>;
  signOut: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  isLoading: false,
  error: null,
  signIn: async (payload) => {
    set({ isLoading: true, error: null });
    try {
      const response = await loginRequest(payload);
      set({ accessToken: response.token, isLoading: false, error: null });
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Login failed";
      set({ isLoading: false, error: message });
      return false;
    }
  },
  signOut: () => set({ accessToken: null, error: null, isLoading: false }),
}));
