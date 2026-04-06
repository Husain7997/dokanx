import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";

import { listPublicShops } from "../lib/api-client";
import { DokanXLogo } from "../components/dokanx-logo";
import { useTenantStore } from "../store/tenant-store";

type ShopMarker = {
  id: string;
  name: string;
  slug?: string | null;
  domain?: string | null;
  lat: number;
  lng: number;
  category?: string | null;
  ratingAverage?: number;
  distanceKm?: number | null;
  trustScore?: number;
  isTrending?: boolean;
  locationName?: string | null;
};

type ShopWithCoordinates = {
  _id?: string;
  id?: string;
  name?: string;
  slug?: string | null;
  domain?: string | null;
  category?: string | null;
  ratingAverage?: number;
  trustScore?: number;
  isTrending?: boolean;
  locationName?: string | null;
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

const DEFAULT_LOCATION = {
  lat: 23.8103,
  lng: 90.4125,
  label: "Nearby markets",
};

const DISTANCE_OPTIONS = [2, 5, 10, 20];

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function calculateDistanceKm(from: { lat: number; lng: number }, to: { lat: number; lng: number }) {
  const earthRadiusKm = 6371;
  const dLat = toRadians(to.lat - from.lat);
  const dLng = toRadians(to.lng - from.lng);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(from.lat)) *
      Math.cos(toRadians(to.lat)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((earthRadiusKm * c).toFixed(1));
}

export function MapDiscoveryScreen() {
  const navigation = useNavigation();
  const setShop = useTenantStore((state) => state.setShop);
  const selectedShop = useTenantStore((state) => state.shop);
  const [shops, setShops] = useState<ShopMarker[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedRating, setSelectedRating] = useState(0);
  const [distanceKm, setDistanceKm] = useState(5);
  const [loading, setLoading] = useState(false);

  const anchorLocation = useMemo(() => {
    if (selectedShop?.lat != null && selectedShop?.lng != null) {
      return {
        lat: selectedShop.lat,
        lng: selectedShop.lng,
        label: selectedShop.name,
      };
    }

    return DEFAULT_LOCATION;
  }, [selectedShop?.lat, selectedShop?.lng, selectedShop?.name]);

  useEffect(() => {
    let active = true;

    async function loadShops() {
      setLoading(true);
      try {
        const response = await listPublicShops();
        if (!active) return;

        const normalized: ShopMarker[] =
          ((response.data as ShopWithCoordinates[] | undefined) || []).flatMap((shop): ShopMarker[] => {
            const coordinates = shop.coordinates?.coordinates || [];
            const lng = Number(coordinates[0]);
            const lat = Number(coordinates[1]);
            const id = String(shop._id || shop.id || "").trim();

            if (!id || !Number.isFinite(lat) || !Number.isFinite(lng)) {
              return [];
            }

            return [
              {
                id,
                name: String(shop.name || "Local market"),
                slug: shop.slug ? String(shop.slug) : null,
                domain: shop.domain ? String(shop.domain) : null,
                lat,
                lng,
                category: shop.category ? String(shop.category) : "General",
                ratingAverage: Number(shop.ratingAverage || 4.5),
                trustScore: Number(shop.trustScore || 90),
                isTrending: Boolean(shop.isTrending),
                locationName: shop.locationName ? String(shop.locationName) : null,
                distanceKm: calculateDistanceKm(anchorLocation, { lat, lng }),
              },
            ];
          });

        setShops(normalized);
      } catch {
        if (active) setShops([]);
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadShops();
    return () => {
      active = false;
    };
  }, [anchorLocation]);

  const categories = useMemo(() => ["all", ...new Set(shops.map((shop) => shop.category || "General"))], [shops]);

  const visibleShops = useMemo(() => {
    return shops.filter((shop) => {
      const matchesCategory = selectedCategory === "all" || (shop.category || "General") === selectedCategory;
      const matchesRating = selectedRating === 0 || (shop.ratingAverage || 0) >= selectedRating;
      const matchesDistance = (shop.distanceKm || 999) <= distanceKm;
      return matchesCategory && matchesRating && matchesDistance;
    });
  }, [distanceKm, selectedCategory, selectedRating, shops]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.heroCard}>
          <DokanXLogo variant="full" size="sm" />
          <Text style={styles.eyebrow}>Market Explorer</Text>
          <Text style={styles.title}>Walk nearby markets without leaving the app.</Text>
          <Text style={styles.subtitle}>Using {anchorLocation.label}, DokanX shows nearby shops, trust score, and fast visit actions.</Text>
          <View style={styles.statRow}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Anchor</Text>
              <Text style={styles.statValueSmall}>{anchorLocation.label}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Visible</Text>
              <Text style={styles.statValue}>{visibleShops.length}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Radius</Text>
              <Text style={styles.statValue}>{distanceKm} km</Text>
            </View>
          </View>
        </View>

        <View style={styles.filterCard}>
          <Text style={styles.sectionTitle}>Distance</Text>
          <View style={styles.chipRow}>
            {DISTANCE_OPTIONS.map((option) => (
              <Pressable key={option} style={[styles.chip, distanceKm === option && styles.chipActive]} onPress={() => setDistanceKm(option)}>
                <Text style={[styles.chipText, distanceKm === option && styles.chipTextActive]}>{option} km</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.sectionTitle}>Category</Text>
          <View style={styles.chipRow}>
            {categories.map((category) => (
              <Pressable key={category} style={[styles.chip, selectedCategory === category && styles.chipActive]} onPress={() => setSelectedCategory(category)}>
                <Text style={[styles.chipText, selectedCategory === category && styles.chipTextActive]}>{category === "all" ? "All" : category}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.sectionTitle}>Rating</Text>
          <View style={styles.chipRow}>
            {[0, 4, 4.5].map((rating) => (
              <Pressable key={String(rating)} style={[styles.chip, selectedRating === rating && styles.chipActive]} onPress={() => setSelectedRating(rating)}>
                <Text style={[styles.chipText, selectedRating === rating && styles.chipTextActive]}>{rating === 0 ? "Any" : `${rating}+`}</Text>
              </Pressable>
            ))}
          </View>
        </View>
        <View style={styles.listHeader}>
          <Text style={styles.sectionTitle}>Visible markets</Text>
          <Text style={styles.metaText}>{loading ? "Refreshing nearby markets..." : `${visibleShops.length} shops`}</Text>
        </View>

        {visibleShops.map((shop) => (
          <View key={shop.id} style={styles.shopCard}>
            <View style={styles.shopHeader}>
              <View style={styles.shopBadge}>
                <Text style={styles.shopBadgeText}>{shop.distanceKm || 0} km</Text>
              </View>
              <Text style={styles.metaText}>{shop.locationName || "Local market"}</Text>
            </View>
            <Text style={styles.shopTitle}>{shop.name}</Text>
            <Text style={styles.shopMeta}>{(shop.category || "General") + " • " + (shop.ratingAverage || 4.5).toFixed(1) + " rating • " + (shop.trustScore || 90) + "% trust"}</Text>
            <View style={styles.snapshotRow}>
              <View style={styles.snapshotCard}>
                <Text style={styles.snapshotLabel}>Trust</Text>
                <Text style={styles.snapshotValue}>{shop.trustScore || 90}%</Text>
              </View>
              <View style={styles.snapshotCard}>
                <Text style={styles.snapshotLabel}>Trend</Text>
                <Text style={styles.snapshotValue}>{shop.isTrending ? "Hot" : "Stable"}</Text>
              </View>
            </View>
            <View style={styles.actionRow}>
              <Pressable
                style={styles.primaryButton}
                onPress={() => {
                  setShop({
                    id: shop.id,
                    name: shop.name,
                    slug: shop.slug || null,
                    domain: shop.domain || null,
                    lat: shop.lat,
                    lng: shop.lng,
                    category: shop.category || null,
                    ratingAverage: shop.ratingAverage || null,
                  });
                  navigation.navigate("Browse" as never);
                }}
              >
                <Text style={styles.primaryButtonText}>Visit shop</Text>
              </Pressable>
              <Pressable style={styles.secondaryButton} onPress={() => navigation.navigate("SearchResults" as never)}>
                <Text style={styles.secondaryButtonText}>Search items</Text>
              </Pressable>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: BRAND.bg },
  container: { padding: 16, gap: 16 },
  heroCard: {
    backgroundColor: BRAND.navy,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: BRAND.navySoft,
    gap: 10,
  },
  eyebrow: { color: "#C4D2E8", fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.8 },
  title: { color: "#FFFFFF", fontSize: 24, lineHeight: 30, fontWeight: "800" },
  subtitle: { color: "#D7E2F1", fontSize: 14, lineHeight: 21 },
  statRow: { flexDirection: "row", gap: 10, flexWrap: "wrap", marginTop: 6 },
  statCard: {
    flexGrow: 1,
    minWidth: 96,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    gap: 4,
  },
  statLabel: { color: "#C4D2E8", fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.6 },
  statValue: { color: "#FFFFFF", fontSize: 18, fontWeight: "800" },
  statValueSmall: { color: "#FFFFFF", fontSize: 13, fontWeight: "700" },
  filterCard: { backgroundColor: BRAND.surface, borderRadius: 22, padding: 16, borderWidth: 1, borderColor: BRAND.border, gap: 12 },
  sectionTitle: { fontSize: 15, fontWeight: "800", color: BRAND.text },
  chipRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  chip: { paddingHorizontal: 12, paddingVertical: 9, borderRadius: 999, backgroundColor: BRAND.surfaceMuted, borderWidth: 1, borderColor: BRAND.border },
  chipActive: { backgroundColor: BRAND.navy, borderColor: BRAND.navy },
  chipText: { color: BRAND.text, fontSize: 12, fontWeight: "700" },
  chipTextActive: { color: "#FFFFFF" },
  listHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  metaText: { color: BRAND.textMuted, fontSize: 12, fontWeight: "600" },
  shopCard: { backgroundColor: BRAND.surface, borderRadius: 22, padding: 16, borderWidth: 1, borderColor: BRAND.border, gap: 12 },
  shopHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  shopBadge: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: BRAND.surfaceMuted, borderWidth: 1, borderColor: BRAND.border },
  shopBadgeText: { color: BRAND.text, fontSize: 11, fontWeight: "800" },
  shopTitle: { fontSize: 18, fontWeight: "800", color: BRAND.text },
  shopMeta: { fontSize: 13, color: BRAND.textMuted, lineHeight: 20 },
  snapshotRow: { flexDirection: "row", gap: 10 },
  snapshotCard: { flex: 1, borderRadius: 16, borderWidth: 1, borderColor: BRAND.border, backgroundColor: BRAND.surfaceMuted, padding: 12, gap: 4 },
  snapshotLabel: { color: BRAND.textMuted, fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.6 },
  snapshotValue: { color: BRAND.text, fontSize: 16, fontWeight: "800" },
  actionRow: { flexDirection: "row", gap: 10 },
  primaryButton: { flex: 1, borderRadius: 14, backgroundColor: BRAND.navy, paddingVertical: 12, alignItems: "center" },
  primaryButtonText: { color: "#FFFFFF", fontSize: 13, fontWeight: "800" },
  secondaryButton: { flex: 1, borderRadius: 14, backgroundColor: BRAND.surfaceMuted, paddingVertical: 12, alignItems: "center", borderWidth: 1, borderColor: BRAND.border },
  secondaryButtonText: { color: BRAND.text, fontSize: 13, fontWeight: "700" },
});

