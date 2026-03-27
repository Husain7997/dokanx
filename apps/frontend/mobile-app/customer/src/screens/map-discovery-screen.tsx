import {useEffect, useMemo, useState} from "react";
import {Pressable, ScrollView, StyleSheet, Text, View} from "react-native";
import {useNavigation} from "@react-navigation/native";
import {SafeAreaView} from "react-native-safe-area-context";

import {listPublicShops} from "../lib/api-client";
import {useTenantStore} from "../store/tenant-store";

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

const DEFAULT_LOCATION = {
  lat: 23.8103,
  lng: 90.4125,
  label: "Nearby markets",
};

const DISTANCE_OPTIONS = [2, 5, 10, 20];

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function calculateDistanceKm(from: {lat: number; lng: number}, to: {lat: number; lng: number}) {
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
        if (!active) {
          return;
        }

        const normalized =
          response.data
            ?.map((shop) => {
              const coordinates = shop.coordinates?.coordinates || [];
              const lng = Number(coordinates[0]);
              const lat = Number(coordinates[1]);

              if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
                return null;
              }

              return {
                id: String(shop._id || shop.id || ""),
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
                distanceKm: calculateDistanceKm(anchorLocation, {lat, lng}),
              } satisfies ShopMarker;
            })
            .filter((shop): shop is ShopMarker => Boolean(shop?.id)) || [];

        setShops(normalized);
      } catch {
        if (active) {
          setShops([]);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadShops();

    return () => {
      active = false;
    };
  }, [anchorLocation]);

  const categories = useMemo(() => {
    return ["all", ...new Set(shops.map((shop) => shop.category || "General"))];
  }, [shops]);

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
          <Text style={styles.eyebrow}>Market Explorer</Text>
          <Text style={styles.title}>Walk nearby markets without leaving the app</Text>
          <Text style={styles.subtitle}>
            Using {anchorLocation.label}, DokanX shows nearby shops, trust score, and quick actions.
          </Text>
        </View>

        <View style={styles.filterCard}>
          <Text style={styles.sectionTitle}>Distance</Text>
          <View style={styles.chipRow}>
            {DISTANCE_OPTIONS.map((option) => (
              <Pressable
                key={option}
                style={[styles.chip, distanceKm === option && styles.chipActive]}
                onPress={() => setDistanceKm(option)}
              >
                <Text style={[styles.chipText, distanceKm === option && styles.chipTextActive]}>{option} km</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.sectionTitle}>Category</Text>
          <View style={styles.chipRow}>
            {categories.map((category) => (
              <Pressable
                key={category}
                style={[styles.chip, selectedCategory === category && styles.chipActive]}
                onPress={() => setSelectedCategory(category)}
              >
                <Text style={[styles.chipText, selectedCategory === category && styles.chipTextActive]}>
                  {category === "all" ? "All" : category}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.sectionTitle}>Rating</Text>
          <View style={styles.chipRow}>
            {[0, 4, 4.5].map((rating) => (
              <Pressable
                key={String(rating)}
                style={[styles.chip, selectedRating === rating && styles.chipActive]}
                onPress={() => setSelectedRating(rating)}
              >
                <Text style={[styles.chipText, selectedRating === rating && styles.chipTextActive]}>
                  {rating === 0 ? "Any" : `${rating}+`}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.listHeader}>
          <Text style={styles.sectionTitle}>Visible markets</Text>
          <Text style={styles.metaText}>{loading ? "Refreshing..." : `${visibleShops.length} shops`}</Text>
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
            <Text style={styles.shopMeta}>
              {(shop.category || "General") + " • " + (shop.ratingAverage || 4.5).toFixed(1) + " rating • " + (shop.trustScore || 90) + "% trust"}
            </Text>
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
  safeArea: {flex: 1, backgroundColor: "#f8f4ef"},
  container: {padding: 16, gap: 16},
  heroCard: {
    backgroundColor: "#111827",
    borderRadius: 24,
    padding: 20,
    gap: 8,
  },
  eyebrow: {fontSize: 12, fontWeight: "700", color: "#fbbf24", textTransform: "uppercase"},
  title: {fontSize: 24, fontWeight: "700", color: "#ffffff"},
  subtitle: {fontSize: 14, lineHeight: 20, color: "#d1d5db"},
  filterCard: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  listHeader: {flexDirection: "row", justifyContent: "space-between", alignItems: "center"},
  sectionTitle: {fontSize: 15, fontWeight: "700", color: "#111827"},
  metaText: {fontSize: 12, color: "#6b7280"},
  chipRow: {flexDirection: "row", flexWrap: "wrap", gap: 8},
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#f3f4f6",
  },
  chipActive: {backgroundColor: "#111827"},
  chipText: {fontSize: 12, color: "#374151", fontWeight: "600"},
  chipTextActive: {color: "#ffffff"},
  shopCard: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    gap: 10,
  },
  shopHeader: {flexDirection: "row", justifyContent: "space-between", alignItems: "center"},
  shopBadge: {
    backgroundColor: "#ecfccb",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  shopBadgeText: {fontSize: 11, fontWeight: "700", color: "#3f6212"},
  shopTitle: {fontSize: 18, fontWeight: "700", color: "#111827"},
  shopMeta: {fontSize: 13, lineHeight: 18, color: "#4b5563"},
  actionRow: {flexDirection: "row", gap: 10},
  primaryButton: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: "#111827",
    paddingVertical: 12,
    alignItems: "center",
  },
  primaryButtonText: {color: "#ffffff", fontSize: 13, fontWeight: "700"},
  secondaryButton: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: "#f3f4f6",
    paddingVertical: 12,
    alignItems: "center",
  },
  secondaryButtonText: {color: "#111827", fontSize: 13, fontWeight: "700"},
});
