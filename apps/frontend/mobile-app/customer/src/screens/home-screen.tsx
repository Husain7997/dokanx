import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";

import { listLocations, listPublicShops, searchProducts, searchSuggestions } from "@/lib/api-client";
import { useCartStore } from "@/store/cart-store";
import { useTenantStore } from "@/store/tenant-store";

type ShopOption = {
  id: string;
  name: string;
  domain?: string | null;
  slug?: string | null;
};

type LocationRow = {
  _id?: string;
  name?: string;
  city?: string;
  country?: string;
  address?: string;
  shopId?: string;
  coordinates?: { coordinates?: number[] };
};

export function HomeScreen() {
  const navigation = useNavigation();
  const setShop = useTenantStore((state) => state.setShop);
  const selectedShop = useTenantStore((state) => state.shop);
  const clearCart = useCartStore((state) => state.clear);
  const [shops, setShops] = useState<ShopOption[]>([]);
  const [locations, setLocations] = useState<LocationRow[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [products, setProducts] = useState<Array<{ id: string; name: string; price: number }>>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDistrict, setSelectedDistrict] = useState("all");
  const [selectedMarket, setSelectedMarket] = useState("all");

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const [shopsResponse, locationsResponse] = await Promise.all([
          listPublicShops(),
          listLocations(),
        ]);
        if (!active) return;
        const list =
          shopsResponse.data?.map((shop) => ({
            id: String(shop._id || shop.id || ""),
            name: String(shop.name || "Shop"),
            domain: shop.domain ? String(shop.domain) : null,
            slug: shop.slug ? String(shop.slug) : null,
          })) || [];
        setShops(list.filter((shop) => shop.id));
        setLocations((locationsResponse.data || []) as LocationRow[]);
      } catch {
        if (!active) return;
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    async function loadProducts() {
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
        setProducts(list.filter((item) => item.id).slice(0, 6));
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadProducts();
    return () => {
      active = false;
    };
  }, [selectedShop]);

  useEffect(() => {
    let active = true;
    if (!searchQuery.trim()) {
      setSuggestions([]);
      return;
    }
    const handle = setTimeout(async () => {
      try {
        const response = await searchSuggestions(searchQuery.trim());
        if (!active) return;
        const list =
          response.data?.map((item) => String(item.name || item.title || item.id || "")).filter(Boolean) || [];
        setSuggestions(list.slice(0, 6));
      } catch {
        if (!active) return;
        setSuggestions([]);
      }
    }, 250);
    return () => {
      active = false;
      clearTimeout(handle);
    };
  }, [searchQuery]);

  const districts = useMemo(() => uniqueValues(locations, "city"), [locations]);
  const markets = useMemo(() => uniqueValues(locations, "name"), [locations]);
  const shopLocationMap = useMemo(() => {
    const map = new Map<string, { district?: string; market?: string }>();
    locations.forEach((location) => {
      if (!location.shopId) return;
      map.set(location.shopId, {
        district: location.city || "",
        market: location.name || "",
      });
    });
    return map;
  }, [locations]);

  const filteredShops = useMemo(() => {
    return shops.filter((shop) => {
      const location = shopLocationMap.get(shop.id);
      if (selectedDistrict !== "all" && location?.district !== selectedDistrict) return false;
      if (selectedMarket !== "all" && location?.market !== selectedMarket) return false;
      return true;
    });
  }, [shops, shopLocationMap, selectedDistrict, selectedMarket]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>DokanX Marketplace</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Location selector</Text>
          <Text style={styles.cardSubtitle}>
            Bangladesh • {selectedDistrict === "all" ? "Select district" : selectedDistrict} • {selectedMarket === "all" ? "Market" : selectedMarket}
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            <Pressable
              style={[styles.chip, selectedDistrict === "all" ? styles.chipActive : null]}
              onPress={() => setSelectedDistrict("all")}
            >
              <Text style={[styles.chipText, selectedDistrict === "all" ? styles.chipTextActive : null]}>All districts</Text>
            </Pressable>
            {districts.map((value) => (
              <Pressable
                key={value}
                style={[styles.chip, selectedDistrict === value ? styles.chipActive : null]}
                onPress={() => setSelectedDistrict(value)}
              >
                <Text style={[styles.chipText, selectedDistrict === value ? styles.chipTextActive : null]}>{value}</Text>
              </Pressable>
            ))}
          </ScrollView>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            <Pressable
              style={[styles.chip, selectedMarket === "all" ? styles.chipActive : null]}
              onPress={() => setSelectedMarket("all")}
            >
              <Text style={[styles.chipText, selectedMarket === "all" ? styles.chipTextActive : null]}>All markets</Text>
            </Pressable>
            {markets.map((value) => (
              <Pressable
                key={value}
                style={[styles.chip, selectedMarket === value ? styles.chipActive : null]}
                onPress={() => setSelectedMarket(value)}
              >
                <Text style={[styles.chipText, selectedMarket === value ? styles.chipTextActive : null]}>{value}</Text>
              </Pressable>
            ))}
          </ScrollView>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {filteredShops.map((shop) => (
              <Pressable
                key={shop.id}
                style={[styles.chip, selectedShop?.id === shop.id ? styles.chipActive : null]}
                onPress={() => {
                  clearCart();
                  setShop(shop);
                }}
              >
                <Text style={[styles.chipText, selectedShop?.id === shop.id ? styles.chipTextActive : null]}>
                  {shop.name}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Search</Text>
          <TextInput
            style={styles.input}
            placeholder="Search products, shops, brands"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {suggestions.length ? (
            <View style={styles.suggestionList}>
              {suggestions.map((item) => (
                <Pressable
                  key={item}
                  style={styles.suggestionRow}
                  onPress={() => {
                    setSearchQuery(item);
                    navigation.navigate("SearchResults" as never);
                  }}
                >
                  <Text style={styles.suggestionText}>{item}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Map discovery</Text>
          <Text style={styles.cardSubtitle}>Nearby shops within delivery radius</Text>
          <View style={styles.mapPreview}>
            {filteredShops.slice(0, 6).map((shop, index) => (
              <View key={shop.id} style={[styles.mapPin, { left: 20 + index * 24, top: 40 + (index % 3) * 30 }]} />
            ))}
          </View>
          <Pressable style={styles.secondaryButton} onPress={() => navigation.navigate("MapDiscovery" as never)}>
            <Text style={styles.secondaryText}>Open map</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Categories</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {["Groceries", "Electronics", "Fashion", "Medicine", "Restaurants", "Hardware", "Books"].map((item) => (
              <View key={item} style={styles.categoryPill}>
                <Text style={styles.categoryText}>{item}</Text>
              </View>
            ))}
          </ScrollView>
        </View>

        <View style={styles.bannerRow}>
          {["Flash Sale", "New Stores", "Electronics Fest"].map((item) => (
            <View key={item} style={styles.bannerCard}>
              <Text style={styles.bannerTitle}>{item}</Text>
              <Text style={styles.bannerSubtitle}>Limited time offers</Text>
            </View>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Flash deals</Text>
          <Text style={styles.cardSubtitle}>Ends in 02:45:12</Text>
          {products.slice(0, 3).map((item) => (
            <View key={item.id} style={styles.dealRow}>
              <Text style={styles.dealTitle}>{item.name}</Text>
              <Text style={styles.dealPrice}>{item.price} BDT</Text>
            </View>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Popular products</Text>
          {loading ? <Text style={styles.cardSubtitle}>Loading products...</Text> : null}
          {products.map((item) => (
            <View key={item.id} style={styles.productRow}>
              <View>
                <Text style={styles.productTitle}>{item.name}</Text>
                <Text style={styles.productSubtitle}>{selectedShop?.name || "Shop"}</Text>
              </View>
              <Pressable style={styles.actionButton} onPress={() => navigation.navigate("Browse" as never)}>
                <Text style={styles.actionText}>{item.price} BDT</Text>
              </Pressable>
            </View>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Nearby shops</Text>
          {filteredShops.slice(0, 4).map((shop, index) => (
            <View key={shop.id} style={styles.shopRow}>
              <View>
                <Text style={styles.productTitle}>{shop.name}</Text>
                <Text style={styles.productSubtitle}>{(0.6 + index * 0.2).toFixed(1)} km away</Text>
              </View>
              <Text style={styles.shopRating}>⭐ 4.{6 + index}</Text>
            </View>
          ))}
        </View>

        <View style={styles.footerNav}>
          {[
            ["Home", "Home"],
            ["Search", "SearchResults"],
            ["Cart", "Cart"],
            ["Orders", "OrderTracking"],
            ["Account", "Auth"],
          ].map(([label, screen]) => (
            <Pressable key={label} style={styles.footerItem} onPress={() => navigation.navigate(screen as never)}>
              <Text style={styles.footerText}>{label}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function uniqueValues(rows: LocationRow[], key: keyof LocationRow) {
  const values = rows
    .map((row) => row[key])
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0);
  return Array.from(new Set(values)).sort();
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f8f4ef" },
  container: { padding: 16, gap: 16 },
  title: { fontSize: 22, fontWeight: "700", color: "#111827" },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    gap: 12,
  },
  cardTitle: { fontSize: 15, fontWeight: "600", color: "#111827" },
  cardSubtitle: { fontSize: 12, color: "#6b7280" },
  chipRow: { gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "#f9fafb",
  },
  chipActive: { backgroundColor: "#111827", borderColor: "#111827" },
  chipText: { fontSize: 12, color: "#111827" },
  chipTextActive: { color: "#ffffff" },
  input: {
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    borderColor: "#e5e7eb",
    borderWidth: 1,
  },
  suggestionList: { borderTopWidth: 1, borderTopColor: "#e5e7eb" },
  suggestionRow: { paddingVertical: 8 },
  suggestionText: { fontSize: 13, color: "#111827" },
  mapPreview: {
    height: 140,
    borderRadius: 16,
    backgroundColor: "#eef2ff",
    borderWidth: 1,
    borderColor: "#c7d2fe",
    position: "relative",
  },
  mapPin: {
    position: "absolute",
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: "#1d4ed8",
  },
  secondaryButton: {
    marginTop: 10,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#d1d5db",
  },
  secondaryText: { fontSize: 12, fontWeight: "600", color: "#111827" },
  categoryPill: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#111827",
  },
  categoryText: { fontSize: 12, color: "#ffffff" },
  bannerRow: { flexDirection: "row", gap: 8 },
  bannerCard: {
    flex: 1,
    backgroundColor: "#111827",
    borderRadius: 16,
    padding: 12,
    gap: 4,
  },
  bannerTitle: { color: "#ffffff", fontWeight: "600", fontSize: 12 },
  bannerSubtitle: { color: "#e5e7eb", fontSize: 10 },
  dealRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  dealTitle: { fontSize: 13, color: "#111827" },
  dealPrice: { fontSize: 13, fontWeight: "600", color: "#111827" },
  productRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  productTitle: { fontSize: 14, fontWeight: "600", color: "#111827" },
  productSubtitle: { fontSize: 11, color: "#6b7280" },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: "#111827",
  },
  actionText: { color: "#ffffff", fontSize: 12, fontWeight: "600" },
  shopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  shopRating: { fontSize: 12, color: "#f59e0b" },
  footerNav: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
  footerItem: { padding: 6 },
  footerText: { fontSize: 12, color: "#111827", fontWeight: "600" },
});
