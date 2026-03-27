import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";

import { listPublicShops, saveCartRequest, searchProducts } from "../lib/api-client";
import { useAuthStore } from "../store/auth-store";
import { useCartStore } from "../store/cart-store";
import { useTenantStore } from "../store/tenant-store";

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
  const [status, setStatus] = useState<string | null>("Loading product results...");

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
          setStatus("Live shop not ready, showing starter search results.");
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
          setStatus("No live products found, showing starter results.");
        }
      } catch {
        if (!active) return;
        setResults(DEMO_RESULTS);
        setStatus("Search sync delayed, showing starter results.");
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.heroRow}>
          <View>
            <Text style={styles.title}>Search results</Text>
            {status ? <Text style={styles.cardSubtitle}>{status}</Text> : null}
          </View>
          <Pressable style={styles.cartButton} onPress={() => navigation.navigate("Cart" as never)}>
            <Text style={styles.cartButtonText}>Cart ({items.length})</Text>
          </Pressable>
        </View>
        {loading ? <Text style={styles.cardSubtitle}>Loading results...</Text> : null}
        {visibleResults.map((item) => (
          <View key={item.id} style={styles.card}>
            <Text style={styles.cardTitle}>{item.name}</Text>
            <Text style={styles.cardSubtitle}>{item.price} BDT</Text>
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
  safeArea: { flex: 1, backgroundColor: "#f8f4ef" },
  container: { padding: 16, gap: 16 },
  heroRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 12 },
  title: { fontSize: 20, fontWeight: "700", color: "#1f2937" },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    gap: 8,
  },
  cardTitle: { fontSize: 15, fontWeight: "600", color: "#111827" },
  cardSubtitle: { fontSize: 12, color: "#6b7280" },
  cartButton: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "#111827",
  },
  cartButtonText: { color: "#ffffff", fontSize: 12, fontWeight: "600" },
  actionButton: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: "#111827",
  },
  actionText: { color: "#ffffff", fontSize: 12, fontWeight: "600" },
});
