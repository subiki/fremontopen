import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import type { Player } from "@/lib/api";

interface PlayerCardProps {
  player: Player;
  rank?: number;
  onPress?: () => void;
}

export function PlayerCard({ player, rank, onPress }: PlayerCardProps) {
  const colors = useColors();

  const getRankColor = (r?: number) => {
    if (r === 1) return colors.gold;
    if (r === 2) return colors.silver;
    if (r === 3) return colors.bronze;
    return colors.mutedForeground;
  };

  const winRate = Math.round((player.win_rate ?? 0) * 100);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          opacity: pressed ? 0.75 : 1,
        },
      ]}
    >
      {rank ? (
        <View style={[styles.rankBadge, { borderColor: getRankColor(rank) }]}>
          <Text style={[styles.rankText, { color: getRankColor(rank) }]}>#{rank}</Text>
        </View>
      ) : null}
      <View style={styles.info}>
        <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>
          {player.name}
        </Text>
        <View style={styles.statsRow}>
          <Text style={[styles.stat, { color: colors.win }]}>
            {player.wins}W
          </Text>
          <Text style={[styles.statSep, { color: colors.mutedForeground }]}> / </Text>
          <Text style={[styles.stat, { color: colors.loss }]}>
            {player.losses}L
          </Text>
          {player.fargo ? (
            <>
              <Text style={[styles.statSep, { color: colors.mutedForeground }]}> · </Text>
              <Text style={[styles.fargo, { color: colors.secondary }]}>
                FR {player.fargo}
              </Text>
            </>
          ) : null}
        </View>
      </View>
      <View style={styles.right}>
        <Text style={[styles.winRate, { color: winRate >= 50 ? colors.win : colors.loss }]}>
          {winRate}%
        </Text>
        <Ionicons name="chevron-forward" size={14} color={colors.mutedForeground} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
    marginBottom: 8,
  },
  rankBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  rankText: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
  },
  info: {
    flex: 1,
    gap: 3,
  },
  name: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  stat: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  statSep: {
    fontSize: 12,
  },
  fargo: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  right: {
    alignItems: "center",
    flexDirection: "row",
    gap: 2,
  },
  winRate: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
  },
});
