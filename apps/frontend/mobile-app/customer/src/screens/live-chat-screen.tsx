import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";

export function LiveChatScreen() {
  const navigation = useNavigation();

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Live chat</Text>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Support chat is coming soon</Text>
          <Text style={styles.cardSubtitle}>
            Order tracking, claims, and payment retry are live. Real-time support chat is not enabled yet.
          </Text>
          <Pressable style={styles.actionButton} onPress={() => navigation.navigate("OrderTracking" as never)}>
            <Text style={styles.actionText}>Back to order tracking</Text>
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
    gap: 8,
  },
  cardTitle: { fontSize: 15, fontWeight: "600", color: "#111827" },
  cardSubtitle: { fontSize: 13, color: "#6b7280" },
  actionButton: {
    alignSelf: "flex-start",
    marginTop: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#111827",
  },
  actionText: { color: "#ffffff", fontSize: 12, fontWeight: "600" },
});
