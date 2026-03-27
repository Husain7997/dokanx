import React, { createContext, useContext, useMemo, useState } from "react";

type MerchantScreenName =
  | "MerchantAuth"
  | "MerchantDashboard"
  | "MerchantAi"
  | "MerchantPos"
  | "MerchantOrders"
  | "MerchantWallet"
  | "MerchantFinance"
  | "MerchantCredit"
  | "MerchantCustomers"
  | "MerchantProducts"
  | "MerchantNotifications"
  | "MerchantMarketing"
  | "MerchantSettings";

type MerchantNavigationValue = {
  currentScreen: MerchantScreenName;
  navigate: (screen: MerchantScreenName) => void;
  resetTo: (screen: MerchantScreenName) => void;
};

const MerchantNavigationContext = createContext<MerchantNavigationValue | null>(null);

export function MerchantNavigationProvider({
  initialScreen,
  children,
}: React.PropsWithChildren<{ initialScreen: MerchantScreenName }>) {
  const [currentScreen, setCurrentScreen] = useState<MerchantScreenName>(initialScreen);

  const value = useMemo(
    () => ({
      currentScreen,
      navigate: (screen: MerchantScreenName) => setCurrentScreen(screen),
      resetTo: (screen: MerchantScreenName) => setCurrentScreen(screen),
    }),
    [currentScreen],
  );

  return <MerchantNavigationContext.Provider value={value}>{children}</MerchantNavigationContext.Provider>;
}

export function useMerchantNavigation() {
  const value = useContext(MerchantNavigationContext);

  if (!value) {
    throw new Error("Merchant navigation context missing");
  }

  return value;
}

export type { MerchantScreenName };
