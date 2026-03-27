import React, { useEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { disableConsoleInProduction } from "../../shared/logger";
import { initializeSentry } from "../../shared/sentry";
import { UpdateGate } from "../../shared/update-gate";
import { RootNavigator } from "./navigation/root-navigator";
import { useMerchantAuthStore } from "./store/auth-store";
import { getMerchantPalette, useMerchantUiStore, useResolvedMerchantTheme } from "./store/ui-store";

const MERCHANT_APP_NAME = "dokanx-merchant";
const MERCHANT_APP_VERSION = "1.0.0";

disableConsoleInProduction();
initializeSentry(MERCHANT_APP_NAME, MERCHANT_APP_VERSION);

function AppStartup() {
  const hydrateAuth = useMerchantAuthStore((state) => state.hydrate);
  const hydrateUi = useMerchantUiStore((state) => state.hydrate);

  useEffect(() => {
    console.log("[merchant-app] startup begin");
    void Promise.all([hydrateAuth(), hydrateUi()]).finally(() => {
      console.log("[merchant-app] startup hydrate complete");
    });
  }, [hydrateAuth, hydrateUi]);

  return null;
}

type RootErrorBoundaryState = {
  hasError: boolean;
  message: string | null;
};

class RootErrorBoundary extends React.Component<React.PropsWithChildren, RootErrorBoundaryState> {
  state: RootErrorBoundaryState = {
    hasError: false,
    message: null,
  };

  static getDerivedStateFromError(error: Error): RootErrorBoundaryState {
    return {
      hasError: true,
      message: error?.message || "Merchant app crashed during startup",
    };
  }

  componentDidCatch(error: Error) {
    console.error("[merchant-app] root crash", error);
  }

  handleRetry = () => {
    this.setState({ hasError: false, message: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.fallbackScreen}>
          <View style={styles.fallbackCard}>
            <Text style={styles.fallbackTitle}>Merchant app failed to start</Text>
            <Text style={styles.fallbackBody}>{this.state.message || "A startup error occurred."}</Text>
            <Pressable style={styles.fallbackButton} onPress={this.handleRetry}>
              <Text style={styles.fallbackButtonText}>Retry app</Text>
            </Pressable>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

function MerchantAppShell() {
  const resolvedTheme = useResolvedMerchantTheme();
  const palette = getMerchantPalette(resolvedTheme);

  return (
    <View style={[styles.appShell, { backgroundColor: palette.screen }]}>
      <RootErrorBoundary>
        <AppStartup />
        {!__DEV__ ? <UpdateGate appName={MERCHANT_APP_NAME} appVersion={MERCHANT_APP_VERSION} /> : null}
        <RootNavigator />
      </RootErrorBoundary>
    </View>
  );
}

export default function App() {
  return <MerchantAppShell />;
}

const styles = StyleSheet.create({
  appShell: {
    flex: 1,
  },
  fallbackScreen: {
    flex: 1,
    backgroundColor: "#f8f4ef",
    justifyContent: "center",
    padding: 24,
  },
  fallbackCard: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 20,
    gap: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  fallbackTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111827",
  },
  fallbackBody: {
    fontSize: 14,
    lineHeight: 20,
    color: "#4b5563",
  },
  fallbackButton: {
    backgroundColor: "#111827",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  fallbackButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
  },
});

