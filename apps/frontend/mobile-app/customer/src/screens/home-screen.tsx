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
import { DokanXLogo } from "../components/dokanx-logo";
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
        if (!selectedShop && nextShops[0]) setShop(nextShops[0]);
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
          ((recommendationResponse?.data as { recommended_products?: Array<Record<string, unknown>> } | undefined)?.recommended_products || [])
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
        const data = overview?.data as { walletSummary?: { totalDue?: number; totalIncome?: number }; orders?: unknown[]; claims?: unknown[] } | undefined;
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
          <DokanXLogo variant="full" size="sm" />
          <Text style={styles.heroEyebrow}>Marketplace Home</Text>
          <Text style={styles.heroTitle}>Pick a nearby shop, scan the best deals, and move straight into checkout.</Text>
          <Text style={styles.heroSubtitle}>{selectedShop?.name || "Select a nearby shop and start adding to cart."}</Text>
          <View style={styles.heroActions}>
            <Pressable style={styles.heroPrimaryButton} onPress={() => navigation.navigate("Cart" as never)}>
              <Text style={styles.heroPrimaryText}>Cart {cartCount}</Text>
            </Pressable>
            <Pressable style={styles.heroSecondaryButton} onPress={() => setShowMapPreview((current) => !current)}>
              <Text style={styles.heroSecondaryText}>{showMapPreview ? "Hide Map" : "Show Map"}</Text>
            </Pressable>
          </View>
          <View style={styles.statRow}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Wallet</Text>
              <Text style={styles.statValue}>{walletBalance || summary.walletIncome} BDT</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Due</Text>
              <Text style={styles.statValue}>{Number(creditSnapshot?.totalDue || summary.totalDue)} BDT</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Claims</Text>
              <Text style={styles.statValue}>{summary.claims}</Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Search and quick jump</Text>
          <Text style={styles.cardDescription}>Search products, brands, and shops from the active district and market context.</Text>
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
          <Text style={styles.cardTitle}>Location selector</Text>
          <Text style={styles.cardDescription}>Bangladesh • {selectedDistrict === "all" ? "Select district" : selectedDistrict} • {selectedMarket === "all" ? "Market" : selectedMarket}</Text>
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
          <Text style={styles.cardTitle}>Customer finances</Text>
          <View style={styles.financeGrid}>
            <View style={styles.financeCard}>
              <Text style={styles.financeLabel}>Orders</Text>
              <Text style={styles.financeValue}>{summary.orders}</Text>
            </View>
            <View style={styles.financeCard}>
              <Text style={styles.financeLabel}>Wallet income</Text>
              <Text style={styles.financeValue}>{summary.walletIncome} BDT</Text>
            </View>
            <View style={styles.financeCard}>
              <Text style={styles.financeLabel}>Current due</Text>
              <Text style={styles.financeValue}>{Number(creditSnapshot?.totalDue || summary.totalDue)} BDT</Text>
            </View>
          </View>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Wallet activity</Text>
          <Text style={styles.cardDescription}>Recent customer wallet payments and debits.</Text>
          {walletTransactions.length ? walletTransactions.map((item) => (
            <View key={item.id} style={styles.listRow}>
              <View style={styles.listCopy}>
                <Text style={styles.listTitle}>{item.orderId ? `Order ${item.orderId}` : "Wallet transaction"}</Text>
                <Text style={styles.listSubtitle}>{item.note || "Customer wallet"}</Text>
              </View>
              <Text style={styles.listValue}>{item.amount} BDT</Text>
            </View>
          )) : <Text style={styles.cardNote}>Wallet activity will appear here after your first top-up or checkout.</Text>}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Pay Later (Baki)</Text>
          <Text style={styles.cardDescription}>Shop-wise due balance and quick repayment actions.</Text>
          {(creditSnapshot?.sales || []).length ? (
            (creditSnapshot?.sales || []).slice(0, 4).map((item, index) => (
              <View key={`${String(item._id || index)}`} style={styles.creditSaleCard}>
                <View style={styles.listCopy}>
                  <Text style={styles.listTitle}>Shop {String(item.shopId || "").slice(-6)}</Text>
                  <Text style={styles.listSubtitle}>Outstanding due</Text>
                </View>
                <Text style={styles.listValue}>{Number(item.outstandingAmount || 0)} BDT</Text>
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
          ) : <Text style={styles.cardNote}>No due balance is active right now.</Text>}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Picked for you</Text>
          <Text style={styles.cardDescription}>AI suggestions and popular picks from the active shop.</Text>
          {(recommendedProducts.length ? recommendedProducts : products).slice(0, 4).map((item) => (
            <View key={item.id} style={styles.listRow}>
              <View style={styles.listCopy}>
                <Text style={styles.listTitle}>{item.name}</Text>
                <Text style={styles.listSubtitle}>AI recommendation</Text>
              </View>
              <Pressable style={styles.actionButton} onPress={() => navigation.navigate("Browse" as never)}>
                <Text style={styles.actionText}>{item.price} BDT</Text>
              </Pressable>
            </View>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Fast-moving deals</Text>
          <Text style={styles.cardDescription}>Fast-moving products from trending demand signals.</Text>
          {(trendingProducts.length ? trendingProducts : products).slice(0, 3).map((item) => (
            <View key={item.id} style={styles.listRow}>
              <View style={styles.listCopy}>
                <Text style={styles.listTitle}>{item.name}</Text>
                <Text style={styles.listSubtitle}>Limited-time pricing</Text>
              </View>
              <Text style={styles.listValue}>{item.price} BDT</Text>
            </View>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Popular right now</Text>
          <Text style={styles.cardDescription}>Quick jump into the live catalog from your active shop.</Text>
          {loading ? <Text style={styles.loadingText}>Loading live products...</Text> : null}
          {products.map((item) => (
            <View key={item.id} style={styles.listRow}>
              <View style={styles.listCopy}>
                <Text style={styles.listTitle}>{item.name}</Text>
                <Text style={styles.listSubtitle}>{selectedShop?.name || "Shop"}</Text>
              </View>
              <Pressable style={styles.actionButton} onPress={() => navigation.navigate("Browse" as never)}>
                <Text style={styles.actionText}>{item.price} BDT</Text>
              </Pressable>
            </View>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Nearby storefronts</Text>
          <Text style={styles.cardDescription}>Shortlist trusted stores close to your current market selection.</Text>
          {filteredShops.slice(0, 4).map((shop, index) => (
            <View key={shop.id} style={styles.listRow}>
              <View style={styles.listCopy}>
                <Text style={styles.listTitle}>{shop.name}</Text>
                <Text style={styles.listSubtitle}>{(0.6 + index * 0.2).toFixed(1)} km away</Text>
              </View>
              <Text style={styles.listValue}>4.{6 + index}</Text>
            </View>
          ))}
        </View>

        <View style={styles.footerNav}>
          {[ ["Home", "Home"], ["Search", "SearchResults"], ["Cart", "Cart"], ["Orders", "OrderTracking"], ["Account", "Auth"] ].map(([label, screen]) => (
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
              <View style={styles.listCopy}>
                <Text style={styles.cardTitle}>Map quick view</Text>
                <Text style={styles.cardDescription}>Drag the orange button anywhere and tap it again to close.</Text>
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
            <Pressable style={styles.mapOpenButton} onPress={() => navigation.navigate("MapDiscovery" as never)}>
              <Text style={styles.mapOpenText}>Open full map</Text>
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
  safeArea: { flex: 1, backgroundColor: BRAND.bg },
  container: { padding: 16, gap: 16, paddingBottom: 120 },
  heroCard: {
    backgroundColor: BRAND.navy,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: BRAND.navySoft,
    gap: 10,
  },
  heroEyebrow: { color: "#C4D2E8", fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.8 },
  heroTitle: { color: "#FFFFFF", fontSize: 24, lineHeight: 30, fontWeight: "800" },
  heroSubtitle: { color: "#D7E2F1", fontSize: 14, lineHeight: 21 },
  heroActions: { flexDirection: "row", gap: 10, marginTop: 6 },
  heroPrimaryButton: { flex: 1, borderRadius: 14, paddingVertical: 12, alignItems: "center", backgroundColor: "#FFFFFF" },
  heroPrimaryText: { color: BRAND.navy, fontSize: 13, fontWeight: "800" },
  heroSecondaryButton: { flex: 1, borderRadius: 14, paddingVertical: 12, alignItems: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.18)", backgroundColor: "rgba(255,255,255,0.08)" },
  heroSecondaryText: { color: "#FFFFFF", fontSize: 13, fontWeight: "700" },
  statRow: { flexDirection: "row", gap: 10, flexWrap: "wrap", marginTop: 6 },
  statCard: { flexGrow: 1, minWidth: 96, backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 18, padding: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", gap: 4 },
  statLabel: { color: "#C4D2E8", fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.6 },
  statValue: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },
  card: { backgroundColor: BRAND.surface, borderRadius: 22, padding: 16, borderWidth: 1, borderColor: BRAND.border, gap: 12 },
  cardTitle: { fontSize: 18, fontWeight: "800", color: BRAND.text },
  cardDescription: { fontSize: 13, lineHeight: 20, color: BRAND.textMuted },
  cardNote: { fontSize: 12, color: BRAND.navy, fontWeight: "700" },
  input: { backgroundColor: BRAND.surfaceMuted, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: BRAND.text, borderColor: BRAND.border, borderWidth: 1 },
  suggestionList: { borderTopWidth: 1, borderTopColor: BRAND.border },
  suggestionRow: { paddingVertical: 10 },
  suggestionText: { fontSize: 13, color: BRAND.text, fontWeight: "600" },
  chipRow: { gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: BRAND.border, backgroundColor: BRAND.surfaceMuted },
  chipActive: { backgroundColor: BRAND.navy, borderColor: BRAND.navy },
  chipText: { fontSize: 12, color: BRAND.text, fontWeight: "600" },
  chipTextActive: { color: "#FFFFFF" },
  financeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  financeCard: { minWidth: 100, flexGrow: 1, borderRadius: 16, padding: 12, borderWidth: 1, borderColor: BRAND.border, backgroundColor: "#F7F9FC", gap: 4 },
  financeLabel: { color: BRAND.textMuted, fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
  financeValue: { color: BRAND.text, fontSize: 15, fontWeight: "800" },
  listRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12, paddingVertical: 8 },
  listCopy: { flex: 1, gap: 3 },
  listTitle: { fontSize: 14, fontWeight: "700", color: BRAND.text },
  listSubtitle: { fontSize: 11, color: BRAND.textMuted },
  listValue: { fontSize: 13, fontWeight: "800", color: BRAND.navy },
  creditSaleCard: { borderRadius: 16, borderWidth: 1, borderColor: BRAND.border, padding: 12, gap: 10, backgroundColor: "#F9FBFD" },
  actionButton: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: BRAND.navy },
  actionText: { color: "#FFFFFF", fontSize: 12, fontWeight: "800" },
  walletActionRow: { flexDirection: "row", gap: 8 },
  walletActionButton: { flex: 1, borderRadius: 10, borderWidth: 1, borderColor: BRAND.border, paddingVertical: 8, alignItems: "center", backgroundColor: BRAND.surface },
  walletActionText: { fontSize: 11, fontWeight: "700", color: BRAND.text },
  loadingText: { fontSize: 12, color: BRAND.orange, fontWeight: "700" },
  footerNav: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 12, paddingHorizontal: 8, borderTopWidth: 1, borderTopColor: BRAND.border },
  footerItem: { padding: 6 },
  footerText: { fontSize: 12, color: BRAND.text, fontWeight: "700" },
  mapOverlay: { position: "absolute", left: 12, right: 12, bottom: 24 },
  mapOverlayCard: { backgroundColor: BRAND.surface, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: BRAND.border, gap: 12, shadowColor: "#000000", shadowOpacity: 0.12, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 8 },
  mapOverlayHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 },
  mapPreview: { height: 140, borderRadius: 16, backgroundColor: "#EEF3F9", borderWidth: 1, borderColor: BRAND.border, position: "relative" },
  mapPin: { position: "absolute", width: 10, height: 10, borderRadius: 999, backgroundColor: BRAND.orange },
  mapCloseButton: { borderRadius: 999, backgroundColor: BRAND.navy, paddingHorizontal: 12, paddingVertical: 8 },
  mapCloseText: { color: "#FFFFFF", fontSize: 12, fontWeight: "700" },
  mapOpenButton: { marginTop: 10, borderRadius: 12, paddingVertical: 10, alignItems: "center", borderWidth: 1, borderColor: BRAND.border, backgroundColor: BRAND.surface },
  mapOpenText: { fontSize: 12, fontWeight: "700", color: BRAND.text },
  floatingMapToggle: { position: "absolute", zIndex: 20 },
  floatingMapButton: { borderRadius: 999, backgroundColor: BRAND.orange, paddingHorizontal: 16, paddingVertical: 12, shadowColor: "#7C2D12", shadowOpacity: 0.28, shadowRadius: 16, shadowOffset: { width: 0, height: 10 }, elevation: 8 },
  floatingMapText: { color: "#FFFFFF", fontSize: 12, fontWeight: "800" },
});


