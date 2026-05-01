import { useEffect, useMemo, useState } from "react";
import { Pressable, View, StyleSheet, Text, TextInput } from "react-native";

import { getApiBaseUrl, probeMerchantLoginEndpoint } from "../lib/api-client";
import { useMerchantAuthStore } from "../store/auth-store";

const DEFAULT_MERCHANT_EMAIL = "merchant@dokanx.local";
const DEFAULT_MERCHANT_PASSWORD = "Passw0rd!";

export function MerchantAuthScreen() {
  const signIn = useMerchantAuthStore((state) => state.signIn);
  const isLoading = useMerchantAuthStore((state) => state.isLoading);
  const error = useMerchantAuthStore((state) => state.error);
  const [email, setEmail] = useState(DEFAULT_MERCHANT_EMAIL);
  const [password, setPassword] = useState(DEFAULT_MERCHANT_PASSWORD);
  const [apiStatus, setApiStatus] = useState<string>("Checking merchant API...");
  const currentApiUrl = useMemo(() => getApiBaseUrl("1.0.0"), []);

  useEffect(() => {
    let active = true;

    async function runProbe() {
      const result = await probeMerchantLoginEndpoint();
      if (!active) {
        return;
      }

      if (result.ok) {
        setApiStatus(`Backend ready (status ${result.status}) at ${result.url}`);
        return;
      }

      setApiStatus(result.message || `Merchant login API unreachable at ${currentApiUrl}`);
    }

    void runProbe();

    return () => {
      active = false;
    };
  }, [currentApiUrl]);

  async function handleSignIn() {
    await signIn({ email, password });
  }

  return (
    <View style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.heroCard}>
          <Text style={styles.title}>Merchant sign in</Text>
          <Text style={styles.subtitle}>Use the working owner account below while the local real backend is running.</Text>
          <View style={styles.helperCard}>
            <Text style={styles.helperLabel}>Test owner</Text>
            <Text style={styles.helperValue}>{DEFAULT_MERCHANT_EMAIL}</Text>
            <Text style={styles.helperValue}>{DEFAULT_MERCHANT_PASSWORD}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <TextInput
            style={styles.input}
            placeholder="Email address"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            placeholderTextColor="#9ca3af"
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            placeholderTextColor="#9ca3af"
          />
          <Text style={styles.helperText}>API base URL: {currentApiUrl}</Text>
          <Text style={styles.statusText}>{apiStatus}</Text>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          <Pressable style={styles.button} onPress={handleSignIn} disabled={isLoading}>
            <Text style={styles.buttonText}>{isLoading ? "Signing in..." : "Sign in"}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f8f4ef" },
  container: { flex: 1, justifyContent: "center", padding: 20, gap: 18 },
  heroCard: {
    backgroundColor: "#111827",
    borderRadius: 20,
    padding: 18,
    gap: 10,
  },
  title: { fontSize: 24, fontWeight: "700", color: "#ffffff" },
  subtitle: { fontSize: 14, color: "#d1d5db" },
  helperCard: {
    borderRadius: 16,
    backgroundColor: "#1f2937",
    padding: 14,
    gap: 4,
  },
  helperLabel: { fontSize: 11, color: "#f59e0b", textTransform: "uppercase" },
  helperValue: { fontSize: 13, color: "#ffffff", fontWeight: "600" },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    gap: 12,
  },
  helperText: { color: "#6b7280", fontSize: 12 },
  input: {
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    fontSize: 14,
    color: "#111827",
  },
  button: {
    backgroundColor: "#111827",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  buttonText: { color: "#ffffff", fontSize: 14, fontWeight: "600" },
  statusText: { color: "#374151", fontSize: 12 },
  errorText: { color: "#b91c1c", fontSize: 12, fontWeight: "600" },
});






