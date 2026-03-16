import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useEffect, useState } from "react";
import { useNavigation } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";

import { searchProducts } from "@/lib/api-client";
import { useCartStore } from "@/store/cart-store";
import { useTenantStore } from "@/store/tenant-store";

export function ProductBrowsingScreen() {
  const navigation = useNavigation();
  const addItem = useCartStore((state) => state.addItem);
  const selectedShop = useTenantStore((state) => state.shop);
  const [products, setProducts] = useState<Array<{ id: string; name: string; price: number }>>([]);
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
          response.data?.map((item) => ({
            id: String(item._id || item.id || ""),
            name: String(item.name || ""),
            price: Number(item.price || 0),
          })) || [];
        setProducts(list.filter((item) => item.id));
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [selectedShop]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Browse products</Text>
        {!selectedShop ? (
          <Pressable style={styles.noticeCard} onPress={() => navigation.navigate("ShopSelect" as never)}>
            <Text style={styles.noticeTitle}>Select a shop first</Text>
            <Text style={styles.noticeSubtitle}>Tap here to choose the storefront for this session.</Text>
          </Pressable>
        ) : null}
        {loading ? <Text style={styles.cardSubtitle}>Loading products...</Text> : null}
        {products.map((item) => (
          <View key={item.id} style={styles.card}>
            <Text style={styles.cardTitle}>{item.name}</Text>
            <Text style={styles.cardSubtitle}>{selectedShop?.name || "Shop"}</Text>
            <View style={styles.row}>
              <Text style={styles.price}>{item.price} BDT</Text>
              <Pressable
                style={styles.actionButton}
                onPress={() => {
                  if (!selectedShop) {
                    navigation.navigate("ShopSelect" as never);
                    return;
                  }
                  addItem({
                    id: item.id,
                    productId: item.id,
                    name: item.name,
                    price: item.price,
                    shopId: selectedShop.id,
                    shop: item.shop,
                  });
                  navigation.navigate("Cart" as never);
                }}
              >
                <Text style={styles.actionText}>Add to cart</Text>
              </Pressable>
            </View>
          </View>
        ))}
        <Pressable style={styles.searchButton} onPress={() => navigation.navigate("SearchResults" as never)}>
          <Text style={styles.searchText}>Search products</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f8f4ef" },
  container: { padding: 16, gap: 16 },
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
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  price: { fontSize: 13, color: "#111827", fontWeight: "600" },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: "#111827",
  },
  actionText: { color: "#ffffff", fontSize: 12, fontWeight: "600" },
  searchButton: {
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#d1d5db",
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
