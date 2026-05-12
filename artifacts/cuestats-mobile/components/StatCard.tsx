import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";

interface StatCardProps {
  label: string;
  value: string | number;
  sublabel?: string;
  accent?: "primary" | "secondary" | "win" | "loss" | "default";
}

export function StatCard({ label, value, sublabel, accent = "default" }: StatCardProps) {
  const colors = useColors();

  const getAccentColor = () => {
    switch (accent) {
      case "primary": return colors.primary;
      case "secondary": return colors.secondary;
      case "win": return colors.win;
      case "loss": return colors.loss;
      default: return colors.foreground;
    }
  };

  const accentColor = getAccentColor();

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.accentBar, { backgroundColor: accentColor }]} />
      <Text style={[styles.label, { color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[styles.value, { color: accentColor }]}>{value}</Text>
      {sublabel ? (
        <Text style={[styles.sublabel, { color: colors.mutedForeground }]}>{sublabel}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    gap: 4,
    overflow: "hidden",
  },
  accentBar: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
  },
  label: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  value: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    lineHeight: 30,
  },
  sublabel: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
});
