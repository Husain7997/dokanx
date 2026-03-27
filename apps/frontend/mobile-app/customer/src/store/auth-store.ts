import { create } from "zustand";

import { getProfileRequest, loginRequest, registerRequest, registerUnauthorizedHandler } from "../lib/api-client";
import { clearAccessToken, getAccessToken, saveAccessToken } from "../../../shared/secure-storage";

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Something went wrong. Please try again.";
}

async function persistAccessToken(token: string) {
  await saveAccessToken(token);

  const restoredToken = await getAccessToken();
  if (restoredToken !== token) {
    throw new Error("Unable to persist your session. Please try again.");
  }
}

export type AuthState = {
  accessToken: string | null;
  isLoading: boolean;
  isHydrated: boolean;
  error: string | null;
  lastAttempt: { email: string; password: string } | null;
  hydrate: () => Promise<void>;
  retrySignIn: () => Promise<boolean>;
  signIn: (payload: { email: string; password: string }) => Promise<boolean>;
  signUp: (payload: { name: string; email: string; password: string; phone?: string }) => Promise<boolean>;
  signOut: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  accessToken: null,
  isLoading: false,
  isHydrated: false,
  error: null,
  lastAttempt: null,
  hydrate: async () => {
    set({ isHydrated: false });
    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        set({ accessToken: null, isHydrated: true, error: null });
        return;
      }

      await getProfileRequest(accessToken);
      set({ accessToken, isHydrated: true, error: null });
    } catch (error) {
      await clearAccessToken();
      set({ accessToken: null, isHydrated: true, error: getErrorMessage(error) });
    }
  },
  signIn: async (payload) => {
    set({ isLoading: true, error: null, lastAttempt: payload });
    try {
      const response = await loginRequest(payload);
      if (!response?.token) {
        throw new Error("Login token missing from server response.");
      }

      await persistAccessToken(response.token);
      set({ accessToken: response.token, isLoading: false, error: null, isHydrated: true });
      return true;
    } catch (error) {
      set({ isLoading: false, error: getErrorMessage(error) });
      return false;
    }
  },
  retrySignIn: async () => {
    const lastAttempt = get().lastAttempt;
    if (!lastAttempt) {
      set({ error: "Enter your credentials to sign in." });
      return false;
    }

    return get().signIn(lastAttempt);
  },
  signUp: async (payload) => {
    set({ isLoading: true, error: null });
    try {
      const response = await registerRequest(payload);
      if (!response?.token) {
        throw new Error("Registration token missing from server response.");
      }

      await persistAccessToken(response.token);
      set({ accessToken: response.token, isLoading: false, error: null, isHydrated: true });
      return true;
    } catch (error) {
      set({ isLoading: false, error: getErrorMessage(error) });
      return false;
    }
  },
  signOut: async () => {
    await clearAccessToken();
    set({ accessToken: null, error: null, isLoading: false, lastAttempt: null });
  },
}));

registerUnauthorizedHandler(() => useAuthStore.getState().signOut());