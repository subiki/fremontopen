import React from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { PlayerCard } from "@/components/PlayerCard";
import { apiGet, type Player } from "@/lib/api";

function PodiumCard({
  player,
  rank,
  height,
  onPress,
}: {
  player: Player;
  rank: 1 | 2 | 3;
  height: number;
  onPress: () => void;
}) {
  const colors = useColors();
  const rankColor = rank === 1 ? colors.gold : rank === 2 ? colors.silver : colors.bronze;
  const winRate = Math.round((player.win_rate ?? 0) * 100);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.podiumCard,
        { height, borderColor: rankColor + "44", opacity: pressed ? 0.8 : 1 },
      ]}
    >
      <View style={[styles.podiumBadge, { backgroundColor: rankColor + "33" }]}>
        <Text style={[styles.podiumMedal, { color: rankColor }]}>
          {rank === 1 ? "1" : rank === 2 ? "2" : "3"}
        </Text>
      </View>
      <Text style={[styles.podiumName, { color: colors.foreground }]} numberOfLines={2}>
        {player.name}
      </Text>
      <Text style={[styles.podiumRate, { color: rankColor }]}>{winRate}%</Text>
      <Text style={[styles.podiumRecord, { color: colors.mutedForeground }]}>
        {player.wins}W · {player.losses}L
      </Text>
    </Pressable>
  );
}

export default function LeaderboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const { data, isLoading, isError, refetch, isFetching } = useQuery<Player[]>({
    queryKey: ["leaderboard"],
    queryFn: () => apiGet<Player[]>("/leaderboard?limit=50"),
  });

  const topInset = Platform.OS === "web" ? 67 : insets.top;

  const top3 = data?.slice(0, 3) ?? [];
  const rest = data?.slice(3) ?? [];

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.destructive} />
        <Text style={[styles.errorText, { color: colors.mutedForeground }]}>
          Failed to load leaderboard
        </Text>
        <Text onPress={() => refetch()} style={[styles.retryText, { color: colors.primary }]}>
          Tap to retry
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[
        styles.container,
        {
          paddingTop: topInset + 16,
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
          <Text style={[styles.heading, { color: colors.foreground }]}>Leaderboard</Text>
          <Text style={[styles.subheading, { color: colors.mutedForeground }]}>
            Ranked by win rate
          </Text>

          {top3.length > 0 ? (
            <View style={styles.podium}>
              {top3[1] ? (
                <PodiumCard
                  player={top3[1]}
                  rank={2}
                  height={130}
                  onPress={() =>
                    router.push({ pathname: "/player/[name]", params: { name: top3[1]!.name } })
                  }
                />
              ) : null}
              {top3[0] ? (
                <PodiumCard
                  player={top3[0]}
                  rank={1}
                  height={160}
                  onPress={() =>
                    router.push({ pathname: "/player/[name]", params: { name: top3[0]!.name } })
                  }
                />
              ) : null}
              {top3[2] ? (
                <PodiumCard
                  player={top3[2]}
                  rank={3}
                  height={110}
                  onPress={() =>
                    router.push({ pathname: "/player/[name]", params: { name: top3[2]!.name } })
                  }
                />
              ) : null}
            </View>
          ) : null}

          {rest.length > 0 ? (
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
              MORE PLAYERS
            </Text>
          ) : null}
        </>
      }
      data={rest}
      keyExtractor={(item) => item.id}
      renderItem={({ item, index }) => (
        <PlayerCard
          player={item}
          rank={index + 4}
          onPress={() =>
            router.push({ pathname: "/player/[name]", params: { name: item.name } })
          }
        />
      )}
      ListEmptyComponent={
        top3.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="trophy-outline" size={40} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              No players yet
            </Text>
          </View>
        ) : null
      }
      showsVerticalScrollIndicator={false}
    />
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
  },
  heading: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    marginBottom: 2,
  },
  subheading: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginBottom: 20,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  podium: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    marginBottom: 24,
  },
  podiumCard: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "flex-end",
    paddingVertical: 10,
    paddingHorizontal: 6,
    gap: 3,
    backgroundColor: "#141923",
  },
  podiumBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  podiumMedal: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  podiumName: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    textAlign: "center",
  },
  podiumRate: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  podiumRecord: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
  },
  sectionLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 8,
    marginLeft: 4,
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
