import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";
import type { Match } from "@/lib/api";

interface MatchRowProps {
  match: Match;
  highlightPlayer?: string;
}

export function MatchRow({ match, highlightPlayer }: MatchRowProps) {
  const colors = useColors();

  const isHighlightWin = highlightPlayer && match.winner_name === highlightPlayer;
  const isHighlightLoss = highlightPlayer && match.loser_name === highlightPlayer;

  const winColor = colors.win;
  const lossColor = colors.loss;

  const resultColor = isHighlightWin ? winColor : isHighlightLoss ? lossColor : colors.mutedForeground;
  const resultLabel = isHighlightWin ? "W" : isHighlightLoss ? "L" : null;

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return "";
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    } catch {
      return "";
    }
  };

  return (
    <View style={[styles.row, { borderBottomColor: colors.border }]}>
      <View style={styles.players}>
        <View style={styles.playerRow}>
          <View style={[styles.dot, { backgroundColor: winColor }]} />
          <Text style={[styles.playerName, { color: colors.foreground }]} numberOfLines={1}>
            {match.winner_name ?? "—"}
          </Text>
        </View>
        <View style={styles.playerRow}>
          <View style={[styles.dot, { backgroundColor: lossColor, opacity: 0.5 }]} />
          <Text style={[styles.playerName, { color: colors.mutedForeground }]} numberOfLines={1}>
            {match.loser_name ?? "—"}
          </Text>
        </View>
      </View>
      <View style={styles.meta}>
        {match.scores ? (
          <Text style={[styles.scores, { color: colors.foreground }]}>{match.scores}</Text>
        ) : null}
        {match.tournament_name ? (
          <Text style={[styles.tournament, { color: colors.mutedForeground }]} numberOfLines={1}>
            {match.tournament_name}
          </Text>
        ) : null}
        <Text style={[styles.date, { color: colors.mutedForeground }]}>
          {formatDate(match.completed_at)}
        </Text>
      </View>
      {resultLabel ? (
        <View style={[styles.badge, { backgroundColor: resultColor + "22" }]}>
          <Text style={[styles.badgeText, { color: resultColor }]}>{resultLabel}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  players: {
    flex: 1,
    gap: 4,
  },
  playerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  playerName: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    flex: 1,
  },
  meta: {
    alignItems: "flex-end",
    gap: 2,
  },
  scores: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
  },
  tournament: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    maxWidth: 100,
  },
  date: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
  },
  badge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
  },
});
