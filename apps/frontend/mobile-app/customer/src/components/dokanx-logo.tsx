import { Image, StyleSheet, View } from "react-native";

const brandAssets = {
  icon: require("../assets/brand/dokanx-icon.jpeg"),
  full: require("../assets/brand/dokanx-full.jpeg"),
  mono: require("../assets/brand/dokanx-mono.jpeg"),
};

const iconFrameMap = {
  sm: { width: 44, height: 44, radius: 12 },
  md: { width: 56, height: 56, radius: 16 },
  lg: { width: 72, height: 72, radius: 20 },
} as const;

const sizeMap = {
  full: {
    sm: { width: 132, height: 44 },
    md: { width: 176, height: 60 },
    lg: { width: 228, height: 78 },
  },
  mono: {
    sm: { width: 132, height: 44 },
    md: { width: 176, height: 60 },
    lg: { width: 228, height: 78 },
  },
} as const;

export function DokanXLogo({ variant = "full", size = "md" }: { variant?: "icon" | "full" | "mono"; size?: "sm" | "md" | "lg" }) {
  if (variant === "icon") {
    const frame = iconFrameMap[size];
    return (
      <View style={[styles.iconFrame, { width: frame.width, height: frame.height, borderRadius: frame.radius }]}> 
        <Image source={brandAssets.icon} style={styles.iconImage} resizeMode="cover" />
      </View>
    );
  }

  return <Image source={brandAssets[variant]} style={[styles.logo, sizeMap[variant][size]]} resizeMode="contain" />;
}

const styles = StyleSheet.create({
  logo: {
    alignSelf: "flex-start",
  },
  iconFrame: {
    alignSelf: "flex-start",
    overflow: "hidden",
    backgroundColor: "#0B1E3C",
  },
  iconImage: {
    width: "100%",
    height: "100%",
  },
});
