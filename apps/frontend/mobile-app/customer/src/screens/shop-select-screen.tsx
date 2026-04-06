import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";

import { listPublicShops } from "../lib/api-client";
import { DokanXLogo } from "../components/dokanx-logo";
import { useCartStore } from "../store/cart-store";
import { DEMO_CUSTOMER_SHOP, useTenantStore } from "../store/tenant-store";

type ShopOption = {
  id: string;
  name: string;
  domain?: string | null;
  slug?: string | null;
};

const BRAND = {
  navy: "#0B1E3C",
  orange: "#FF7A00",
  screen: "#F4F7FB",
  surface: "#FFFFFF",
  border: "#D7DFEA",
  text: "#0B1E3C",
  muted: "#5F6F86",
  tint: "#EEF3FA",
};

const FALLBACK_SHOPS: ShopOption[] = [
  DEMO_CUSTOMER_SHOP,
  { id: "demo-shop-2", name: "DokanX Fresh Corner", domain: "fresh.local", slug: "dokanx-fresh-corner" },
  { id: "demo-shop-3", name: "DokanX Family Bazaar", domain: "family.local", slug: "dokanx-family-bazaar" },
];

export function ShopSelectScreen() {
  const navigation = useNavigation();
  const setShop = useTenantStore((state) => state.setShop);
  const clearCart = useCartStore((state) => state.clear);
  const [shops, setShops] = useState<ShopOption[]>(FALLBACK_SHOPS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        setLoading(true);
        const response = await listPublicShops();
        if (!active) return;
        const list = response.data?.map((shop) => ({
          id: String(shop._id || shop.id || ""),
          name: String(shop.name || "Shop"),
          domain: shop.domain ? String(shop.domain) : null,
          slug: shop.slug ? String(shop.slug) : null,
        })).filter((shop) => shop.id) || [];
        setShops(list.length ? list : FALLBACK_SHOPS);
        setError(null);
      } catch (err) {
        if (!active) return;
        const message = err instanceof Error ? err.message : "Unable to load nearby shops.";
        setError(`${message} Showing ready-to-browse shops instead.`);
        setShops(FALLBACK_SHOPS);
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.heroCard}>
          <DokanXLogo variant="full" size="lg" />
          <Text style={styles.kicker}>Shop selection</Text>
          <Text style={styles.title}>Pick a storefront before you start browsing.</Text>
          <Text style={styles.subtitle}>The selected shop sets product availability, cart sync, and checkout context for the rest of the customer journey.</Text>
        </View>
        {loading ? <Text style={styles.infoText}>Loading nearby shops...</Text> : null}
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        {shops.map((shop) => (
          <Pressable key={shop.id} style={styles.card} onPress={() => { clearCart(); setShop(shop); navigation.navigate("Browse" as never); }}>
            <Text style={styles.cardTitle}>{shop.name}</Text>
            <Text style={styles.cardSubtitle}>{shop.domain || shop.slug || "Storefront details updating"}</Text>
            <Text style={styles.cardHint}>Tap to enter this storefront and reset the cart context cleanly.</Text>
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: BRAND.screen },
  container: { padding: 16, gap: 16 },
  heroCard: {
    borderRadius: 24,
    padding: 20,
    gap: 10,
    backgroundColor: BRAND.surface,
    borderWidth: 1,
    borderColor: BRAND.border,
  },
  kicker: { fontSize: 12, fontWeight: "800", letterSpacing: 1.2, color: BRAND.orange, textTransform: "uppercase" },
  title: { fontSize: 24, fontWeight: "700", color: BRAND.text },
  subtitle: { fontSize: 13, color: BRAND.muted, lineHeight: 20 },
  infoText: { fontSize: 12, color: BRAND.muted },
  errorText: { fontSize: 12, color: "#b91c1c" },
  card: { backgroundColor: BRAND.surface, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: BRAND.border, gap: 6 },
  cardTitle: { fontSize: 15, fontWeight: "600", color: BRAND.text },
  cardSubtitle: { fontSize: 12, color: BRAND.muted },
  cardHint: { fontSize: 12, color: BRAND.text },
});


