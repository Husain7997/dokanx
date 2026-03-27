import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, PanResponder, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  getCustomerOverviewRequest,
  getMyCreditRequest,
  getMyWalletRequest,
  getProfileRequest,
  payCreditDueRequest,
  getRecommendationsRequest,
  getTrendingRequest,
  listLocations,
  listPublicShops,
  searchProducts,
  searchSuggestions,
} from "../lib/api-client";
import { useAuthStore } from "../store/auth-store";
import { useCartStore } from "../store/cart-store";
import { useTenantStore } from "../store/tenant-store";

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
  const cartItems = useCartStore((state) => state.items);
  const accessToken = useAuthStore((state) => state.accessToken);
  const [shops, setShops] = useState<ShopOption[]>([]);
  const [locations, setLocations] = useState<LocationRow[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [products, setProducts] = useState<Array<{ id: string; name: string; price: number }>>([]);
  const [recommendedProducts, setRecommendedProducts] = useState<Array<{ id: string; name: string; price: number }>>([]);
  const [trendingProducts, setTrendingProducts] = useState<Array<{ id: string; name: string; price: number }>>([]);
  const [summary, setSummary] = useState<{ totalDue: number; walletIncome: number; orders: number; claims: number }>({
    totalDue: 0,
    walletIncome: 0,
    orders: 0,
    claims: 0,
  });
  const [walletBalance, setWalletBalance] = useState(0);
  const [walletTransactions, setWalletTransactions] = useState<Array<{ id: string; amount: number; orderId?: string; note?: string }>>([]);
  const [creditSnapshot, setCreditSnapshot] = useState<{
    totalDue?: number;
    perShopDue?: Array<{ shopId?: string; amount?: number }>;
    sales?: Array<Record<string, unknown>>;
    paymentHistory?: Array<Record<string, unknown>>;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedDistrict, setSelectedDistrict] = useState("all");
  const [selectedMarket, setSelectedMarket] = useState("all");
  const [showMapPreview, setShowMapPreview] = useState(false);
  const mapButtonPosition = useRef(new Animated.ValueXY({ x: 232, y: 540 })).current;

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const [shopsResponse, locationsResponse] = await Promise.all([listPublicShops(), listLocations()]);
        if (!active) return;
        const list =
          shopsResponse.data?.map((shop) => ({
            id: String(shop._id || shop.id || ""),
            name: String(shop.name || "Shop"),
            domain: shop.domain ? String(shop.domain) : null,
            slug: shop.slug ? String(shop.slug) : null,
          })) || [];
        const nextShops = list.filter((shop) => shop.id);
        setShops(nextShops);
        if (!selectedShop && nextShops[0]) {
          setShop(nextShops[0]);
        }
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
    async function loadCustomerSignals() {
      try {
        const [recommendationResponse, trendingResponse] = await Promise.all([
          getRecommendationsRequest({ limit: "6" }).catch(() => null),
          getTrendingRequest({ limit: "6" }).catch(() => null),
        ]);
        if (!active) return;
        const recommendationRows =
          ((recommendationResponse?.data as { recommended_products?: Array<Record<string, unknown>> } | undefined)
            ?.recommended_products || [])
            .map((item) => ({
              id: String(item._id || item.id || ""),
              name: String(item.name || ""),
              price: Number(item.price || 0),
            }))
            .filter((item) => item.id);
        const trendingRows =
          (trendingResponse?.data || [])
            .map((item) => ({
              id: String(item._id || item.id || ""),
              name: String(item.name || ""),
              price: Number(item.price || 0),
            }))
            .filter((item) => item.id);
        setRecommendedProducts(recommendationRows);
        setTrendingProducts(trendingRows);

        if (!accessToken) return;
        const [profile, walletResponse, creditResponse] = await Promise.all([
          getProfileRequest(accessToken).catch(() => null),
          getMyWalletRequest(accessToken).catch(() => null),
          getMyCreditRequest(accessToken).catch(() => null),
        ]);
        const globalCustomerId = String(profile?.user?.globalCustomerId || "");
        setWalletBalance(Number(walletResponse?.data?.balance?.cash || 0));
        setCreditSnapshot(creditResponse?.data || null);
        setWalletTransactions(
          Array.isArray(walletResponse?.data?.lastTransactions)
            ? walletResponse.data.lastTransactions.slice(0, 4).map((row, index) => ({
                id: String(row._id || index),
                amount: Number(row.amount || 0),
                orderId: typeof row.orderId === "string" ? row.orderId : undefined,
                note: typeof row.note === "string" ? row.note : undefined,
              }))
            : []
        );
        if (!globalCustomerId) return;
        const overview = await getCustomerOverviewRequest(accessToken, globalCustomerId).catch(() => null);
        if (!active) return;
        const data = overview?.data as
          | { walletSummary?: { totalDue?: number; totalIncome?: number }; orders?: unknown[]; claims?: unknown[] }
          | undefined;
        setSummary({
          totalDue: Number(data?.walletSummary?.totalDue || 0),
          walletIncome: Number(data?.walletSummary?.totalIncome || 0),
          orders: Array.isArray(data?.orders) ? data.orders.length : 0,
          claims: Array.isArray(data?.claims) ? data.claims.length : 0,
        });
      } catch {
        if (!active) return;
      }
    }
    void loadCustomerSignals();
    return () => {
      active = false;
    };
  }, [accessToken]);

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
        const list = response.data?.map((item) => String(item.name || item.title || item.id || "")).filter(Boolean) || [];
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

  const cartCount = useMemo(
    () => cartItems.reduce((total, item) => total + Math.max(1, Number(item.quantity || 1)), 0),
    [cartItems]
  );

  const mapButtonResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => mapButtonPosition.extractOffset(),
        onPanResponderMove: Animated.event([null, { dx: mapButtonPosition.x, dy: mapButtonPosition.y }], {
          useNativeDriver: false,
        }),
        onPanResponderRelease: () => mapButtonPosition.flattenOffset(),
      }),
    [mapButtonPosition]
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.heroCard}>
          <View style={styles.heroRow}>
            <View style={styles.heroCopy}>
              <Text style={styles.heroTitle}>DokanX Marketplace</Text>
              <Text style={styles.heroSubtitle}>{selectedShop?.name || "Select a nearby shop and start adding to cart."}</Text>
            </View>
            <Pressable style={styles.heroOutlineButton} onPress={() => navigation.navigate("Cart" as never)}>
              <Text style={styles.heroOutlineText}>Cart {cartCount}</Text>
            </Pressable>
          </View>

          <View style={styles.topNavRow}>
            <Pressable style={styles.topNavCard} onPress={() => navigation.navigate("Cart" as never)}>
              <Text style={styles.topNavLabel}>Cart</Text>
              <Text style={styles.topNavValue}>{cartCount} items</Text>
            </Pressable>
            <Pressable style={styles.topNavCard} onPress={() => setShowMapPreview((current) => !current)}>
              <Text style={styles.topNavLabel}>Map</Text>
              <Text style={styles.topNavValue}>{showMapPreview ? "Hide" : "Open"}</Text>
            </Pressable>
            <View style={styles.topNavCard}>
              <Text style={styles.topNavLabel}>Wallet</Text>
              <Text style={styles.topNavValue}>{walletBalance || summary.walletIncome} BDT</Text>
            </View>
            <View style={styles.topNavCard}>
              <Text style={styles.topNavLabel}>Baki</Text>
              <Text style={styles.topNavValue}>{Number(creditSnapshot?.totalDue || summary.totalDue)} BDT</Text>
            </View>
          </View>
        </View>

        <View style={styles.metricRow}>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Wallet</Text>
            <Text style={styles.metricValue}>{walletBalance || summary.walletIncome} BDT</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Due</Text>
            <Text style={styles.metricValue}>{Number(creditSnapshot?.totalDue || summary.totalDue)} BDT</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Claims</Text>
            <Text style={styles.metricValue}>{summary.claims}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Location selector</Text>
          <Text style={styles.cardSubtitle}>Bangladesh • {selectedDistrict === "all" ? "Select district" : selectedDistrict} • {selectedMarket === "all" ? "Market" : selectedMarket}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            <Pressable style={[styles.chip, selectedDistrict === "all" ? styles.chipActive : null]} onPress={() => setSelectedDistrict("all")}>
              <Text style={[styles.chipText, selectedDistrict === "all" ? styles.chipTextActive : null]}>All districts</Text>
            </Pressable>
            {districts.map((value) => (
              <Pressable key={value} style={[styles.chip, selectedDistrict === value ? styles.chipActive : null]} onPress={() => setSelectedDistrict(value)}>
                <Text style={[styles.chipText, selectedDistrict === value ? styles.chipTextActive : null]}>{value}</Text>
              </Pressable>
            ))}
          </ScrollView>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            <Pressable style={[styles.chip, selectedMarket === "all" ? styles.chipActive : null]} onPress={() => setSelectedMarket("all")}>
              <Text style={[styles.chipText, selectedMarket === "all" ? styles.chipTextActive : null]}>All markets</Text>
            </Pressable>
            {markets.map((value) => (
              <Pressable key={value} style={[styles.chip, selectedMarket === value ? styles.chipActive : null]} onPress={() => setSelectedMarket(value)}>
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
                <Text style={[styles.chipText, selectedShop?.id === shop.id ? styles.chipTextActive : null]}>{shop.name}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Wallet activity</Text>
          <Text style={styles.cardSubtitle}>Recent customer wallet payments and debits</Text>
          {walletTransactions.length ? walletTransactions.map((item) => (
            <View key={item.id} style={styles.productRow}>
              <View>
                <Text style={styles.productTitle}>{item.orderId ? `Order ${item.orderId}` : "Wallet transaction"}</Text>
                <Text style={styles.productSubtitle}>{item.note || "Customer wallet"}</Text>
              </View>
              <Text style={styles.dealPrice}>{item.amount} BDT</Text>
            </View>
          )) : <Text style={styles.cardSubtitle}>No wallet activity yet.</Text>}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Pay Later (Baki)</Text>
          <Text style={styles.cardSubtitle}>Shop-wise due balance and repayment history</Text>
          {(creditSnapshot?.sales || []).length ? (
            (creditSnapshot?.sales || []).slice(0, 4).map((item, index) => (
              <View key={`${String(item._id || index)}`} style={styles.creditSaleCard}>
                <View>
                  <Text style={styles.productTitle}>Shop {String(item.shopId || "").slice(-6)}</Text>
                  <Text style={styles.productSubtitle}>Outstanding due</Text>
                </View>
                <Text style={styles.dealPrice}>{Number(item.outstandingAmount || 0)} BDT</Text>
                <View style={styles.walletActionRow}>
                  <Pressable
                    style={styles.walletActionButton}
                    onPress={async () => {
                      if (!accessToken) return;
                      const paymentAmount = Number(item.outstandingAmount || 0);
                      const result = await payCreditDueRequest(accessToken, {
                        creditSaleId: String(item._id || ""),
                        amount: paymentAmount,
                        referenceId: `credit-wallet-${Date.now()}`,
                        paymentMode: "WALLET",
                        metadata: { source: "mobile-home-credit" },
                      }).catch(() => null);
                      if (!result) return;
                      setCreditSnapshot((current) => current ? ({
                        ...current,
                        totalDue: Math.max(0, Number(current.totalDue || 0) - paymentAmount),
                        sales: (current.sales || []).map((sale) =>
                          String(sale._id || "") === String(item._id || "")
                            ? { ...sale, outstandingAmount: 0, status: "PAID" }
                            : sale
                        ),
                      }) : current);
                    }}
                  >
                    <Text style={styles.walletActionText}>Pay by Wallet</Text>
                  </Pressable>
                  <Pressable
                    style={styles.walletActionButton}
                    onPress={async () => {
                      if (!accessToken) return;
                      const paymentAmount = Number(item.outstandingAmount || 0);
                      const result = await payCreditDueRequest(accessToken, {
                        creditSaleId: String(item._id || ""),
                        amount: paymentAmount,
                        referenceId: `credit-mobile-${Date.now()}`,
                        paymentMode: "ONLINE",
                        provider: "bkash",
                        metadata: { source: "mobile-home-credit", provider: "bkash" },
                      }).catch(() => null);
                      if (!result) return;
                      setCreditSnapshot((current) => current ? ({
                        ...current,
                        totalDue: Math.max(0, Number(current.totalDue || 0) - paymentAmount),
                        sales: (current.sales || []).map((sale) =>
                          String(sale._id || "") === String(item._id || "")
                            ? { ...sale, outstandingAmount: 0, status: "PAID" }
                            : sale
                        ),
                      }) : current);
                    }}
                  >
                    <Text style={styles.walletActionText}>Pay by Mobile Banking</Text>
                  </Pressable>
                </View>
              </View>
            ))
          ) : <Text style={styles.cardSubtitle}>No due balance right now.</Text>}
          {(creditSnapshot?.paymentHistory || []).slice(0, 3).map((item, index) => (
            <View key={`${String(item._id || index)}`} style={styles.productRow}>
              <View>
                <Text style={styles.productTitle}>Repayment</Text>
                <Text style={styles.productSubtitle}>{String(item.reference || item.type || "Credit payment")}</Text>
              </View>
              <Text style={styles.dealPrice}>{Number(item.amount || 0)} BDT</Text>
            </View>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Search</Text>
          <TextInput style={styles.input} placeholder="Search products, shops, brands" value={searchQuery} onChangeText={setSearchQuery} />
          {suggestions.length ? (
            <View style={styles.suggestionList}>
              {suggestions.map((item) => (
                <Pressable key={item} style={styles.suggestionRow} onPress={() => {
                  setSearchQuery(item);
                  navigation.navigate("SearchResults" as never);
                }}>
                  <Text style={styles.suggestionText}>{item}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}
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
          {(trendingProducts.length ? trendingProducts : products).slice(0, 3).map((item) => (
            <View key={item.id} style={styles.dealRow}>
              <Text style={styles.dealTitle}>{item.name}</Text>
              <Text style={styles.dealPrice}>{item.price} BDT</Text>
            </View>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Recommended for you</Text>
          {(recommendedProducts.length ? recommendedProducts : products).slice(0, 4).map((item) => (
            <View key={item.id} style={styles.productRow}>
              <View>
                <Text style={styles.productTitle}>{item.name}</Text>
                <Text style={styles.productSubtitle}>AI recommendation</Text>
              </View>
              <Pressable style={styles.actionButton} onPress={() => navigation.navigate("Browse" as never)}>
                <Text style={styles.actionText}>{item.price} BDT</Text>
              </Pressable>
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
              <Text style={styles.shopRating}>? 4.{6 + index}</Text>
            </View>
          ))}
        </View>

        <View style={styles.footerNav}>
          {[["Home", "Home"], ["Search", "SearchResults"], ["Cart", "Cart"], ["Orders", "OrderTracking"], ["Account", "Auth"]].map(([label, screen]) => (
            <Pressable key={label} style={styles.footerItem} onPress={() => navigation.navigate(screen as never)}>
              <Text style={styles.footerText}>{label}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      {showMapPreview ? (
        <View style={styles.mapOverlay}>
          <View style={styles.mapOverlayCard}>
            <View style={styles.mapOverlayHeader}>
              <View>
                <Text style={styles.cardTitle}>Map quick view</Text>
                <Text style={styles.cardSubtitle}>Drag the orange button anywhere and tap it again to close.</Text>
              </View>
              <Pressable style={styles.mapCloseButton} onPress={() => setShowMapPreview(false)}>
                <Text style={styles.mapCloseText}>Close</Text>
              </Pressable>
            </View>
            <View style={styles.mapPreview}>
              {filteredShops.slice(0, 6).map((shop, index) => (
                <View key={shop.id} style={[styles.mapPin, { left: 20 + index * 32, top: 28 + (index % 3) * 28 }]} />
              ))}
            </View>
            <Pressable style={styles.secondaryButton} onPress={() => navigation.navigate("MapDiscovery" as never)}>
              <Text style={styles.secondaryText}>Open full map</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      <Animated.View style={[styles.floatingMapToggle, { transform: [{ translateX: mapButtonPosition.x }, { translateY: mapButtonPosition.y }] }]} {...mapButtonResponder.panHandlers}>
        <Pressable style={styles.floatingMapButton} onPress={() => setShowMapPreview((current) => !current)}>
          <Text style={styles.floatingMapText}>{showMapPreview ? "Hide Map" : "Show Map"}</Text>
        </Pressable>
      </Animated.View>
    </SafeAreaView>
  );
}

function uniqueValues(rows: LocationRow[], key: keyof LocationRow) {
  const values = rows.map((row) => row[key]).filter((value): value is string => typeof value === "string" && value.trim().length > 0);
  return Array.from(new Set(values)).sort();
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f8f4ef" },
  container: { padding: 16, gap: 16, paddingBottom: 120 },
  heroCard: { backgroundColor: "#101828", borderRadius: 24, padding: 18, gap: 16 },
  heroRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 12 },
  heroCopy: { flex: 1, gap: 6 },
  heroTitle: { fontSize: 22, fontWeight: "700", color: "#ffffff" },
  heroSubtitle: { fontSize: 13, lineHeight: 18, color: "#d0d5dd" },
  heroOutlineButton: { borderRadius: 999, borderWidth: 1, borderColor: "#344054", paddingHorizontal: 14, paddingVertical: 10, backgroundColor: "#182230" },
  heroOutlineText: { fontSize: 12, fontWeight: "700", color: "#ffffff" },
  topNavRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  topNavCard: { width: "47%", borderRadius: 18, padding: 14, backgroundColor: "#ffffff", gap: 5 },
  topNavLabel: { fontSize: 11, color: "#667085", textTransform: "uppercase" },
  topNavValue: { fontSize: 14, fontWeight: "700", color: "#111827" },
  metricRow: { flexDirection: "row", gap: 8 },
  metricCard: { flex: 1, backgroundColor: "#ffffff", borderRadius: 18, padding: 14, borderWidth: 1, borderColor: "#e5e7eb", gap: 6 },
  metricLabel: { fontSize: 11, color: "#6b7280", textTransform: "uppercase" },
  metricValue: { fontSize: 16, fontWeight: "700", color: "#111827" },
  card: { backgroundColor: "#ffffff", borderRadius: 18, padding: 16, borderWidth: 1, borderColor: "#e5e7eb", gap: 12 },
  cardTitle: { fontSize: 15, fontWeight: "600", color: "#111827" },
  cardSubtitle: { fontSize: 12, color: "#6b7280" },
  chipRow: { gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: "#e5e7eb", backgroundColor: "#f9fafb" },
  chipActive: { backgroundColor: "#111827", borderColor: "#111827" },
  chipText: { fontSize: 12, color: "#111827" },
  chipTextActive: { color: "#ffffff" },
  input: { backgroundColor: "#f9fafb", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, borderColor: "#e5e7eb", borderWidth: 1 },
  suggestionList: { borderTopWidth: 1, borderTopColor: "#e5e7eb" },
  suggestionRow: { paddingVertical: 8 },
  suggestionText: { fontSize: 13, color: "#111827" },
  mapPreview: { height: 140, borderRadius: 16, backgroundColor: "#eef2ff", borderWidth: 1, borderColor: "#c7d2fe", position: "relative" },
  mapPin: { position: "absolute", width: 10, height: 10, borderRadius: 999, backgroundColor: "#1d4ed8" },
  secondaryButton: { marginTop: 10, borderRadius: 12, paddingVertical: 10, alignItems: "center", borderWidth: 1, borderColor: "#d1d5db" },
  secondaryText: { fontSize: 12, fontWeight: "600", color: "#111827" },
  mapOverlay: { position: "absolute", left: 12, right: 12, bottom: 24 },
  mapOverlayCard: { backgroundColor: "#ffffff", borderRadius: 20, padding: 16, borderWidth: 1, borderColor: "#d0d5dd", gap: 12, shadowColor: "#000000", shadowOpacity: 0.12, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 8 },
  mapOverlayHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 },
  mapCloseButton: { borderRadius: 999, backgroundColor: "#101828", paddingHorizontal: 12, paddingVertical: 8 },
  mapCloseText: { color: "#ffffff", fontSize: 12, fontWeight: "700" },
  floatingMapToggle: { position: "absolute", zIndex: 20 },
  floatingMapButton: { borderRadius: 999, backgroundColor: "#f97316", paddingHorizontal: 16, paddingVertical: 12, shadowColor: "#7c2d12", shadowOpacity: 0.28, shadowRadius: 16, shadowOffset: { width: 0, height: 10 }, elevation: 8 },
  floatingMapText: { color: "#ffffff", fontSize: 12, fontWeight: "700" },
  categoryPill: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: "#111827" },
  categoryText: { fontSize: 12, color: "#ffffff" },
  bannerRow: { flexDirection: "row", gap: 8 },
  bannerCard: { flex: 1, backgroundColor: "#111827", borderRadius: 16, padding: 12, gap: 4 },
  bannerTitle: { color: "#ffffff", fontWeight: "600", fontSize: 12 },
  bannerSubtitle: { color: "#e5e7eb", fontSize: 10 },
  dealRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6 },
  dealTitle: { fontSize: 13, color: "#111827" },
  dealPrice: { fontSize: 13, fontWeight: "600", color: "#111827" },
  creditSaleCard: { borderRadius: 14, borderWidth: 1, borderColor: "#e5e7eb", padding: 12, gap: 10 },
  productRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8 },
  productTitle: { fontSize: 14, fontWeight: "600", color: "#111827" },
  productSubtitle: { fontSize: 11, color: "#6b7280" },
  actionButton: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, backgroundColor: "#111827" },
  actionText: { color: "#ffffff", fontSize: 12, fontWeight: "600" },
  walletActionRow: { flexDirection: "row", gap: 8 },
  walletActionButton: { flex: 1, borderRadius: 10, borderWidth: 1, borderColor: "#d1d5db", paddingVertical: 8, alignItems: "center", backgroundColor: "#ffffff" },
  walletActionText: { fontSize: 11, fontWeight: "600", color: "#111827" },
  shopRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6 },
  shopRating: { fontSize: 12, color: "#f59e0b" },
  footerNav: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 12, paddingHorizontal: 8, borderTopWidth: 1, borderTopColor: "#e5e7eb" },
  footerItem: { padding: 6 },
  footerText: { fontSize: 12, color: "#111827", fontWeight: "600" },
});



