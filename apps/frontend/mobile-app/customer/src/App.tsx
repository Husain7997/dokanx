import { useEffect, useRef, useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { disableConsoleInProduction } from "../../shared/logger";
import { initializeSentry } from "../../shared/sentry";
import { UpdateGate } from "../../shared/update-gate";
import { useAuthStore } from "./store/auth-store";
import { useCartStore } from "./store/cart-store";
import { useTenantStore } from "./store/tenant-store";
import { RootNavigator } from "./navigation/root-navigator";

const CUSTOMER_APP_NAME = "dokanx-customer";
const CUSTOMER_APP_VERSION = "1.0.0";
const STARTUP_FALLBACK_MS = 8000;

disableConsoleInProduction();
initializeSentry(CUSTOMER_APP_NAME, CUSTOMER_APP_VERSION);

function getBootTimestamp() {
  const value = Number(globalThis.__DOKANX_CUSTOMER_BOOT_TS || Date.now());
  return Number.isFinite(value) ? value : Date.now();
}

function logStartup(event: string, details: Record<string, unknown> = {}) {
  const elapsedMs = Date.now() - getBootTimestamp();
  console.info(`[CustomerBoot] ${event}`, { elapsedMs, ...details });
}

function AppStartup() {
  const hydrateAuth = useAuthStore((state) => state.hydrate);
  const authError = useAuthStore((state) => state.error);
  const isAuthHydrated = useAuthStore((state) => state.isHydrated);
  const hydrateCart = useCartStore((state) => state.hydrate);
  const isCartHydrated = useCartStore((state) => state.isHydrated);
  const hydrateTenant = useTenantStore((state) => state.hydrate);
  const isTenantHydrated = useTenantStore((state) => state.isHydrated);
  const [attempt, setAttempt] = useState(0);
  const [showFallback, setShowFallback] = useState(false);
  const didLogHydration = useRef(false);
  const didLogFirstScreen = useRef(false);

  useEffect(() => {
    let active = true;
    setShowFallback(false);
    didLogHydration.current = false;

    logStartup("hydration start", { attempt });
    void Promise.all([hydrateAuth(), hydrateCart(), hydrateTenant()]).finally(() => {
      if (!active) {
        return;
      }
      logStartup("hydration requests settled", { attempt });
    });

    const timer = setTimeout(() => {
      if (!active) {
        return;
      }
      setShowFallback(true);
      logStartup("startup fallback shown", { attempt });
    }, STARTUP_FALLBACK_MS);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [attempt, hydrateAuth, hydrateCart, hydrateTenant]);

  const isReady = isAuthHydrated && isCartHydrated && isTenantHydrated;

  useEffect(() => {
    if (isReady && !didLogHydration.current) {
      didLogHydration.current = true;
      logStartup("hydration done", {
        auth: isAuthHydrated,
        cart: isCartHydrated,
        tenant: isTenantHydrated,
      });
    }
  }, [isReady, isAuthHydrated, isCartHydrated, isTenantHydrated]);

  if (isReady) {
    return (
      <NavigationContainer
        onReady={() => {
          if (!didLogFirstScreen.current) {
            didLogFirstScreen.current = true;
            logStartup("first screen render");
          }
        }}
      >
        <RootNavigator />
      </NavigationContainer>
    );
  }

  return (
    <View style={styles.splash}>
      <ActivityIndicator size="large" color="#111827" />
      <Text style={styles.splashTitle}>Starting DokanX</Text>
      <Text style={styles.splashSubtitle}>
        {showFallback
          ? "Startup is taking longer than expected. You can retry without leaving the app."
          : authError || "Restoring your session and marketplace data."}
      </Text>
      {showFallback ? (
        <Pressable style={styles.retryButton} onPress={() => setAttempt((current) => current + 1)}>
          <Text style={styles.retryText}>Retry startup</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <UpdateGate appName={CUSTOMER_APP_NAME} appVersion={CUSTOMER_APP_VERSION} />
        <AppStartup />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: "#f8f4ef",
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 24,
  },
  splashTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
  },
  splashSubtitle: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
  },
  retryButton: {
    marginTop: 4,
    borderRadius: 12,
    backgroundColor: "#111827",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  retryText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "600",
  },
});