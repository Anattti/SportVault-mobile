import React, { useCallback, memo } from "react";
import { useTranslation } from "react-i18next";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  InteractionManager,
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
import { DashboardHeader } from "@/components/layout/DashboardHeader";

// ----- Session Card Component -----
interface SessionCardProps {
  session: WorkoutSession;
  onPress: () => void;
  t: (key: string) => string;
  locale: string;
}

const SessionCard = memo(function SessionCard({ session, onPress, t, locale }: SessionCardProps) {
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
              {session.date ? formatDateShort(session.date, locale) : "-"}
            </Text>
          </View>

          {/* Center Column - Info */}
          <View style={styles.centerCol}>
            <Text style={styles.workoutName} numberOfLines={1}>
              {session.workoutName || session.notes || t('history.default_session_name')}
            </Text>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Clock size={14} color={Colors.text.secondary} />
                <Text style={styles.statText}>
                  {formatDuration(session.duration || 0, t)}
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
  const { t } = useTranslation();
  return (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>{t('history.empty_sessions')}</Text>
    </View>
  );
}

import { Skeleton } from "@/components/ui/Skeleton";

// ----- Loading State Component -----
function LoadingState() {
  return (
    <View style={styles.loadingContainer}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Card key={i} style={styles.sessionCard} glass={false}>
          <View style={styles.cardContent}>
            <View style={styles.leftCol}>
              <Skeleton width={40} height={40} variant="rounded" style={{ marginBottom: 4 }} />
              <Skeleton width={30} height={12} variant="rounded" />
            </View>
            <View style={styles.centerCol}>
              <Skeleton width="80%" height={20} variant="rounded" style={{ marginBottom: 8 }} />
              <View style={styles.statsRow}>
                <Skeleton width={60} height={14} variant="rounded" />
                <Skeleton width={60} height={14} variant="rounded" />
              </View>
            </View>
            <View style={styles.rightCol}>
              <Skeleton width={64} height={32} variant="rounded" />
            </View>
          </View>
        </Card>
      ))}
    </View>
  );
}

import { FlashList } from "@shopify/flash-list";

// ... (other imports)

// ----- Main History Screen -----
export default function HistoryScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { sessions, isLoading, isRefetching, refresh } = useWorkoutHistory();

  // Refresh data when screen comes into focus

  const handleSessionPress = useCallback(
    (sessionId: string) => {
      router.push(`/(dashboard)/workouts/session/${sessionId}`);
    },
    [router]
  );

  const renderItem = useCallback(
    ({ item }: { item: WorkoutSession }) => (
      <SessionCard 
        session={item} 
        onPress={() => handleSessionPress(item.id)}
        t={t}
        locale={i18n.language}
      />
    ),
    [handleSessionPress, t, i18n.language]
  );

  const keyExtractor = useCallback((item: WorkoutSession) => item.id, []);

  const renderEmptyComponent = useCallback(() => {
    if (isLoading) {
      return <LoadingState />;
    }
    return <EmptyState />;
  }, [isLoading]);

  const renderSeparator = useCallback(() => <View style={{ height: 12 }} />, []);

  return (
    <View style={styles.container}>
      <DashboardHeader />
      <View style={{ flex: 1, paddingHorizontal: Spacing.horizontal }}>
        <FlashList
          data={sessions}
          renderItem={renderItem}
          ItemSeparatorComponent={renderSeparator}
          keyExtractor={keyExtractor}
          // @ts-ignore
          estimatedItemSize={120} // Estimated height of SessionCard
          drawDistance={2400}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refresh}
              tintColor={Colors.neon.DEFAULT}
            />
          }
          ListEmptyComponent={renderEmptyComponent}
          contentContainerStyle={{ paddingBottom: 40, paddingTop: 12 }}
        />
      </View>
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
    backgroundColor: Colors.card.background,
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
  loadingContainer: {
    gap: 12,
  },
});
