import { useEffect, useState } from "react";
import { Linking, Modal, Pressable, StyleSheet, Text, View } from "react-native";

import { checkForUpdate, isVersionOlder } from "./version";

type UpdateGateProps = {
  appName: string;
  appVersion: string;
};

export function UpdateGate({ appName, appVersion }: UpdateGateProps) {
  const [updateMessage, setUpdateMessage] = useState<string | null>(null);
  const [storeUrl, setStoreUrl] = useState<string | null>(null);
  const [isForced, setIsForced] = useState(false);

  useEffect(() => {
    let active = true;

    async function runCheck() {
      const result = await checkForUpdate(appName, appVersion);
      if (!active || !result) {
        return;
      }

      const mustUpdate = result.forceUpdate || isVersionOlder(appVersion, result.minimumVersion);
      if (!mustUpdate) {
        return;
      }

      setStoreUrl(result.storeUrl || null);
      setIsForced(true);
      setUpdateMessage(
        result.message || `Version ${result.minimumVersion} or newer is required before continuing.`
      );
    }

    void runCheck();

    return () => {
      active = false;
    };
  }, [appName, appVersion]);

  async function handleOpenStore() {
    if (!storeUrl) {
      return;
    }

    await Linking.openURL(storeUrl);
  }

  return (
    <Modal visible={isForced} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>Update required</Text>
          <Text style={styles.body}>{updateMessage}</Text>
          <Pressable style={styles.button} onPress={handleOpenStore} disabled={!storeUrl}>
            <Text style={styles.buttonText}>{storeUrl ? "Open Play Store" : "Update unavailable"}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(17, 24, 39, 0.65)",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 20,
    gap: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
    color: "#4b5563",
  },
  button: {
    backgroundColor: "#111827",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
  },
});
