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
  canGoBack: boolean;
  navigate: (screen: MerchantScreenName) => void;
  goBack: () => void;
  resetTo: (screen: MerchantScreenName) => void;
};

const MerchantNavigationContext = createContext<MerchantNavigationValue | null>(null);

export function MerchantNavigationProvider({
  initialScreen,
  children,
}: React.PropsWithChildren<{ initialScreen: MerchantScreenName }>) {
  const [history, setHistory] = useState<MerchantScreenName[]>([initialScreen]);
  const currentScreen = history[history.length - 1] || initialScreen;

  const value = useMemo(
    () => ({
      currentScreen,
      canGoBack: history.length > 1,
      navigate: (screen: MerchantScreenName) => {
        setHistory((current) => {
          const active = current[current.length - 1];
          if (active === screen) {
            return current;
          }
          return [...current, screen];
        });
      },
      goBack: () => {
        setHistory((current) => (current.length > 1 ? current.slice(0, -1) : current));
      },
      resetTo: (screen: MerchantScreenName) => setHistory([screen]),
    }),
    [currentScreen, history],
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
