import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";

import { listPublicShops, saveCartRequest, searchProducts } from "../lib/api-client";
import { DokanXLogo } from "../components/dokanx-logo";
import { useAuthStore } from "../store/auth-store";
import { useCartStore } from "../store/cart-store";
import { useTenantStore } from "../store/tenant-store";

const BRAND = {
  navy: "#0B1E3C",
  navySoft: "#17325F",
  orange: "#FF7A00",
  bg: "#F4F7FB",
  surface: "#FFFFFF",
  surfaceMuted: "#EEF3F9",
  border: "#D7DFEA",
  text: "#122033",
  textMuted: "#5F6F86",
};

const DEMO_RESULTS = [
  { id: "demo-bread", name: "Brown Bread", price: 60 },
  { id: "demo-milk", name: "Fresh Milk 1L", price: 95 },
  { id: "demo-rice", name: "Premium Rice 5kg", price: 540 },
];

export function SearchResultsScreen() {
  const navigation = useNavigation();
  const addItem = useCartStore((state) => state.addItem);
  const guestToken = useCartStore((state) => state.guestToken);
  const setGuestToken = useCartStore((state) => state.setGuestToken);
  const setItems = useCartStore((state) => state.setItems);
  const items = useCartStore((state) => state.items);
  const accessToken = useAuthStore((state) => state.accessToken);
  const selectedShop = useTenantStore((state) => state.shop);
  const setShop = useTenantStore((state) => state.setShop);
  const [results, setResults] = useState<Array<{ id: string; name: string; price: number }>>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>("Loading live product results...");

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      try {
        let shopId = selectedShop?.id || "";
        let shopName = selectedShop?.name || "";

        if (!shopId) {
          const shopResponse = await listPublicShops().catch(() => null);
          const firstShop = shopResponse?.data?.find((shop) => shop._id || shop.id);
          if (firstShop) {
            shopId = String(firstShop._id || firstShop.id || "");
            shopName = String(firstShop.name || "Shop");
            setShop({
              id: shopId,
              name: shopName,
              domain: firstShop.domain ? String(firstShop.domain) : null,
              slug: firstShop.slug ? String(firstShop.slug) : null,
            });
          }
        }

        if (!shopId) {
          if (!active) return;
          setResults(DEMO_RESULTS);
          setStatus("Live shop sync is still warming up, so we are showing ready-to-browse search results.");
          return;
        }

        const response = await searchProducts({ shopId });
        if (!active) return;
        const list =
          response.data?.map((item) => ({
            id: String(item._id || item.id || ""),
            name: String(item.name || ""),
            price: Number(item.price || 0),
          })) || [];

        if (list.length) {
          setResults(list.filter((item) => item.id));
          setStatus(`Showing products from ${shopName || "the selected shop"}.`);
        } else {
          setResults(DEMO_RESULTS);
          setStatus("No live products matched yet, so we are showing ready-to-browse fallback results.");
        }
      } catch {
        if (!active) return;
        setResults(DEMO_RESULTS);
        setStatus("Search sync is delayed, so we are showing ready-to-browse results for now.");
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [selectedShop?.id, selectedShop?.name, setShop]);

  const visibleResults = useMemo(() => (results.length ? results : DEMO_RESULTS), [results]);
  const cartCount = useMemo(() => items.reduce((count, item) => count + Math.max(1, Number(item.quantity || 1)), 0), [items]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.hero}>
          <DokanXLogo variant="full" size="sm" />
          <Text style={styles.heroEyebrow}>Search Results</Text>
          <Text style={styles.heroTitle}>Keep comparing items and move the best pick straight into the cart.</Text>
          <Text style={styles.heroDescription}>{status || "Browse the available results from your active shop."}</Text>
          <View style={styles.heroStats}>
            <View style={styles.heroStatCard}>
              <Text style={styles.heroStatLabel}>Results</Text>
              <Text style={styles.heroStatValue}>{visibleResults.length}</Text>
            </View>
            <View style={styles.heroStatCard}>
              <Text style={styles.heroStatLabel}>Shop</Text>
              <Text style={styles.heroStatValueSmall}>{selectedShop?.name || "Auto selecting"}</Text>
            </View>
            <Pressable style={styles.cartButton} onPress={() => navigation.navigate("Cart" as never)}>
              <Text style={styles.cartButtonLabel}>Cart</Text>
              <Text style={styles.cartButtonValue}>{cartCount} lines</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Search status</Text>
          <Text style={styles.cardDescription}>We show live catalog results when available and keep browse-ready backup items visible while the shop feed warms up.</Text>
          {loading ? <Text style={styles.loadingText}>Loading search results...</Text> : <Text style={styles.cardNote}>Results are ready to review.</Text>}
        </View>
        {visibleResults.map((item, index) => (
          <View key={item.id} style={styles.resultCard}>
            <View style={styles.resultHeader}>
              <View style={styles.resultCopy}>
                <Text style={styles.resultTitle}>{item.name}</Text>
                <Text style={styles.resultSubtitle}>{selectedShop?.name || "Selected shop"}</Text>
              </View>
              <View style={styles.pricePill}>
                <Text style={styles.priceText}>{item.price} BDT</Text>
              </View>
            </View>
            <View style={styles.resultMetrics}>
              <View style={styles.metricChip}>
                <Text style={styles.metricChipLabel}>Rank</Text>
                <Text style={styles.metricChipValue}>#{index + 1}</Text>
              </View>
              <View style={styles.metricChip}>
                <Text style={styles.metricChipLabel}>Cart ready</Text>
                <Text style={styles.metricChipValue}>Instant</Text>
              </View>
            </View>
            <Pressable
              style={styles.actionButton}
              onPress={() => {
                if (!selectedShop?.id) {
                  navigation.navigate("ShopSelect" as never);
                  return;
                }
                addItem({
                  id: item.id,
                  productId: item.id,
                  name: item.name,
                  price: item.price,
                  shopId: selectedShop.id,
                  shop: selectedShop.name,
                });
                void saveCartRequest({
                  shopId: selectedShop.id,
                  items: [
                    ...items,
                    {
                      productId: item.id,
                      quantity: 1,
                      name: item.name,
                      price: item.price,
                    },
                  ].map((entry) => ({
                    productId: entry.productId,
                    quantity: entry.quantity || 1,
                    name: entry.name,
                    price: entry.price,
                  })),
                  token: accessToken,
                  cartToken: guestToken,
                })
                  .then((response) => {
                    if (response.guestToken) setGuestToken(response.guestToken);
                    if (response.data?.items?.length && selectedShop?.id) {
                      setItems(
                        response.data.items
                          .map((entry) => ({
                            id: String(entry.productId || ""),
                            productId: String(entry.productId || ""),
                            name: String(entry.name || "Item"),
                            price: Number(entry.price || 0),
                            quantity: Math.max(1, Number(entry.quantity || 1)),
                            shopId: selectedShop.id,
                            shop: selectedShop.name,
                          }))
                          .filter((entry) => entry.id)
                      );
                    }
                  })
                  .catch(() => undefined);
                navigation.navigate("Cart" as never);
              }}
            >
              <Text style={styles.actionText}>Add to cart</Text>
            </Pressable>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: BRAND.bg },
  container: { padding: 16, gap: 16 },
  hero: {
    backgroundColor: BRAND.navy,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: BRAND.navySoft,
    gap: 10,
  },
  heroEyebrow: { color: "#C4D2E8", fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.8 },
  heroTitle: { color: "#FFFFFF", fontSize: 24, lineHeight: 30, fontWeight: "800" },
  heroDescription: { color: "#D7E2F1", fontSize: 14, lineHeight: 21 },
  heroStats: { flexDirection: "row", gap: 10, flexWrap: "wrap", marginTop: 6 },
  heroStatCard: {
    flexGrow: 1,
    minWidth: 96,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    gap: 4,
  },
  heroStatLabel: { color: "#C4D2E8", fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.6 },
  heroStatValue: { color: "#FFFFFF", fontSize: 18, fontWeight: "800" },
  heroStatValueSmall: { color: "#FFFFFF", fontSize: 13, fontWeight: "700" },
  cartButton: {
    minWidth: 96,
    borderRadius: 18,
    padding: 12,
    backgroundColor: "#FFFFFF",
    gap: 4,
  },
  cartButtonLabel: { color: BRAND.textMuted, fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.6 },
  cartButtonValue: { color: BRAND.navy, fontSize: 15, fontWeight: "800" },
  card: {
    backgroundColor: BRAND.surface,
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: BRAND.border,
    gap: 10,
  },
  cardTitle: { fontSize: 18, fontWeight: "800", color: BRAND.text },
  cardDescription: { fontSize: 13, lineHeight: 20, color: BRAND.textMuted },
  cardNote: { fontSize: 12, color: BRAND.navy, fontWeight: "700" },
  loadingText: { fontSize: 12, color: BRAND.orange, fontWeight: "700" },
  resultCard: {
    backgroundColor: BRAND.surface,
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: BRAND.border,
    gap: 12,
  },
  resultHeader: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  resultCopy: { flex: 1, gap: 4 },
  resultTitle: { fontSize: 16, fontWeight: "800", color: BRAND.text },
  resultSubtitle: { fontSize: 12, color: BRAND.textMuted },
  pricePill: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: BRAND.surfaceMuted,
    borderWidth: 1,
    borderColor: BRAND.border,
  },
  priceText: { color: BRAND.navy, fontSize: 12, fontWeight: "800" },
  resultMetrics: { flexDirection: "row", gap: 8 },
  metricChip: {
    flex: 1,
    borderRadius: 14,
    padding: 10,
    backgroundColor: "#F7F9FC",
    borderWidth: 1,
    borderColor: BRAND.border,
    gap: 3,
  },
  metricChipLabel: { color: BRAND.textMuted, fontSize: 10, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
  metricChipValue: { color: BRAND.text, fontSize: 12, fontWeight: "800" },
  actionButton: {
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: BRAND.navy,
  },
  actionText: { color: "#FFFFFF", fontSize: 12, fontWeight: "800" },
});


