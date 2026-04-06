import * as Keychain from "react-native-keychain";
import { create } from "zustand";

import {
  getMerchantProfileRequest,
  merchantLoginRequest,
  registerUnauthorizedHandler,
} from "../lib/api-client";

const MERCHANT_AUTH_SERVICE = "dokanx.mobile.merchant.auth";

type MerchantProfile = {
  id?: string;
  name?: string;
  email?: string;
  role?: string;
  phone?: string;
  shopId?: string;
};

type AuthState = {
  accessToken: string | null;
  profile: MerchantProfile | null;
  isLoading: boolean;
  isHydrated: boolean;
  error: string | null;
  hydrate: () => Promise<void>;
  signIn: (payload: { email: string; password: string }) => Promise<boolean>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

async function persistToken(token: string) {
  await Keychain.setGenericPassword("merchant-access-token", token, {
    service: MERCHANT_AUTH_SERVICE,
    accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}

async function readToken() {
  const credentials = await Keychain.getGenericPassword({
    service: MERCHANT_AUTH_SERVICE,
  });

  if (!credentials) {
    return null;
  }

  return credentials.password;
}

async function clearToken() {
  await Keychain.resetGenericPassword({
    service: MERCHANT_AUTH_SERVICE,
  });
}

export const useMerchantAuthStore = create<AuthState>((set, get) => ({
  accessToken: null,
  profile: null,
  isLoading: false,
  isHydrated: false,
  error: null,
  hydrate: async () => {
    try {
      const accessToken = await readToken();
      set({ accessToken, isHydrated: true, error: null });
      if (accessToken) {
        await get().refreshProfile();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to restore your merchant session right now.";
      set({ accessToken: null, profile: null, isHydrated: true, error: message });
    }
  },
  signIn: async (payload) => {
    set({ isLoading: true, error: null });
    try {
      const response = await merchantLoginRequest(payload);
      const token = response.accessToken || response.token || null;

      if (!token) {
        throw new Error("Login token missing");
      }

      await persistToken(token);
      set({ accessToken: token, isLoading: false, error: null });
      await get().refreshProfile();
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Merchant login failed";
      set({ isLoading: false, error: message });
      return false;
    }
  },
  signOut: async () => {
    await clearToken();
    set({ accessToken: null, profile: null, isLoading: false, error: null });
  },
  refreshProfile: async () => {
    const token = get().accessToken;
    if (!token) {
      set({ profile: null });
      return;
    }

    try {
      const response = await getMerchantProfileRequest(token);
      set({
        profile: response.user
          ? {
              id: response.user._id,
              name: response.user.name,
              email: response.user.email,
              role: response.user.role,
              phone: response.user.phone,
              shopId: response.user.shopId,
            }
          : null,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to load your merchant profile right now.";
      await clearToken();
      set({ accessToken: null, profile: null, error: message });
    }
  },
}));

registerUnauthorizedHandler(() => useMerchantAuthStore.getState().signOut());

