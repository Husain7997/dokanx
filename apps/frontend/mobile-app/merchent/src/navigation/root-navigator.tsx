import React, { useEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { MerchantNavigationProvider, MerchantScreenName, useMerchantNavigation } from "./merchant-navigation";
import { useMerchantAuthStore } from "../store/auth-store";
import { useMerchantPosStore } from "../store/pos-store";

const DOCK_TRANSLATIONS = {
  en: { Home: "Home", POS: "POS", Orders: "Orders", Wallet: "Wallet", Finance: "Finance" },
  bn: { Home: "???", POS: "??", Orders: "??????", Wallet: "??????", Finance: "?????????" },
} as const;

const DOCK_ITEMS: Array<{ key: keyof typeof DOCK_TRANSLATIONS.en; screen: MerchantScreenName }> = [
  { key: "Home", screen: "MerchantDashboard" },
  { key: "POS", screen: "MerchantPos" },
  { key: "Orders", screen: "MerchantOrders" },
  { key: "Wallet", screen: "MerchantWallet" },
  { key: "Finance", screen: "MerchantFinance" },
];

function MerchantScreenRenderer() {
  const { currentScreen } = useMerchantNavigation();

  switch (currentScreen) {
    case "MerchantAi":
      return React.createElement(require("../screens/merchant-ai-screen").MerchantAiScreen);
    case "MerchantPos":
      return React.createElement(require("../screens/merchant-pos-screen").MerchantPosScreen);
    case "MerchantOrders":
      return React.createElement(require("../screens/merchant-orders-screen").MerchantOrdersScreen);
    case "MerchantWallet":
      return React.createElement(require("../screens/merchant-wallet-screen").MerchantWalletScreen);
    case "MerchantFinance":
      return React.createElement(require("../screens/merchant-finance-screen").MerchantFinanceScreen);
    case "MerchantCredit":
      return React.createElement(require("../screens/merchant-credit-screen").MerchantCreditScreen);
    case "MerchantCustomers":
      return React.createElement(require("../screens/merchant-customers-screen").MerchantCustomersScreen);
    case "MerchantProducts":
      return React.createElement(require("../screens/merchant-products-screen").MerchantProductsScreen);
    case "MerchantNotifications":
      return React.createElement(require("../screens/merchant-notifications-screen").MerchantNotificationsScreen);
    case "MerchantMarketing":
      return React.createElement(require("../screens/merchant-marketing-screen").MerchantMarketingScreen);
    case "MerchantSettings":
      return React.createElement(require("../screens/merchant-settings-screen").MerchantSettingsScreen);
    case "MerchantDashboard":
    default:
      return React.createElement(require("../screens/merchant-dashboard-screen").MerchantDashboardScreen);
  }
}

function MerchantBottomDock() {
  const { currentScreen, navigate } = useMerchantNavigation();
  const labels = DOCK_TRANSLATIONS.en;

  return (
    <View pointerEvents="box-none" style={styles.dockWrap}>
      <View style={styles.dock}>
        {DOCK_ITEMS.map((item) => {
          const active = currentScreen === item.screen;
          return (
            <Pressable key={item.key} style={[styles.dockItem, active ? styles.dockItemActive : null]} onPress={() => navigate(item.screen)}>
              <Text style={[styles.dockText, active ? styles.dockTextActive : null]}>{labels[item.key]}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function MerchantShell() {
  const { currentScreen } = useMerchantNavigation();
  const scannerActive = useMerchantPosStore((state) => state.scannerActive);
  const hideDock = currentScreen === "MerchantPos" && scannerActive;

  return (
    <View style={styles.shell}>
      <MerchantScreenRenderer />
      {hideDock ? null : <MerchantBottomDock />}
    </View>
  );
}

export function RootNavigator() {
  const hydrate = useMerchantAuthStore((state) => state.hydrate);
  const accessToken = useMerchantAuthStore((state) => state.accessToken);
  const isHydrated = useMerchantAuthStore((state) => state.isHydrated);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  if (!isHydrated || !accessToken) {
    return React.createElement(require("../screens/merchant-auth-screen").MerchantAuthScreen);
  }

  return (
    <MerchantNavigationProvider initialScreen="MerchantDashboard">
      <MerchantShell />
    </MerchantNavigationProvider>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1, backgroundColor: "#f4f7fb" },
  dockWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 12,
    paddingBottom: 10,
    alignItems: "center",
  },
  dock: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
    borderRadius: 18,
    padding: 8,
    borderWidth: 1,
    borderColor: "#d7dfea",
    backgroundColor: "rgba(11,30,60,0.96)",
  },
  dockItem: {
    flex: 1,
    alignItems: "center",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 6,
  },
  dockItemActive: { backgroundColor: "#ff7a00" },
  dockText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#f8fafc",
  },
  dockTextActive: { color: "#ffffff" },
});
