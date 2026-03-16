import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Dimensions, PanResponder, PermissionsAndroid, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import { SafeAreaView } from "react-native-safe-area-context";
import Geolocation from "react-native-geolocation-service";

import { listLocations, listPublicShops, searchNearbyLocations } from "@/lib/api-client";

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
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [radius, setRadius] = useState(3);
  const buttonPos = useRef(new Animated.ValueXY({ x: window.width - 74, y: window.height * 0.4 })).current;
  const watchId = useRef<number | null>(null);

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
              id: String(location.shopId || location._id || ""),
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

  useEffect(() => {
    let active = true;
    async function requestLocation() {
      if (Platform.OS === "android") {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: "Location access",
            message: "Allow DokanX to show nearby shops on the map.",
            buttonPositive: "Allow",
            buttonNegative: "Deny",
          }
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) return;
      }

      Geolocation.getCurrentPosition(
        (position) => {
          if (!active) return;
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        () => {
          if (!active) return;
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
      );

      watchId.current = Geolocation.watchPosition(
        (position) => {
          if (!active) return;
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        () => {
          if (!active) return;
        },
        { enableHighAccuracy: true, distanceFilter: 25, interval: 10000, fastestInterval: 5000 }
      );
    }
    void requestLocation();
    return () => {
      active = false;
      if (watchId.current !== null) {
        Geolocation.clearWatch(watchId.current);
        watchId.current = null;
      }
    };
  }, []);

  const initialRegion = useMemo(() => {
    if (userLocation) {
      return { latitude: userLocation.lat, longitude: userLocation.lng, latitudeDelta: 0.08, longitudeDelta: 0.08 };
    }
    if (markers.length) {
      const { lat, lng } = markers[0];
      return { latitude: lat, longitude: lng, latitudeDelta: 0.08, longitudeDelta: 0.08 };
    }
    return { latitude: 23.8103, longitude: 90.4125, latitudeDelta: 0.2, longitudeDelta: 0.2 };
  }, [markers, userLocation]);

  const filteredMarkers = useMemo(() => {
    if (!userLocation) return markers;
    return markers.filter((marker) => getDistanceKm(userLocation, { lat: marker.lat, lng: marker.lng }) <= radius);
  }, [markers, radius, userLocation]);

  const filteredShops = useMemo(() => {
    if (!userLocation) return shops;
    const shopIds = new Set(filteredMarkers.map((marker) => marker.id));
    return shops.filter((shop) => shopIds.has(shop.id));
  }, [filteredMarkers, shops, userLocation]);

  useEffect(() => {
    let active = true;
    async function refreshNearby() {
      if (!userLocation) return;
      try {
        const response = await searchNearbyLocations({
          lat: userLocation.lat,
          lng: userLocation.lng,
          distance: radius * 1000,
        });
        if (!active) return;
        const nearby = (response.data || []) as LocationRow[];
        const markerRows: MarkerRow[] = nearby
          .map((location) => {
            const coords = location.coordinates?.coordinates || [];
            return {
              id: String(location.shopId || location._id || ""),
              title: String(location.name || location.city || "Shop"),
              lat: Number(coords[1]),
              lng: Number(coords[0]),
            };
          })
          .filter((row) => Number.isFinite(row.lat) && Number.isFinite(row.lng));
        if (markerRows.length) {
          setMarkers(markerRows);
        }
      } catch {
        if (!active) return;
      }
    }
    void refreshNearby();
    return () => {
      active = false;
    };
  }, [radius, userLocation]);

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
              showsUserLocation={Boolean(userLocation)}
              showsMyLocationButton={true}
            >
              {filteredMarkers.map((marker) => (
                <Marker key={marker.id} coordinate={{ latitude: marker.lat, longitude: marker.lng }} title={marker.title} />
              ))}
            </MapView>
          ) : null}
          {mapState === "closed" ? null : (
            <View style={styles.mapFooter}>
              <Text style={styles.footerTitle}>Live shops: {filteredShops.length}</Text>
              <Text style={styles.footerSubtitle}>Radius {radius} km • Tap a marker for shop details</Text>
            </View>
          )}
        </Animated.View>

        <View style={styles.filterRow}>
          <Text style={styles.filterLabel}>Nearby radius</Text>
          <View style={styles.filterChips}>
            {[1, 3, 5, 8].map((value) => (
              <Pressable
                key={value}
                style={[styles.filterChip, radius === value ? styles.filterChipActive : null]}
                onPress={() => setRadius(value)}
              >
                <Text style={[styles.filterChipText, radius === value ? styles.filterChipTextActive : null]}>{value} km</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.listCard}>
          <Text style={styles.cardTitle}>Shop list</Text>
          {filteredShops.slice(0, 6).map((shop) => (
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
  filterRow: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    gap: 10,
  },
  filterLabel: { fontSize: 12, color: "#6b7280" },
  filterChips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  filterChip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "#f9fafb",
  },
  filterChipActive: { backgroundColor: "#111827", borderColor: "#111827" },
  filterChipText: { fontSize: 12, color: "#111827" },
  filterChipTextActive: { color: "#ffffff" },
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

function getDistanceKm(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number }
) {
  const rad = Math.PI / 180;
  const dLat = (to.lat - from.lat) * rad;
  const dLng = (to.lng - from.lng) * rad;
  const lat1 = from.lat * rad;
  const lat2 = to.lat * rad;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return 6371 * c;
}
