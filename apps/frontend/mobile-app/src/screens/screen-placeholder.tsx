import { SafeAreaView, StyleSheet, Text, View } from "react-native";

type ScreenPlaceholderProps = {
  title: string;
  description: string;
};

export function ScreenPlaceholder({
  title,
  description
}: ScreenPlaceholderProps) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.card}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f8f4ef",
    justifyContent: "center",
    padding: 24
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 24,
    padding: 24
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1f2937"
  },
  description: {
    marginTop: 12,
    fontSize: 16,
    lineHeight: 24,
    color: "#4b5563"
  }
});
