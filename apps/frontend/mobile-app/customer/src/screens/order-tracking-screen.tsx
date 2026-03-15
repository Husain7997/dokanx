import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";

export function OrderTrackingScreen() {
  const navigation = useNavigation();

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Order tracking</Text>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>DX-10021</Text>
          <Text style={styles.cardSubtitle}>Out for delivery · Rider: Masud</Text>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>ETA</Text>
            <Text style={styles.statusValue}>35 mins</Text>
          </View>
          <Pressable style={styles.actionButton} onPress={() => navigation.navigate("LiveChat" as never)}>
            <Text style={styles.actionText}>Chat with support</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f8f4ef" },
  container: { padding: 16, gap: 16 },
  title: { fontSize: 20, fontWeight: "700", color: "#1f2937" },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    gap: 10,
  },
  cardTitle: { fontSize: 15, fontWeight: "600", color: "#111827" },
  cardSubtitle: { fontSize: 13, color: "#6b7280" },
  statusRow: { flexDirection: "row", justifyContent: "space-between" },
  statusLabel: { fontSize: 12, color: "#6b7280" },
  statusValue: { fontSize: 12, color: "#111827" },
  actionButton: {
    alignSelf: "flex-start",
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#111827",
  },
  actionText: { color: "#ffffff", fontSize: 12, fontWeight: "600" },
});
