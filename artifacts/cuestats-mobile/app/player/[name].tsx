import React from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useLocalSearchParams, Stack } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { StatCard } from "@/components/StatCard";
import { MatchRow } from "@/components/MatchRow";
import { apiGet, type PlayerDetail } from "@/lib/api";

export default function PlayerDetailScreen() {
  const { name } = useLocalSearchParams<{ name: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const encodedName = encodeURIComponent(name ?? "");
  const { data, isLoading, isError, refetch, isFetching } = useQuery<PlayerDetail>({
    queryKey: ["player", name],
    queryFn: () => apiGet<PlayerDetail>(`/players/${encodedName}`),
    enabled: !!name,
  });

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (isError || !data) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.destructive} />
        <Text style={[styles.errorText, { color: colors.mutedForeground }]}>
          Failed to load player
        </Text>
        <Text onPress={() => refetch()} style={[styles.retryText, { color: colors.primary }]}>
          Tap to retry
        </Text>
      </View>
    );
  }

  const player = data.player;
  const winRate = Math.round((player.win_rate ?? 0) * 100);

  return (
    <>
      <Stack.Screen
        options={{
          title: player.name,
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.foreground,
          headerTitleStyle: { fontFamily: "Inter_600SemiBold", fontSize: 17 },
        }}
      />
      <FlatList
        style={{ backgroundColor: colors.background }}
        contentContainerStyle={[
          styles.container,
          {
            paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 16,
          },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={isFetching && !isLoading}
            onRefresh={refetch}
            tintColor={colors.primary}
          />
        }
        ListHeaderComponent={
          <>
            <View style={[styles.heroCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.initialsCircle, { backgroundColor: colors.primary + "22" }]}>
                <Text style={[styles.initials, { color: colors.primary }]}>
                  {player.name
                    .split(" ")
                    .map((w) => w[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()}
                </Text>
              </View>
              <Text style={[styles.playerName, { color: colors.foreground }]}>{player.name}</Text>
              {player.fargo ? (
                <View style={[styles.fargoBadge, { backgroundColor: colors.secondary + "22" }]}>
                  <Text style={[styles.fargoText, { color: colors.secondary }]}>
                    Fargo {player.fargo}
                  </Text>
                </View>
              ) : null}
            </View>

            <View style={styles.statsGrid}>
              <StatCard label="Wins" value={player.wins} accent="win" />
              <StatCard label="Losses" value={player.losses} accent="loss" />
            </View>
            <View style={[styles.statsGrid, { marginTop: 8 }]}>
              <StatCard
                label="Win Rate"
                value={`${winRate}%`}
                accent={winRate >= 50 ? "win" : "loss"}
              />
              <StatCard
                label="Matches"
                value={player.wins + player.losses}
                accent="default"
              />
            </View>

            {data.head_to_head.length > 0 ? (
              <>
                <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
                  HEAD-TO-HEAD
                </Text>
                {data.head_to_head.slice(0, 5).map((h2h) => (
                  <View
                    key={h2h.opponent}
                    style={[styles.h2hRow, { backgroundColor: colors.card, borderColor: colors.border }]}
                  >
                    <Text style={[styles.h2hOpponent, { color: colors.foreground }]} numberOfLines={1}>
                      {h2h.opponent}
                    </Text>
                    <View style={styles.h2hRecord}>
                      <Text style={[styles.h2hWins, { color: colors.win }]}>{h2h.wins}W</Text>
                      <Text style={[styles.h2hSep, { color: colors.mutedForeground }]}> / </Text>
                      <Text style={[styles.h2hLosses, { color: colors.loss }]}>{h2h.losses}L</Text>
                    </View>
                  </View>
                ))}
              </>
            ) : null}

            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
              MATCH HISTORY
            </Text>
          </>
        }
        data={data.matches}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <MatchRow match={item} highlightPlayer={player.name} />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="trophy-outline" size={40} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              No match history
            </Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />
    </>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  container: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  heroCard: {
    alignItems: "center",
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
    gap: 8,
  },
  initialsCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  initials: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
  },
  playerName: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
  },
  fargoBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  fargoText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  statsGrid: {
    flexDirection: "row",
    gap: 8,
  },
  sectionLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginTop: 24,
    marginBottom: 8,
    marginLeft: 4,
  },
  h2hRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 6,
  },
  h2hOpponent: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    flex: 1,
  },
  h2hRecord: {
    flexDirection: "row",
    alignItems: "center",
  },
  h2hWins: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
  },
  h2hSep: {
    fontSize: 14,
  },
  h2hLosses: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
  },
  errorText: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  retryText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  empty: {
    alignItems: "center",
    padding: 32,
    gap: 8,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
});
