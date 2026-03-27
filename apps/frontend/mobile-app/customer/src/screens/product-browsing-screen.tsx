import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";

import { saveCartRequest, searchProducts } from "../lib/api-client";
import { useAuthStore } from "../store/auth-store";
import { useCartStore } from "../store/cart-store";
import { useTenantStore } from "../store/tenant-store";

const DEMO_PRODUCTS = [
  { id: "demo-milk", name: "Demo Fresh Milk", price: 90, badge: "Starter" },
  { id: "demo-bread", name: "Demo Brown Bread", price: 60, badge: "Daily" },
  { id: "demo-rice", name: "Demo Premium Rice 5kg", price: 620, badge: "Cart Test" },
];

export function ProductBrowsingScreen() {
  const navigation = useNavigation();
  const addItem = useCartStore((state) => state.addItem);
  const items = useCartStore((state) => state.items);
  const guestToken = useCartStore((state) => state.guestToken);
  const setGuestToken = useCartStore((state) => state.setGuestToken);
  const setItems = useCartStore((state) => state.setItems);
  const accessToken = useAuthStore((state) => state.accessToken);
  const selectedShop = useTenantStore((state) => state.shop);
  const [products, setProducts] = useState<Array<{ id: string; name: string; price: number; badge?: string }>>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      if (!selectedShop) return;
      setLoading(true);
      try {
        const response = await searchProducts({ shopId: selectedShop.id });
        if (!active) return;
        const list =
          response.data?.map((item, index) => ({
            id: String(item._id || item.id || ""),
            name: String(item.name || ""),
            price: Number(item.price || 0),
            badge: index === 0 ? "Popular" : undefined,
          })) || [];
        setProducts(list.filter((item) => item.id));
      } catch {
        if (!active) return;
        setProducts([]);
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [selectedShop]);

  const visibleProducts = useMemo(
    () => (products.length ? products : DEMO_PRODUCTS.map((item) => ({ ...item, badge: `${item.badge} Demo` }))),
    [products]
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.heroCard}>
          <View>
            <Text style={styles.title}>Browse products</Text>
            <Text style={styles.subtitle}>Clear add-to-cart flow with live or fallback demo items.</Text>
          </View>
          <Pressable style={styles.cartButton} onPress={() => navigation.navigate("Cart" as never)}>
            <Text style={styles.cartButtonText}>Open cart ({items.length})</Text>
          </Pressable>
        </View>

        {!selectedShop ? (
          <Pressable style={styles.noticeCard} onPress={() => navigation.navigate("ShopSelect" as never)}>
            <Text style={styles.noticeTitle}>Select a shop first</Text>
            <Text style={styles.noticeSubtitle}>Tap here to choose a storefront before adding items.</Text>
          </Pressable>
        ) : null}

        {loading ? <Text style={styles.helperText}>Loading products from the backend...</Text> : null}
        {!products.length ? <Text style={styles.helperText}>Showing fallback products so the cart flow stays understandable.</Text> : null}

        {visibleProducts.map((item, index) => (
          <View key={item.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.productMeta}>
                <Text style={styles.cardTitle}>{item.name}</Text>
                <Text style={styles.cardSubtitle}>{selectedShop?.name || "Demo storefront"}</Text>
              </View>
              <Text style={styles.badge}>{item.badge || `Pick ${index + 1}`}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.price}>{item.price} BDT</Text>
              <Pressable
                style={styles.actionButton}
                onPress={async () => {
                  if (!selectedShop) {
                    navigation.navigate("ShopSelect" as never);
                    return;
                  }
                  const nextItems = (() => {
                    const existing = items.find((entry) => entry.id === item.id);
                    if (existing) {
                      return items.map((entry) => (entry.id === item.id ? { ...entry, quantity: entry.quantity + 1 } : entry));
                    }
                    return [
                      ...items,
                      {
                        id: item.id,
                        productId: item.id,
                        name: item.name,
                        price: item.price,
                        shopId: selectedShop.id,
                        shop: selectedShop.name,
                        quantity: 1,
                      },
                    ];
                  })();

                  addItem({
                    id: item.id,
                    productId: item.id,
                    name: item.name,
                    price: item.price,
                    shopId: selectedShop.id,
                    shop: selectedShop.name,
                  });

                  try {
                    const response = await saveCartRequest({
                      shopId: selectedShop.id,
                      items: nextItems.map((entry) => ({
                        productId: entry.productId,
                        quantity: entry.quantity,
                        name: entry.name,
                        price: entry.price,
                      })),
                      token: accessToken,
                      cartToken: guestToken,
                    });
                    if (response.guestToken) {
                      setGuestToken(response.guestToken);
                    }
                    if (response.data?.items?.length) {
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
                  } catch {
                    // Keep local cart working even if sync is delayed.
                  } finally {
                    navigation.navigate("Cart" as never);
                  }
                }}
              >
                <Text style={styles.actionText}>Add to cart</Text>
              </Pressable>
            </View>
          </View>
        ))}

        <Pressable style={styles.searchButton} onPress={() => navigation.navigate("SearchResults" as never)}>
          <Text style={styles.searchText}>Search more products</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f8f4ef" },
  container: { padding: 16, gap: 16 },
  heroCard: {
    backgroundColor: "#111827",
    borderRadius: 22,
    padding: 18,
    gap: 14,
  },
  title: { fontSize: 22, fontWeight: "700", color: "#ffffff" },
  subtitle: { fontSize: 13, color: "#d1d5db" },
  cartButton: {
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "#f97316",
  },
  cartButtonText: { color: "#ffffff", fontSize: 12, fontWeight: "700" },
  helperText: { fontSize: 12, color: "#9a3412", fontWeight: "600" },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    gap: 12,
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  productMeta: { flex: 1, gap: 4 },
  cardTitle: { fontSize: 15, fontWeight: "600", color: "#111827" },
  cardSubtitle: { fontSize: 12, color: "#6b7280" },
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#fff7ed",
    color: "#c2410c",
    fontSize: 11,
    fontWeight: "700",
  },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  price: { fontSize: 15, color: "#111827", fontWeight: "700" },
  actionButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "#111827",
  },
  actionText: { color: "#ffffff", fontSize: 12, fontWeight: "700" },
  searchButton: {
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#d1d5db",
    backgroundColor: "#ffffff",
  },
  searchText: { fontSize: 13, fontWeight: "600", color: "#111827" },
  noticeCard: {
    backgroundColor: "#fff7ed",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#fed7aa",
    gap: 6,
  },
  noticeTitle: { fontSize: 14, fontWeight: "600", color: "#c2410c" },
  noticeSubtitle: { fontSize: 12, color: "#9a3412" },
});
