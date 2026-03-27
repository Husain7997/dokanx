import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";

import { listPublicShops } from "../lib/api-client";
import { useCartStore } from "../store/cart-store";
import { DEMO_CUSTOMER_SHOP, useTenantStore } from "../store/tenant-store";

type ShopOption = {
  id: string;
  name: string;
  domain?: string | null;
  slug?: string | null;
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
        const message = err instanceof Error ? err.message : "Unable to load shops.";
        setError(`${message} Showing starter shops instead.`);
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
        <Text style={styles.title}>Choose a shop</Text>
        <Text style={styles.subtitle}>Select the storefront you want to explore. If live shops are unavailable, starter shops stay available for cart testing.</Text>
        {loading ? <Text style={styles.infoText}>Loading shops...</Text> : null}
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        {shops.map((shop) => (
          <Pressable key={shop.id} style={styles.card} onPress={() => { clearCart(); setShop(shop); navigation.navigate("Browse" as never); }}>
            <Text style={styles.cardTitle}>{shop.name}</Text>
            <Text style={styles.cardSubtitle}>{shop.domain || shop.slug || "Shop domain pending"}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f8f4ef" },
  container: { padding: 16, gap: 16 },
  title: { fontSize: 20, fontWeight: "700", color: "#1f2937" },
  subtitle: { fontSize: 13, color: "#6b7280" },
  infoText: { fontSize: 12, color: "#6b7280" },
  errorText: { fontSize: 12, color: "#b91c1c" },
  card: { backgroundColor: "#ffffff", borderRadius: 18, padding: 16, borderWidth: 1, borderColor: "#e5e7eb", gap: 6 },
  cardTitle: { fontSize: 15, fontWeight: "600", color: "#111827" },
  cardSubtitle: { fontSize: 12, color: "#6b7280" },
});
