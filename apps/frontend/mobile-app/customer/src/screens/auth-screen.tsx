import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuthStore } from "../store/auth-store";
import { useTenantStore } from "../store/tenant-store";

export function AuthScreen() {
  const navigation = useNavigation();
  const { signIn, signUp, retrySignIn, isLoading, error } = useAuthStore();
  const selectedShop = useTenantStore((state) => state.shop);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

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
        <View>
          <Text style={styles.title}>{mode === "signin" ? "Welcome back" : "Create your account"}</Text>
          <Text style={styles.subtitle}>
            {mode === "signin" ? "Sign in to continue shopping." : "Register to start shopping."}
          </Text>
        </View>
        <View style={styles.card}>
          {mode === "signup" ? (
            <TextInput
              style={styles.input}
              placeholder="Full name"
              autoCapitalize="words"
              value={name}
              onChangeText={setName}
            />
          ) : null}
          <TextInput
            style={styles.input}
            placeholder="Email address"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
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
              {isLoading ? (mode === "signin" ? "Signing in..." : "Creating account...") : mode === "signin" ? "Sign in" : "Create account"}
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
    backgroundColor: "#f8f4ef",
  },
  container: {
    flex: 1,
    padding: 20,
    gap: 20,
    justifyContent: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
  },
  subtitle: {
    marginTop: 6,
    fontSize: 14,
    color: "#6b7280",
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 20,
    gap: 14,
    borderWidth: 1,
    borderColor: "#e5e7eb",
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
  primaryButton: {
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
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#d1d5db",
  },
  secondaryButtonText: {
    color: "#111827",
    fontSize: 14,
    fontWeight: "600",
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
    backgroundColor: "#fff5f5",
  },
  retryButtonText: {
    color: "#991b1b",
    fontSize: 12,
    fontWeight: "700",
  },
});