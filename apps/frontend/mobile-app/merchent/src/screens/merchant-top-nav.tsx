import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { DokanXLogo } from "../components/dokanx-logo";
import { useMerchantNavigation } from "../navigation/merchant-navigation";
import { getMerchantPalette, useMerchantUiStore, useResolvedMerchantTheme } from "../store/ui-store";

const ITEMS = [
  { label: "Dashboard", labelBn: "ড্যাশবোর্ড", screen: "MerchantDashboard" },
  { label: "AI", labelBn: "এআই", screen: "MerchantAi" },
  { label: "POS", labelBn: "পিওএস", screen: "MerchantPos" },
  { label: "Orders", labelBn: "অর্ডার", screen: "MerchantOrders" },
  { label: "Wallet", labelBn: "ওয়ালেট", screen: "MerchantWallet" },
  { label: "Finance", labelBn: "ফিন্যান্স", screen: "MerchantFinance" },
  { label: "Credit", labelBn: "ক্রেডিট", screen: "MerchantCredit" },
  { label: "Customers", labelBn: "কাস্টমার", screen: "MerchantCustomers" },
  { label: "Products", labelBn: "প্রোডাক্ট", screen: "MerchantProducts" },
  { label: "Alerts", labelBn: "এলার্ট", screen: "MerchantNotifications" },
  { label: "Marketing", labelBn: "মার্কেটিং", screen: "MerchantMarketing" },
  { label: "Settings", labelBn: "সেটিংস", screen: "MerchantSettings" },
] as const;

export function MerchantTopNav({ active }: { active: string }) {
  const navigation = useMerchantNavigation();
  const language = useMerchantUiStore((state) => state.language);
  const palette = getMerchantPalette(useResolvedMerchantTheme());
  const [collapsed, setCollapsed] = useState(false);

  const labels = language === "bn"
    ? {
        title: "মার্চেন্ট টুলস",
        helper: collapsed ? "আরও জায়গার জন্য টুলস লুকানো আছে" : "যে টুল লাগবে সেটিতে ট্যাপ করুন",
        toggleShow: "খুলুন",
        toggleHide: "লুকান",
      }
    : {
        title: "Merchant tools",
        helper: collapsed ? "Tools hidden for more space" : "Tap a tool to switch screens",
        toggleShow: "Show",
        toggleHide: "Hide",
      };

  return (
    <View style={[styles.wrapper, { backgroundColor: palette.surface, borderColor: palette.border }] }>
      <View style={styles.headerRow}>
        <View style={styles.headerBrandWrap}>
          <View style={[styles.logoBadge, { borderColor: palette.border, backgroundColor: palette.surfaceAlt }]}>
            <DokanXLogo variant="icon" size="sm" />
          </View>
          <View style={styles.headerTextWrap}>
            <Text style={[styles.label, { color: palette.accent }]}>{labels.title}</Text>
            <Text style={[styles.helper, { color: palette.muted }]}>{labels.helper}</Text>
          </View>
        </View>
        <Pressable
          style={[styles.toggleButton, { borderColor: palette.border, backgroundColor: palette.surfaceAlt }]}
          onPress={() => setCollapsed((value) => !value)}
        >
          <Text style={[styles.toggleButtonText, { color: palette.text }]}>{collapsed ? labels.toggleShow : labels.toggleHide}</Text>
        </Pressable>
      </View>
      {!collapsed ? (
        <View style={styles.grid}>
          {ITEMS.map((item) => {
            const isActive = item.label === active;
            const text = language === "bn" ? item.labelBn : item.label;
            return (
              <Pressable
                key={item.screen}
                style={[
                  styles.pill,
                  { borderColor: palette.border, backgroundColor: palette.surfaceAlt },
                  isActive ? { backgroundColor: palette.accent, borderColor: palette.accent } : null,
                ]}
                onPress={() => navigation.navigate(item.screen)}
              >
                <Text style={[styles.text, { color: isActive ? palette.accentText : palette.text }]} numberOfLines={1}>{text}</Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 8,
    borderRadius: 18,
    borderWidth: 1,
    padding: 12,
    gap: 10,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  headerBrandWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  logoBadge: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 2,
  },
  headerTextWrap: {
    flex: 1,
    gap: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  helper: {
    fontSize: 11,
    lineHeight: 16,
  },
  toggleButton: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  toggleButtonText: {
    fontSize: 12,
    fontWeight: "700",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  pill: {
    minWidth: "23%",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    fontSize: 11,
    fontWeight: "700",
  },
});
