import { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";

import type { CartItem } from "@/store/cart-store";
import { useCartStore } from "@/store/cart-store";

export function CartScreen() {
  const navigation = useNavigation();
  const items = useCartStore((state) => state.items);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeItem = useCartStore((state) => state.removeItem);

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

  function adjustQuantity(id: string, delta: number) {
    const current = items.find((item) => item.id === id);
    if (!current) return;
    updateQuantity(id, current.quantity + delta);
  }

  function handleCheckout() {
    navigation.navigate("Checkout" as never);
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Cart Summary</Text>

        {items.length === 0 ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Your cart is empty</Text>
            <Text style={styles.emptyText}>Add items from the browse screen to get started.</Text>
            <Pressable style={styles.checkoutButton} onPress={() => navigation.navigate("Browse" as never)}>
              <Text style={styles.checkoutText}>Browse products</Text>
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
                  <Pressable style={styles.removeButton} onPress={() => removeItem(item.id)}>
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
            <Pressable style={styles.checkoutButton} onPress={handleCheckout}>
              <Text style={styles.checkoutText}>Proceed to checkout</Text>
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
    backgroundColor: "#f8f4ef",
  },
  container: {
    padding: 16,
    gap: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1f2937",
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    gap: 12,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
  },
  emptyText: {
    fontSize: 13,
    color: "#6b7280",
  },
  itemRow: {
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
    paddingTop: 12,
    gap: 10,
  },
  itemInfo: {
    gap: 4,
  },
  itemName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
  },
  itemMeta: {
    fontSize: 12,
    color: "#6b7280",
  },
  itemPrice: {
    fontSize: 13,
    color: "#374151",
  },
  quantityControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  qtyButton: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
  },
  qtyText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  qtyValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
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
    color: "#6b7280",
  },
  summaryValue: {
    fontSize: 13,
    color: "#111827",
  },
  summaryTotalLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },
  summaryTotalValue: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },
  checkoutButton: {
    marginTop: 12,
    backgroundColor: "#111827",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  checkoutText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
  },
});
