import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";

const deliveryOptions = [
  { id: "standard", label: "Standard delivery", fee: 120 },
  { id: "express", label: "Express delivery", fee: 220 },
  { id: "pickup", label: "Store pickup", fee: 0 },
];

const paymentMethods = [
  { id: "cash_on_delivery", label: "Cash on delivery" },
  { id: "mobile_wallet", label: "Mobile wallet" },
  { id: "card_payment", label: "Card payment" },
  { id: "wallet_balance", label: "Wallet balance" },
];

const checkoutItems = [
  { id: "c1", name: "Aurora Headphones", price: 3200, quantity: 1 },
  { id: "c2", name: "Nook Mixer", price: 2400, quantity: 2 },
];

export function CheckoutScreen() {
  const navigation = useNavigation();
  const [step, setStep] = useState(1);
  const [delivery, setDelivery] = useState("standard");
  const [payment, setPayment] = useState("cash_on_delivery");
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [address, setAddress] = useState({
    district: "Dhaka",
    thana: "Gulshan",
    area: "Gulshan-1",
    street: "House 12, Road 4",
    phone: "01700000000",
    note: "",
  });

  const totals = useMemo(() => {
    const subtotal = checkoutItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const shipping = deliveryOptions.find((item) => item.id === delivery)?.fee ?? 0;
    return {
      subtotal,
      shipping,
      total: subtotal + shipping,
    };
  }, [delivery]);

  function handleConfirm() {
    setSubmitting(true);
    setStatus(null);
    setTimeout(() => {
      setSubmitting(false);
      setStatus("Order confirmed. Tracking is ready.");
      navigation.navigate("OrderTracking" as never);
    }, 800);
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Checkout</Text>
        <View style={styles.stepRow}>
          {["Address", "Delivery", "Payment", "Review"].map((label, index) => (
            <View key={label} style={[styles.stepPill, step === index + 1 ? styles.stepActive : null]}>
              <Text style={[styles.stepText, step === index + 1 ? styles.stepTextActive : null]}>
                {label}
              </Text>
            </View>
          ))}
        </View>

        {step === 1 ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Shipping address</Text>
            <TextInput
              style={styles.input}
              placeholder="District"
              value={address.district}
              onChangeText={(value) => setAddress((current) => ({ ...current, district: value }))}
            />
            <TextInput
              style={styles.input}
              placeholder="Thana"
              value={address.thana}
              onChangeText={(value) => setAddress((current) => ({ ...current, thana: value }))}
            />
            <TextInput
              style={styles.input}
              placeholder="Area"
              value={address.area}
              onChangeText={(value) => setAddress((current) => ({ ...current, area: value }))}
            />
            <TextInput
              style={styles.input}
              placeholder="Street"
              value={address.street}
              onChangeText={(value) => setAddress((current) => ({ ...current, street: value }))}
            />
            <TextInput
              style={styles.input}
              placeholder="Phone number"
              value={address.phone}
              onChangeText={(value) => setAddress((current) => ({ ...current, phone: value }))}
              keyboardType="phone-pad"
            />
            <TextInput
              style={styles.input}
              placeholder="Delivery note"
              value={address.note}
              onChangeText={(value) => setAddress((current) => ({ ...current, note: value }))}
            />
          </View>
        ) : null}

        {step === 2 ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Delivery options</Text>
            {deliveryOptions.map((option) => (
              <Pressable
                key={option.id}
                style={[
                  styles.optionCard,
                  delivery === option.id ? styles.optionCardActive : null,
                ]}
                onPress={() => setDelivery(option.id)}
              >
                <Text
                  style={[
                    styles.optionTitle,
                    delivery === option.id ? styles.optionTitleActive : null,
                  ]}
                >
                  {option.label}
                </Text>
                <Text
                  style={[
                    styles.optionSubtitle,
                    delivery === option.id ? styles.optionSubtitleActive : null,
                  ]}
                >
                  {option.fee} BDT
                </Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        {step === 3 ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Payment method</Text>
            {paymentMethods.map((method) => (
              <Pressable
                key={method.id}
                style={[
                  styles.optionCard,
                  payment === method.id ? styles.optionCardActive : null,
                ]}
                onPress={() => setPayment(method.id)}
              >
                <Text
                  style={[
                    styles.optionTitle,
                    payment === method.id ? styles.optionTitleActive : null,
                  ]}
                >
                  {method.label}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        {step === 4 ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Order review</Text>
            <View style={styles.reviewSection}>
              <Text style={styles.reviewLabel}>Deliver to</Text>
              <Text style={styles.reviewValue}>
                {address.street}, {address.area}, {address.thana}, {address.district}
              </Text>
              <Text style={styles.reviewValue}>{address.phone}</Text>
            </View>
            <View style={styles.reviewSection}>
              <Text style={styles.reviewLabel}>Delivery</Text>
              <Text style={styles.reviewValue}>{delivery}</Text>
            </View>
            <View style={styles.reviewSection}>
              <Text style={styles.reviewLabel}>Payment</Text>
              <Text style={styles.reviewValue}>{payment.replaceAll("_", " ")}</Text>
            </View>
            {checkoutItems.map((item) => (
              <View key={item.id} style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>{item.name} x {item.quantity}</Text>
                <Text style={styles.summaryValue}>{item.price * item.quantity} BDT</Text>
              </View>
            ))}
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Shipping</Text>
              <Text style={styles.summaryValue}>{totals.shipping} BDT</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryTotalLabel}>Total</Text>
              <Text style={styles.summaryTotalValue}>{totals.total} BDT</Text>
            </View>
          </View>
        ) : null}

        <View style={styles.actionRow}>
          <Pressable
            style={[styles.secondaryButton, step === 1 ? styles.disabledButton : null]}
            onPress={() => setStep((current) => Math.max(1, current - 1))}
            disabled={step === 1}
          >
            <Text style={styles.secondaryButtonText}>Back</Text>
          </Pressable>
          {step < 4 ? (
            <Pressable
              style={styles.primaryButton}
              onPress={() => setStep((current) => Math.min(4, current + 1))}
            >
              <Text style={styles.primaryButtonText}>Continue</Text>
            </Pressable>
          ) : (
            <Pressable style={styles.primaryButton} onPress={handleConfirm} disabled={submitting}>
              <Text style={styles.primaryButtonText}>
                {submitting ? "Confirming..." : "Confirm order"}
              </Text>
            </Pressable>
          )}
        </View>
        {status ? (
          <View style={styles.statusCard}>
            <Text style={styles.statusText}>{status}</Text>
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
  stepRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  stepPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#e5e7eb",
  },
  stepActive: {
    backgroundColor: "#111827",
  },
  stepText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#4b5563",
  },
  stepTextActive: {
    color: "#ffffff",
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
  input: {
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    borderColor: "#e5e7eb",
    borderWidth: 1,
  },
  optionCard: {
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "#f9fafb",
  },
  optionCardActive: {
    borderColor: "#111827",
    backgroundColor: "#111827",
  },
  optionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
  optionTitleActive: {
    color: "#ffffff",
  },
  optionSubtitle: {
    marginTop: 4,
    fontSize: 12,
    color: "#6b7280",
  },
  optionSubtitleActive: {
    color: "#e5e7eb",
  },
  reviewSection: {
    gap: 4,
  },
  reviewLabel: {
    fontSize: 12,
    color: "#6b7280",
  },
  reviewValue: {
    fontSize: 13,
    color: "#111827",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  summaryLabel: {
    fontSize: 12,
    color: "#6b7280",
  },
  summaryValue: {
    fontSize: 12,
    color: "#111827",
  },
  summaryTotalLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  summaryTotalValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  actionRow: {
    flexDirection: "row",
    gap: 12,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: "#111827",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
  },
  secondaryButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#d1d5db",
    backgroundColor: "#ffffff",
  },
  secondaryButtonText: {
    color: "#111827",
    fontSize: 14,
    fontWeight: "600",
  },
  disabledButton: {
    opacity: 0.5,
  },
  statusCard: {
    backgroundColor: "#ecfdf3",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#86efac",
  },
  statusText: {
    fontSize: 13,
    color: "#166534",
  },
});
