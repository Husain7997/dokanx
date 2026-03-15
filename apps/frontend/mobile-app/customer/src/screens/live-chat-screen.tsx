import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";

const conversations = [
  { id: "c1", name: "Aurora Electronics", last: "We can deliver today." },
  { id: "c2", name: "Nook Home", last: "Pickup is ready." },
];

export function LiveChatScreen() {
  const navigation = useNavigation();

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Live chat</Text>
        {conversations.map((chat) => (
          <View key={chat.id} style={styles.card}>
            <Text style={styles.cardTitle}>{chat.name}</Text>
            <Text style={styles.cardSubtitle}>{chat.last}</Text>
            <Pressable style={styles.actionButton} onPress={() => navigation.navigate("Cart" as never)}>
              <Text style={styles.actionText}>View cart</Text>
            </Pressable>
          </View>
        ))}
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
