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
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { StatCard } from "@/components/StatCard";
import { MatchRow } from "@/components/MatchRow";
import { apiGet, type Stats } from "@/lib/api";

export default function DashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const { data, isLoading, isError, refetch, isFetching } = useQuery<Stats>({
    queryKey: ["stats"],
    queryFn: () => apiGet<Stats>("/stats"),
  });

  const topInset = Platform.OS === "web" ? 67 : insets.top;

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
          Failed to load stats
        </Text>
        <Text
          onPress={() => refetch()}
          style={[styles.retryText, { color: colors.primary }]}
        >
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
          <Text style={[styles.heading, { color: colors.foreground }]}>Dashboard</Text>
          <Text style={[styles.subheading, { color: colors.mutedForeground }]}>
            Fremont Open · Billiards
          </Text>

          <View style={styles.statsGrid}>
            <StatCard
              label="Tournaments"
              value={data?.total_tournaments ?? 0}
              accent="primary"
            />
            <StatCard
              label="Players"
              value={data?.total_players ?? 0}
              accent="secondary"
            />
          </View>
          <View style={[styles.statsGrid, { marginTop: 8 }]}>
            <StatCard
              label="Matches"
              value={data?.total_matches ?? 0}
              accent="default"
            />
            <StatCard
              label="Top Win Rate"
              value={
                data?.players[0]
                  ? `${Math.round((data.players[0].win_rate ?? 0) * 100)}%`
                  : "—"
              }
              sublabel={data?.players[0]?.name ?? ""}
              accent="win"
            />
          </View>

          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
            RECENT MATCHES
          </Text>
        </>
      }
      data={data?.recent_matches ?? []}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <MatchRow match={item} />}
      ListEmptyComponent={
        <View style={styles.empty}>
          <Ionicons name="trophy-outline" size={40} color={colors.mutedForeground} />
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            No recent matches
          </Text>
        </View>
      }
      ItemSeparatorComponent={() => null}
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
  statsGrid: {
    flexDirection: "row",
    gap: 8,
  },
  sectionLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginTop: 28,
    marginBottom: 4,
    marginLeft: 4,
  },
  errorText: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    marginTop: 8,
  },
  retryText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    marginTop: 4,
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
