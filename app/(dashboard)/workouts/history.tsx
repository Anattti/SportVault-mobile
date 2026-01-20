import React, { useCallback, memo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Clock, Dumbbell, ChevronRight } from "lucide-react-native";

import { Colors } from "@/constants/Colors";
import { Spacing } from "@/constants/Layout";
import { Card } from "@/components/ui/Card";
import {
  useWorkoutHistory,
  WorkoutSession,
  formatVolume,
  formatDuration,
  formatDateShort,
  getWorkoutEmoji,
  getCompletionColor,
} from "@/hooks/useWorkoutHistory";

// ----- Session Card Component -----
interface SessionCardProps {
  session: WorkoutSession;
  onPress: () => void;
}

const SessionCard = memo(function SessionCard({ session, onPress }: SessionCardProps) {
  const completionColors = getCompletionColor(session.completionPercentage);
  const emoji = getWorkoutEmoji(session.workoutType);

  return (
    <Pressable onPress={onPress}>
      <Card style={styles.sessionCard} glass={false}>
        <View style={styles.cardContent}>
          {/* Left Column - Icon & Date */}
          <View style={styles.leftCol}>
            <View style={styles.iconBadge}>
              <Text style={styles.emojiIcon}>{emoji}</Text>
            </View>
            <Text style={styles.dateText}>
              {session.date ? formatDateShort(session.date) : "-"}
            </Text>
          </View>

          {/* Center Column - Info */}
          <View style={styles.centerCol}>
            <Text style={styles.workoutName} numberOfLines={1}>
              {session.workoutName || session.notes || "Treeni"}
            </Text>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Clock size={14} color={Colors.text.secondary} />
                <Text style={styles.statText}>
                  {formatDuration(session.duration || 0)}
                </Text>
              </View>
              <View style={styles.statItem}>
                <Dumbbell size={14} color={Colors.text.secondary} />
                <Text style={styles.statText}>
                  {formatVolume(session.total_volume || 0)}
                </Text>
              </View>
            </View>
          </View>

          {/* Right Column - Completion Badge & Arrow */}
          <View style={styles.rightCol}>
            <View
              style={[
                styles.percentageBadge,
                {
                  backgroundColor: completionColors.bgColor,
                  borderColor: completionColors.borderColor,
                },
              ]}
            >
              <Text style={[styles.percentageText, { color: completionColors.text }]}>
                {session.completionPercentage}%
              </Text>
            </View>
            <ChevronRight size={20} color={Colors.text.secondary} opacity={0.3} />
          </View>
        </View>
      </Card>
    </Pressable>
  );
});

// ----- Empty State Component -----
function EmptyState() {
  return (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>Ei aiempia treenejä.</Text>
    </View>
  );
}

// ----- Loading State Component -----
function LoadingState() {
  return <ActivityIndicator color={Colors.neon.DEFAULT} style={styles.loadingIndicator} />;
}

// ----- Main History Screen -----
export default function HistoryScreen() {
  const router = useRouter();
  const { sessions, isLoading, isRefetching, refresh } = useWorkoutHistory();

  // Refresh data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const handleSessionPress = useCallback(
    (sessionId: string) => {
      router.push(`/(dashboard)/workouts/session/${sessionId}`);
    },
    [router]
  );

  const renderItem = useCallback(
    ({ item }: { item: WorkoutSession }) => (
      <SessionCard session={item} onPress={() => handleSessionPress(item.id)} />
    ),
    [handleSessionPress]
  );

  const keyExtractor = useCallback((item: WorkoutSession) => item.id, []);

  const renderEmptyComponent = useCallback(() => {
    if (isLoading) {
      return <LoadingState />;
    }
    return <EmptyState />;
  }, [isLoading]);

  return (
    <View style={styles.container}>
      <FlatList
        data={sessions}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refresh}
            tintColor={Colors.neon.DEFAULT}
          />
        }
        ListEmptyComponent={renderEmptyComponent}
        // Performance optimizations
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        windowSize={10}
        initialNumToRender={10}
      />
    </View>
  );
}

// ----- Styles -----
const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 0,
    backgroundColor: Colors.background,
  },
  listContent: {
    padding: Spacing.horizontal,
    gap: 12,
    paddingBottom: 40,
  },
  sessionCard: {
    backgroundColor: "#111111",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
  },
  cardContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  leftCol: {
    alignItems: "center",
    marginRight: 16,
    width: 48,
  },
  iconBadge: {
    width: 40,
    height: 40,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emojiIcon: {
    fontSize: 20,
  },
  dateText: {
    color: Colors.text.secondary,
    fontSize: 12,
    fontWeight: "600",
    opacity: 0.6,
  },
  centerCol: {
    flex: 1,
    justifyContent: "center",
  },
  workoutName: {
    color: Colors.text.primary,
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 6,
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statText: {
    color: Colors.text.secondary,
    fontSize: 13,
    fontWeight: "500",
  },
  rightCol: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  percentageBadge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    minWidth: 64,
    alignItems: "center",
  },
  percentageText: {
    fontSize: 14,
    fontWeight: "800",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 100,
  },
  emptyText: {
    color: Colors.text.secondary,
    fontSize: 16,
  },
  loadingIndicator: {
    marginTop: 40,
  },
});
