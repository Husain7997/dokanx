import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";

import { saveCartRequest, searchProducts } from "../lib/api-client";
import { DokanXLogo } from "../components/dokanx-logo";
import { useAuthStore } from "../store/auth-store";
import { useCartStore } from "../store/cart-store";
import { useTenantStore } from "../store/tenant-store";

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

  const stats = useMemo(
    () => [
      { label: "Shop", value: selectedShop?.name || "Not selected" },
      { label: "Visible", value: String(visibleProducts.length) },
      { label: "Cart lines", value: String(items.length) },
    ],
    [items.length, selectedShop?.name, visibleProducts.length],
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <DokanXLogo variant="full" size="md" />
            <Pressable style={styles.cartButton} onPress={() => navigation.navigate("Cart" as never)}>
              <Text style={styles.cartButtonText}>Open cart ({items.length})</Text>
            </Pressable>
          </View>
          <Text style={styles.kicker}>Customer browse</Text>
          <Text style={styles.title}>Browse products with a cleaner add-to-cart flow.</Text>
          <Text style={styles.subtitle}>Pick a shop, scan the shelf mentally, and move items into the cart without losing track of what is already selected.</Text>
          <View style={styles.statsRow}>
            {stats.map((item) => (
              <View key={item.label} style={styles.statCard}>
                <Text style={styles.statLabel}>{item.label}</Text>
                <Text style={styles.statValue}>{item.value}</Text>
              </View>
            ))}
          </View>
        </View>

        {!selectedShop ? (
          <Pressable style={styles.noticeCard} onPress={() => navigation.navigate("ShopSelect" as never)}>
            <Text style={styles.noticeTitle}>Select a shop first</Text>
            <Text style={styles.noticeSubtitle}>Choose a storefront before adding items so pricing and cart sync stay correct.</Text>
          </Pressable>
        ) : null}

        {loading ? <Text style={styles.helperText}>Loading live products...</Text> : null}
        {!products.length ? <Text style={styles.helperText}>Showing browse-ready products so you can keep building the cart while live inventory catches up.</Text> : null}

        {visibleProducts.map((item, index) => (
          <View key={item.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.productMeta}>
                <Text style={styles.cardTitle}>{item.name}</Text>
                <Text style={styles.cardSubtitle}>{selectedShop?.name || "Selected storefront"}</Text>
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
  safeArea: { flex: 1, backgroundColor: BRAND.screen },
  container: { padding: 16, gap: 16 },
  heroCard: {
    backgroundColor: BRAND.surface,
    borderRadius: 24,
    padding: 18,
    gap: 14,
    borderWidth: 1,
    borderColor: BRAND.border,
  },
  heroTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  kicker: { fontSize: 12, fontWeight: "800", letterSpacing: 1.2, color: BRAND.orange, textTransform: "uppercase" },
  title: { fontSize: 24, fontWeight: "700", color: BRAND.text },
  subtitle: { fontSize: 13, color: BRAND.muted, lineHeight: 20 },
  statsRow: { flexDirection: "row", gap: 10 },
  statCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BRAND.border,
    backgroundColor: BRAND.tint,
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 4,
  },
  statLabel: { fontSize: 11, fontWeight: "800", color: BRAND.muted, textTransform: "uppercase" },
  statValue: { fontSize: 13, fontWeight: "700", color: BRAND.text },
  cartButton: {
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: BRAND.navy,
  },
  cartButtonText: { color: "#ffffff", fontSize: 12, fontWeight: "700" },
  helperText: { fontSize: 12, color: BRAND.orange, fontWeight: "600" },
  card: {
    backgroundColor: BRAND.surface,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: BRAND.border,
    gap: 12,
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  productMeta: { flex: 1, gap: 4 },
  cardTitle: { fontSize: 15, fontWeight: "600", color: BRAND.text },
  cardSubtitle: { fontSize: 12, color: BRAND.muted },
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#FFF4E8",
    color: "#C2410C",
    fontSize: 11,
    fontWeight: "700",
  },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  price: { fontSize: 15, color: BRAND.text, fontWeight: "700" },
  actionButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: BRAND.navy,
  },
  actionText: { color: "#ffffff", fontSize: 12, fontWeight: "700" },
  searchButton: {
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BRAND.border,
    backgroundColor: BRAND.surface,
  },
  searchText: { fontSize: 13, fontWeight: "600", color: BRAND.text },
  noticeCard: {
    backgroundColor: "#FFF4E8",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#FED7AA",
    gap: 6,
  },
  noticeTitle: { fontSize: 14, fontWeight: "600", color: "#C2410C" },
  noticeSubtitle: { fontSize: 12, color: "#9A3412" },
});


