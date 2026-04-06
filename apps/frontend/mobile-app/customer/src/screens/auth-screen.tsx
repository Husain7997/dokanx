import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";

import { DokanXLogo } from "../components/dokanx-logo";
import { useAuthStore } from "../store/auth-store";
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

export function AuthScreen() {
  const navigation = useNavigation();
  const { signIn, signUp, retrySignIn, isLoading, error } = useAuthStore();
  const selectedShop = useTenantStore((state) => state.shop);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const summaryCards = useMemo(
    () => [
      { label: "Journey", value: selectedShop ? "Shop ready" : "Pick a shop" },
      { label: "Access", value: mode === "signin" ? "Return quickly" : "Create account" },
      { label: "Flow", value: "Browse, cart, pay" },
    ],
    [mode, selectedShop],
  );

  async function handleSignIn() {
    const ok = await signIn({ email, password });
    if (ok) {
      navigation.navigate((selectedShop ? "Browse" : "ShopSelect") as never);
    }
  }

  async function handleSignUp() {
    const ok = await signUp({ name, email, password });
    if (ok) {
      navigation.navigate((selectedShop ? "Browse" : "ShopSelect") as never);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.heroCard}>
          <DokanXLogo variant="full" size="lg" />
          <Text style={styles.kicker}>Commerce everywhere</Text>
          <Text style={styles.title}>{mode === "signin" ? "Welcome back" : "Create your account"}</Text>
          <Text style={styles.subtitle}>
            {mode === "signin" ? "Sign in to continue shopping, tracking orders, and using your wallet with DokanX." : "Register once to start browsing, saving preferences, and checking out faster."}
          </Text>
          <View style={styles.summaryRow}>
            {summaryCards.map((item) => (
              <View key={item.label} style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>{item.label}</Text>
                <Text style={styles.summaryValue}>{item.value}</Text>
              </View>
            ))}
          </View>
        </View>
        <View style={styles.card}>
          <Text style={styles.formTitle}>{mode === "signin" ? "Customer sign in" : "Customer registration"}</Text>
          <Text style={styles.formHint}>{mode === "signin" ? "Use your existing account to restore wallet, dues, and saved checkout preferences." : "Create a customer account so your wallet, claims, and saved delivery details stay connected."}</Text>
          {mode === "signup" ? (
            <TextInput
              style={styles.input}
              placeholder="Full name"
              placeholderTextColor={BRAND.muted}
              autoCapitalize="words"
              value={name}
              onChangeText={setName}
            />
          ) : null}
          <TextInput
            style={styles.input}
            placeholder="Email address"
            placeholderTextColor={BRAND.muted}
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor={BRAND.muted}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          {error && mode === "signin" ? (
            <View style={styles.errorActions}>
              <Pressable style={styles.retryButton} onPress={() => void retrySignIn()} disabled={isLoading}>
                <Text style={styles.retryButtonText}>Retry</Text>
              </Pressable>
            </View>
          ) : null}
          <Pressable
            style={styles.primaryButton}
            onPress={mode === "signin" ? handleSignIn : handleSignUp}
            disabled={isLoading}
          >
            <Text style={styles.primaryButtonText}>
              {isLoading ? (mode === "signin" ? "Signing you in..." : "Creating your account...") : mode === "signin" ? "Sign in" : "Create account"}
            </Text>
          </Pressable>
          <Pressable
            style={styles.secondaryButton}
            onPress={() => setMode((current) => (current === "signin" ? "signup" : "signin"))}
          >
            <Text style={styles.secondaryButtonText}>
              {mode === "signin" ? "Create an account" : "Back to sign in"}
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BRAND.screen,
  },
  container: {
    flex: 1,
    padding: 20,
    gap: 20,
    justifyContent: "center",
    backgroundColor: BRAND.screen,
  },
  heroCard: {
    borderRadius: 24,
    padding: 20,
    gap: 10,
    backgroundColor: BRAND.surface,
    borderWidth: 1,
    borderColor: BRAND.border,
    shadowColor: BRAND.navy,
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  kicker: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.4,
    color: BRAND.orange,
    textTransform: "uppercase",
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: BRAND.text,
  },
  subtitle: {
    fontSize: 14,
    color: BRAND.muted,
    lineHeight: 21,
  },
  summaryRow: {
    marginTop: 8,
    flexDirection: "row",
    gap: 10,
  },
  summaryCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BRAND.border,
    backgroundColor: BRAND.tint,
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 4,
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.6,
    color: BRAND.muted,
    textTransform: "uppercase",
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: "700",
    color: BRAND.text,
  },
  card: {
    backgroundColor: BRAND.surface,
    borderRadius: 24,
    padding: 20,
    gap: 14,
    borderWidth: 1,
    borderColor: BRAND.border,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: BRAND.text,
  },
  formHint: {
    fontSize: 13,
    color: BRAND.muted,
    lineHeight: 20,
  },
  input: {
    backgroundColor: BRAND.tint,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    borderColor: BRAND.border,
    borderWidth: 1,
    color: BRAND.text,
  },
  primaryButton: {
    backgroundColor: BRAND.navy,
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
  },
  secondaryButton: {
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: "center",
    borderWidth: 1,
    borderColor: BRAND.border,
    backgroundColor: BRAND.surface,
  },
  secondaryButtonText: {
    color: BRAND.text,
    fontSize: 14,
    fontWeight: "700",
  },
  errorText: {
    color: "#b91c1c",
    fontSize: 12,
    fontWeight: "600",
  },
  errorActions: {
    alignItems: "flex-start",
  },
  retryButton: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#fca5a5",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  retryButtonText: {
    color: "#b91c1c",
    fontSize: 12,
    fontWeight: "700",
  },
});

