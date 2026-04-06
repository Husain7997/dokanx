import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";

import { clearCartRequest, getCartRequest, saveCartRequest } from "../lib/api-client";
import { DokanXLogo } from "../components/dokanx-logo";
import { useAuthStore } from "../store/auth-store";
import type { CartItem } from "../store/cart-store";
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

export function CartScreen() {
  const navigation = useNavigation();
  const items = useCartStore((state) => state.items);
  const guestToken = useCartStore((state) => state.guestToken);
  const setGuestToken = useCartStore((state) => state.setGuestToken);
  const setItems = useCartStore((state) => state.setItems);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeItem = useCartStore((state) => state.removeItem);
  const accessToken = useAuthStore((state) => state.accessToken);
  const selectedShop = useTenantStore((state) => state.shop);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const grouped = useMemo(() => {
    return items.reduce<Record<string, CartItem[]>>((acc, item) => {
      const key = item.shop || "General";
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    }, {});
  }, [items]);

  const totals = useMemo(() => {
    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const shipping = subtotal > 5000 ? 0 : 150;
    const total = subtotal + shipping;
    return { subtotal, shipping, total };
  }, [items]);

  function buildPayloadRows(nextItems: CartItem[]) {
    return nextItems.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      name: item.name,
      price: item.price,
    }));
  }

  function normalizeRemoteItems(remoteItems: Array<{
    productId?: string;
    name?: string;
    price?: number;
    quantity?: number;
  }>) {
    return remoteItems
      .map((item) => ({
        id: String(item.productId || ""),
        productId: String(item.productId || ""),
        name: String(item.name || "Item"),
        price: Number(item.price || 0),
        quantity: Math.max(1, Number(item.quantity || 1)),
        shopId: selectedShop?.id || "",
        shop: selectedShop?.name,
      }))
      .filter((item) => item.id);
  }

  async function syncCart(nextItems: CartItem[]) {
    if (!selectedShop?.id) return;
    setSyncing(true);
    setError(null);
    try {
      const response = await saveCartRequest({
        shopId: selectedShop.id,
        items: buildPayloadRows(nextItems),
        token: accessToken,
        cartToken: guestToken,
      });
      if (response.guestToken) {
        setGuestToken(response.guestToken);
      }
      const remoteItems = response.data?.items || [];
      if (remoteItems.length) {
        setItems(normalizeRemoteItems(remoteItems));
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to sync your cart right now.";
      setError(message);
    } finally {
      setSyncing(false);
    }
  }

  function adjustQuantity(id: string, delta: number) {
    const current = items.find((item) => item.id === id);
    if (!current) return;
    const nextQuantity = Math.max(1, current.quantity + delta);
    const nextItems = items.map((entry) =>
      entry.id === id ? { ...entry, quantity: nextQuantity } : entry
    );
    updateQuantity(id, nextQuantity);
    void syncCart(nextItems);
  }

  function handleCheckout() {
    navigation.navigate("Checkout" as never);
  }

  useEffect(() => {
    let active = true;
    async function hydrateCart() {
      if (!selectedShop?.id) return;
      setSyncing(true);
      setError(null);
      try {
        const response = await getCartRequest({
          shopId: selectedShop.id,
          token: accessToken,
          cartToken: guestToken,
        });
        if (!active) return;
        if (response.guestToken) {
          setGuestToken(response.guestToken);
        }
        const remoteItems = response.data?.items || [];
        if (remoteItems.length) {
          setItems(normalizeRemoteItems(remoteItems));
        } else if (items.length) {
          await syncCart(items);
        }
      } catch (err) {
        if (!active) return;
        const message = err instanceof Error ? err.message : "Unable to load your cart right now.";
        setError(message);
      } finally {
        if (active) setSyncing(false);
      }
    }
    void hydrateCart();
    return () => {
      active = false;
    };
  }, [accessToken, guestToken, items.length, selectedShop?.id]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <DokanXLogo variant="full" size="md" />
            <Pressable style={styles.heroButton} onPress={() => navigation.navigate("Browse" as never)}>
              <Text style={styles.heroButtonText}>Keep browsing</Text>
            </Pressable>
          </View>
          <Text style={styles.kicker}>Cart summary</Text>
          <Text style={styles.title}>Review items before moving to checkout.</Text>
          <Text style={styles.subtitle}>Group items by shop, adjust quantity quickly, and keep the mobile checkout path easy to understand.</Text>
          <View style={styles.statsRow}>
            <View style={styles.statCard}><Text style={styles.statLabel}>Lines</Text><Text style={styles.statValue}>{items.length}</Text></View>
            <View style={styles.statCard}><Text style={styles.statLabel}>Shop</Text><Text style={styles.statValue}>{selectedShop?.name || "Unknown"}</Text></View>
            <View style={styles.statCard}><Text style={styles.statLabel}>Total</Text><Text style={styles.statValue}>{totals.total} BDT</Text></View>
          </View>
        </View>

        {syncing ? <Text style={styles.infoText}>Syncing your cart...</Text> : null}
        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {items.length === 0 ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Your cart is empty</Text>
            <Text style={styles.emptyText}>Add products from browse to start building this order.</Text>
            <Pressable style={styles.checkoutButton} onPress={() => navigation.navigate("Browse" as never)}>
              <Text style={styles.checkoutText}>Open browse</Text>
            </Pressable>
          </View>
        ) : null}

        {Object.keys(grouped).map((shop) => (
          <View key={shop} style={styles.card}>
            <Text style={styles.cardTitle}>{shop}</Text>
            {grouped[shop].map((item) => (
              <View key={item.id} style={styles.itemRow}>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemMeta}>{item.location}</Text>
                  <Text style={styles.itemPrice}>{item.price} BDT</Text>
                </View>
                <View style={styles.quantityControls}>
                  <Pressable style={styles.qtyButton} onPress={() => adjustQuantity(item.id, -1)}>
                    <Text style={styles.qtyText}>-</Text>
                  </Pressable>
                  <Text style={styles.qtyValue}>{item.quantity}</Text>
                  <Pressable style={styles.qtyButton} onPress={() => adjustQuantity(item.id, 1)}>
                    <Text style={styles.qtyText}>+</Text>
                  </Pressable>
                  <Pressable
                    style={styles.removeButton}
                    onPress={() => {
                      const nextItems = items.filter((entry) => entry.id !== item.id);
                      removeItem(item.id);
                      void syncCart(nextItems);
                    }}
                  >
                    <Text style={styles.removeText}>Remove</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        ))}

        {items.length ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Order totals</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal</Text>
              <Text style={styles.summaryValue}>{totals.subtotal} BDT</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Shipping</Text>
              <Text style={styles.summaryValue}>{totals.shipping} BDT</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryTotalLabel}>Total</Text>
              <Text style={styles.summaryTotalValue}>{totals.total} BDT</Text>
            </View>
            <Pressable style={styles.checkoutButton} onPress={handleCheckout} disabled={syncing}>
              <Text style={styles.checkoutText}>Continue to checkout</Text>
            </Pressable>
            <Pressable
              style={[styles.checkoutButton, styles.clearButton]}
              onPress={async () => {
                if (!selectedShop?.id) {
                  setItems([]);
                  return;
                }
                setSyncing(true);
                setError(null);
                try {
                  const response = await clearCartRequest({
                    shopId: selectedShop.id,
                    token: accessToken,
                    cartToken: guestToken,
                  });
                  if (response.guestToken) {
                    setGuestToken(response.guestToken);
                  }
                  setItems([]);
                } catch (err) {
                  const message = err instanceof Error ? err.message : "Unable to clear your cart right now.";
                  setError(message);
                } finally {
                  setSyncing(false);
                }
              }}
              disabled={syncing}
            >
              <Text style={styles.checkoutText}>Remove all items</Text>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BRAND.screen,
  },
  container: {
    padding: 16,
    gap: 16,
  },
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
  heroButton: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: BRAND.navy,
  },
  heroButtonText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
  },
  kicker: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.2,
    color: BRAND.orange,
    textTransform: "uppercase",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: BRAND.text,
  },
  subtitle: {
    fontSize: 13,
    color: BRAND.muted,
    lineHeight: 20,
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
  },
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
  statLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: BRAND.muted,
    textTransform: "uppercase",
  },
  statValue: {
    fontSize: 13,
    fontWeight: "700",
    color: BRAND.text,
  },
  infoText: {
    fontSize: 12,
    color: BRAND.muted,
  },
  errorText: {
    fontSize: 12,
    color: "#b91c1c",
  },
  card: {
    backgroundColor: BRAND.surface,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: BRAND.border,
    gap: 12,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: BRAND.text,
  },
  emptyText: {
    fontSize: 13,
    color: BRAND.muted,
  },
  itemRow: {
    borderTopWidth: 1,
    borderTopColor: "#eef3fa",
    paddingTop: 12,
    gap: 10,
  },
  itemInfo: {
    gap: 4,
  },
  itemName: {
    fontSize: 15,
    fontWeight: "600",
    color: BRAND.text,
  },
  itemMeta: {
    fontSize: 12,
    color: BRAND.muted,
  },
  itemPrice: {
    fontSize: 13,
    color: BRAND.text,
  },
  quantityControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  qtyButton: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: BRAND.tint,
    alignItems: "center",
    justifyContent: "center",
  },
  qtyText: {
    fontSize: 16,
    fontWeight: "700",
    color: BRAND.text,
  },
  qtyValue: {
    fontSize: 14,
    fontWeight: "700",
    color: BRAND.text,
  },
  removeButton: {
    marginLeft: "auto",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#fca5a5",
  },
  removeText: {
    fontSize: 12,
    color: "#b91c1c",
    fontWeight: "600",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  summaryLabel: {
    fontSize: 13,
    color: BRAND.muted,
  },
  summaryValue: {
    fontSize: 13,
    color: BRAND.text,
  },
  summaryTotalLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: BRAND.text,
  },
  summaryTotalValue: {
    fontSize: 15,
    fontWeight: "700",
    color: BRAND.text,
  },
  checkoutButton: {
    marginTop: 12,
    backgroundColor: BRAND.navy,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  clearButton: {
    backgroundColor: "#4b5563",
  },
  checkoutText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
  },
});


