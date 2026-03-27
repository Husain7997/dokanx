import { Pressable, StyleSheet, Text, View } from "react-native";

import { MerchantAiScreen } from "../screens/merchant-ai-screen";
import { MerchantAuthScreen } from "../screens/merchant-auth-screen";
import { MerchantCreditScreen } from "../screens/merchant-credit-screen";
import { MerchantCustomersScreen } from "../screens/merchant-customers-screen";
import { MerchantDashboardScreen } from "../screens/merchant-dashboard-screen";
import { MerchantFinanceScreen } from "../screens/merchant-finance-screen";
import { MerchantMarketingScreen } from "../screens/merchant-marketing-screen";
import { MerchantNotificationsScreen } from "../screens/merchant-notifications-screen";
import { MerchantOrdersScreen } from "../screens/merchant-orders-screen";
import { MerchantPosScreen } from "../screens/merchant-pos-screen";
import { MerchantProductsScreen } from "../screens/merchant-products-screen";
import { MerchantSettingsScreen } from "../screens/merchant-settings-screen";
import { MerchantWalletScreen } from "../screens/merchant-wallet-screen";
import { MerchantNavigationProvider, MerchantScreenName, useMerchantNavigation } from "./merchant-navigation";
import { useMerchantAuthStore } from "../store/auth-store";
import { getMerchantPalette, useMerchantUiStore, useResolvedMerchantTheme } from "../store/ui-store";

const DOCK_TRANSLATIONS = {
  en: { Home: "Home", POS: "POS", Orders: "Orders", Wallet: "Wallet", Finance: "Finance" },
  bn: { Home: "হোম", POS: "পজ", Orders: "অর্ডার", Wallet: "ওয়ালেট", Finance: "ফিন্যান্স" },
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
      return <MerchantAiScreen />;
    case "MerchantPos":
      return <MerchantPosScreen />;
    case "MerchantOrders":
      return <MerchantOrdersScreen />;
    case "MerchantWallet":
      return <MerchantWalletScreen />;
    case "MerchantFinance":
      return <MerchantFinanceScreen />;
    case "MerchantCredit":
      return <MerchantCreditScreen />;
    case "MerchantCustomers":
      return <MerchantCustomersScreen />;
    case "MerchantProducts":
      return <MerchantProductsScreen />;
    case "MerchantNotifications":
      return <MerchantNotificationsScreen />;
    case "MerchantMarketing":
      return <MerchantMarketingScreen />;
    case "MerchantSettings":
      return <MerchantSettingsScreen />;
    case "MerchantDashboard":
    default:
      return <MerchantDashboardScreen />;
  }
}

function MerchantBottomDock() {
  const { currentScreen, navigate } = useMerchantNavigation();
  const language = useMerchantUiStore((state) => state.language);
  const palette = getMerchantPalette(useResolvedMerchantTheme());
  const labels = DOCK_TRANSLATIONS[language];

  return (
    <View pointerEvents="box-none" style={styles.dockWrap}>
      <View style={[styles.dock, { backgroundColor: palette.dock, borderColor: palette.border }] }>
        {DOCK_ITEMS.map((item) => {
          const active = currentScreen === item.screen;
          return (
            <Pressable key={item.key} style={[styles.dockItem, active ? { backgroundColor: palette.accent } : null]} onPress={() => navigate(item.screen)}>
              <Text style={[styles.dockText, { color: active ? palette.accentText : palette.dockText }]}>{labels[item.key]}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function MerchantShell() {
  const palette = getMerchantPalette(useResolvedMerchantTheme());

  return (
    <View style={[styles.shell, { backgroundColor: palette.screen }]}>
      <MerchantScreenRenderer />
      <MerchantBottomDock />
    </View>
  );
}

export function RootNavigator() {
  const accessToken = useMerchantAuthStore((state) => state.accessToken);
  const isHydrated = useMerchantAuthStore((state) => state.isHydrated);
  const isUiHydrated = useMerchantUiStore((state) => state.isHydrated);

  if (!isHydrated || !isUiHydrated || !accessToken) {
    return <MerchantAuthScreen />;
  }

  const initialScreen: MerchantScreenName = "MerchantDashboard";

  return (
    <MerchantNavigationProvider initialScreen={initialScreen}>
      <MerchantShell />
    </MerchantNavigationProvider>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1 },
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
  },
  dockItem: {
    flex: 1,
    alignItems: "center",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 6,
  },
  dockText: {
    fontSize: 11,
    fontWeight: "700",
  },
});
