import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";

import { DokanXLogo } from "../components/dokanx-logo";

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

export function LiveChatScreen() {
  const navigation = useNavigation();

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.hero}>
          <DokanXLogo variant="full" size="sm" />
          <Text style={styles.heroEyebrow}>Support Center</Text>
          <Text style={styles.heroTitle}>Live chat is the next layer, and your support routes are already organized.</Text>
          <Text style={styles.heroDescription}>
            Order tracking, payment retry, and claim submission are live today. Real-time chat can plug into this surface next without changing the rest of your support journey.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Current support routes</Text>
          <View style={styles.routeCard}>
            <Text style={styles.routeTitle}>Order tracking</Text>
            <Text style={styles.routeText}>Use this for delivery visibility, payment refresh, and status checks.</Text>
          </View>
          <View style={styles.routeCard}>
            <Text style={styles.routeTitle}>Claims and warranty</Text>
            <Text style={styles.routeText}>Submit product issues directly from the order tracking flow when an item is eligible.</Text>
          </View>
          <View style={styles.routeCard}>
            <Text style={styles.routeTitle}>Payment retry</Text>
            <Text style={styles.routeText}>Failed or pending online payments can already be retried from the order screen.</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>What comes next</Text>
          <Text style={styles.cardText}>This screen is now ready for a future real-time chat module without changing the rest of the customer support journey.</Text>
          <Pressable style={styles.primaryButton} onPress={() => navigation.navigate("OrderTracking" as never)}>
            <Text style={styles.primaryButtonText}>Back to order tracking</Text>
          </Pressable>
          <Pressable style={styles.secondaryButton} onPress={() => navigation.navigate("Home" as never)}>
            <Text style={styles.secondaryButtonText}>Return home</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: BRAND.bg },
  container: { padding: 16, gap: 16 },
  hero: {
    backgroundColor: BRAND.navy,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: BRAND.navySoft,
    gap: 10,
  },
  heroEyebrow: { color: "#C4D2E8", fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.8 },
  heroTitle: { color: "#FFFFFF", fontSize: 24, lineHeight: 30, fontWeight: "800" },
  heroDescription: { color: "#D7E2F1", fontSize: 14, lineHeight: 21 },
  card: { backgroundColor: BRAND.surface, borderRadius: 22, padding: 16, borderWidth: 1, borderColor: BRAND.border, gap: 12 },
  cardTitle: { fontSize: 18, fontWeight: "800", color: BRAND.text },
  cardText: { fontSize: 13, lineHeight: 20, color: BRAND.textMuted },
  routeCard: { borderRadius: 16, padding: 12, backgroundColor: BRAND.surfaceMuted, borderWidth: 1, borderColor: BRAND.border, gap: 4 },
  routeTitle: { fontSize: 14, fontWeight: "800", color: BRAND.text },
  routeText: { fontSize: 12, lineHeight: 18, color: BRAND.textMuted },
  primaryButton: { borderRadius: 12, backgroundColor: BRAND.navy, paddingVertical: 12, alignItems: "center" },
  primaryButtonText: { color: "#FFFFFF", fontSize: 13, fontWeight: "800" },
  secondaryButton: { borderRadius: 12, backgroundColor: BRAND.surfaceMuted, paddingVertical: 12, alignItems: "center", borderWidth: 1, borderColor: BRAND.border },
  secondaryButtonText: { color: BRAND.text, fontSize: 13, fontWeight: "700" },
});

