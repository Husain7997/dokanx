import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Dimensions, PanResponder, Pressable, StyleSheet, Text, View } from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import { SafeAreaView } from "react-native-safe-area-context";

import { listLocations, listPublicShops } from "@/lib/api-client";

type ShopOption = {
  id: string;
  name: string;
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

type MarkerRow = {
  id: string;
  title: string;
  lat: number;
  lng: number;
};

const window = Dimensions.get("window");

export function MapDiscoveryScreen() {
  const [mapState, setMapState] = useState<"closed" | "minimized" | "expanded">("expanded");
  const [markers, setMarkers] = useState<MarkerRow[]>([]);
  const [shops, setShops] = useState<ShopOption[]>([]);
  const buttonPos = useRef(new Animated.ValueXY({ x: window.width - 74, y: window.height * 0.4 })).current;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        buttonPos.setOffset({
          x: (buttonPos.x as any)._value,
          y: (buttonPos.y as any)._value,
        });
      },
      onPanResponderMove: Animated.event([null, { dx: buttonPos.x, dy: buttonPos.y }], { useNativeDriver: false }),
      onPanResponderRelease: () => {
        buttonPos.flattenOffset();
        const x = Math.min(window.width - 60, Math.max(12, (buttonPos.x as any)._value));
        const y = Math.min(window.height - 120, Math.max(12, (buttonPos.y as any)._value));
        Animated.spring(buttonPos, { toValue: { x, y }, useNativeDriver: false }).start();
      },
    })
  ).current;

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const [shopsResponse, locationsResponse] = await Promise.all([
          listPublicShops(),
          listLocations(),
        ]);
        if (!active) return;
        const shopList =
          shopsResponse.data?.map((shop) => ({
            id: String(shop._id || shop.id || ""),
            name: String(shop.name || "Shop"),
            slug: shop.slug ? String(shop.slug) : null,
          })) || [];
        setShops(shopList.filter((shop) => shop.id));
        const locations = (locationsResponse.data || []) as LocationRow[];
        const markerRows: MarkerRow[] = locations
          .map((location) => {
            const coords = location.coordinates?.coordinates || [];
            return {
              id: String(location._id || location.shopId || ""),
              title: String(location.name || location.city || "Shop"),
              lat: Number(coords[1]),
              lng: Number(coords[0]),
            };
          })
          .filter((row) => Number.isFinite(row.lat) && Number.isFinite(row.lng));
        setMarkers(markerRows);
      } catch {
        if (!active) return;
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, []);

  const initialRegion = useMemo(() => {
    if (markers.length) {
      const { lat, lng } = markers[0];
      return { latitude: lat, longitude: lng, latitudeDelta: 0.08, longitudeDelta: 0.08 };
    }
    return { latitude: 23.8103, longitude: 90.4125, latitudeDelta: 0.2, longitudeDelta: 0.2 };
  }, [markers]);

  const panelStyle = useMemo(() => {
    if (mapState === "closed") {
      return { height: 0, opacity: 0 };
    }
    if (mapState === "minimized") {
      return { height: 220, opacity: 1 };
    }
    return { height: window.height - 120, opacity: 1 };
  }, [mapState]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Map discovery</Text>
          <Text style={styles.subtitle}>Nearby shops and delivery radius</Text>
        </View>

        <Animated.View style={[styles.mapPanel, panelStyle]}>
          {mapState !== "closed" ? (
            <MapView
              provider={PROVIDER_GOOGLE}
              style={StyleSheet.absoluteFill}
              initialRegion={initialRegion}
              showsUserLocation={false}
              showsMyLocationButton={false}
            >
              {markers.map((marker) => (
                <Marker key={marker.id} coordinate={{ latitude: marker.lat, longitude: marker.lng }} title={marker.title} />
              ))}
            </MapView>
          ) : null}
          {mapState === "closed" ? null : (
            <View style={styles.mapFooter}>
              <Text style={styles.footerTitle}>Live shops: {shops.length}</Text>
              <Text style={styles.footerSubtitle}>Tap a marker for shop details</Text>
            </View>
          )}
        </Animated.View>

        <View style={styles.listCard}>
          <Text style={styles.cardTitle}>Shop list</Text>
          {shops.slice(0, 6).map((shop) => (
            <View key={shop.id} style={styles.shopRow}>
              <Text style={styles.shopName}>{shop.name}</Text>
              <Text style={styles.shopMeta}>{shop.slug || "Shop profile"}</Text>
            </View>
          ))}
        </View>
      </View>

      <Animated.View style={[styles.fab, { transform: [{ translateX: buttonPos.x }, { translateY: buttonPos.y }] }]} {...panResponder.panHandlers}>
        <Pressable
          onPress={() => {
            setMapState((current) => {
              if (current === "closed") return "minimized";
              if (current === "minimized") return "expanded";
              return "closed";
            });
          }}
        >
          <Text style={styles.fabText}>
            {mapState === "closed" ? "Open" : mapState === "minimized" ? "Expand" : "Minimize"}
          </Text>
        </Pressable>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f8f4ef" },
  container: { flex: 1, padding: 16, gap: 16 },
  header: { gap: 4 },
  title: { fontSize: 20, fontWeight: "700", color: "#111827" },
  subtitle: { fontSize: 12, color: "#6b7280" },
  mapPanel: {
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "#e0f2fe",
  },
  mapFooter: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 12,
    backgroundColor: "rgba(17,24,39,0.7)",
    borderRadius: 12,
    padding: 10,
  },
  footerTitle: { color: "#fff", fontSize: 12, fontWeight: "600" },
  footerSubtitle: { color: "#e5e7eb", fontSize: 10 },
  listCard: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    gap: 10,
  },
  cardTitle: { fontSize: 15, fontWeight: "600", color: "#111827" },
  shopRow: { gap: 4, borderBottomWidth: 1, borderBottomColor: "#f3f4f6", paddingBottom: 8 },
  shopName: { fontSize: 14, fontWeight: "600", color: "#111827" },
  shopMeta: { fontSize: 11, color: "#6b7280" },
  fab: {
    position: "absolute",
    top: 0,
    left: 0,
    backgroundColor: "#111827",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    elevation: 6,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  fabText: { color: "#ffffff", fontSize: 12, fontWeight: "600" },
});
