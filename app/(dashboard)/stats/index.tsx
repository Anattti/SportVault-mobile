import { View, Text, StyleSheet, ScrollView, SafeAreaView, ActivityIndicator, RefreshControl } from "react-native";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Colors } from "@/constants/Colors";
import { Spacing } from "@/constants/Layout";
import { Card, CardContent } from "@/components/ui/Card";
import { BarChart3, Clock, Weight, TrendingUp, Target, Plus, TrendingDown } from "lucide-react-native";
import { Button } from "@/components/ui/Button";
import { useStatsData } from "@/hooks/useStatsData";

interface StatCardProps {
  title: string;
  value: string;
  subValue?: string;
  icon: React.ReactNode;
  trend?: string;
  trendType?: "up" | "down" | "warning";
}

function StatCard({ title, value, subValue, icon, trend, trendType }: StatCardProps) {
  const TrendIcon = trendType === "down" ? TrendingDown : TrendingUp;
  const trendColor = trendType === "warning" || trendType === "down" ? "#F59E0B" : Colors.neon.DEFAULT;
  
  return (
    <Card style={styles.statCard} glass={true}>
      <CardContent style={styles.statContent}>
        <View style={styles.statTop}>
          <Text style={styles.statLabel}>{title}</Text>
          {icon}
        </View>
        <View style={styles.statMiddle}>
          <Text style={styles.statValue}>{value}</Text>
          {subValue && <Text style={styles.statSubValue}>{subValue}</Text>}
        </View>
        {trend && (
          <View style={styles.trendRow}>
            <TrendIcon size={12} color={trendColor} />
            <Text style={[
              styles.trendText, 
              (trendType === "warning" || trendType === "down") && styles.trendWarning
            ]}>
              {trend}
            </Text>
          </View>
        )}
      </CardContent>
    </Card>
  );
}

function formatDuration(totalSeconds: number, t: any): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  if (h > 0) {
    return `${h}${t('workouts.hours')} ${m}${t('workouts.minutes')}`;
  }
  return `${m}${t('workouts.minutes')}`;
}

function formatVolume(kg: number, t: any): string {
  if (kg >= 1000) {
    return `${(kg / 1000).toFixed(1)}k ${t('calculator.unit_kg')}`;
  }
  return `${Math.round(kg)} ${t('calculator.unit_kg')}`;
}

export default function StatsScreen() {
  const { t } = useTranslation();
  const { data, isLoading, refetch, isRefetching } = useStatsData();

  const onRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{t('stats.title')}</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.neon.DEFAULT} />
        </View>
      </SafeAreaView>
    );
  }

  const currentWeek = data?.currentWeek ?? { sessionCount: 0, totalDuration: 0, totalVolume: 0 };
  const progressionPercent = data?.progressionPercent ?? 0;
  const goals = data?.goals ?? [];

  const progressionTrendType = progressionPercent < 0 ? "down" : progressionPercent === 0 ? "warning" : "up";

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('stats.title')}</Text>
      </View>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor={Colors.neon.DEFAULT} />
        }
      >
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('stats.overview')}</Text>
        </View>

        <View style={styles.grid}>
          <StatCard 
            title={t('stats.weekly_workouts')} 
            value={String(currentWeek.sessionCount)} 
            icon={<BarChart3 size={20} color={Colors.neon.DEFAULT} />}
          />
          <StatCard 
            title={t('stats.weekly_duration')} 
            value={formatDuration(currentWeek.totalDuration, t)} 
            icon={<Clock size={20} color={Colors.neon.DEFAULT} />}
          />
          <StatCard 
            title={t('stats.weekly_volume')} 
            value={formatVolume(currentWeek.totalVolume, t)} 
            icon={<Weight size={20} color={Colors.neon.DEFAULT} />}
          />
          <StatCard 
            title={t('stats.progression')} 
            value={`${progressionPercent >= 0 ? "+" : ""}${progressionPercent.toFixed(1)}%`} 
            trend={t('stats.vs_last_week')}
            trendType={progressionTrendType}
            icon={<TrendingUp size={20} color={Colors.neon.DEFAULT} />}
          />
        </View>

        <View style={styles.sectionHeader}>
          <View style={styles.titleWithIcon}>
            <Target size={20} color={Colors.neon.DEFAULT} />
            <Text style={styles.sectionTitle}>{t('stats.goals')}</Text>
          </View>
          <Button variant="ghost" size="sm" style={styles.addBtn}>
            <Plus size={16} color={Colors.neon.DEFAULT} />
            <Text style={styles.addBtnText}>{t('stats.new_goal')}</Text>
          </Button>
        </View>

        {goals.length === 0 ? (
          <Card style={styles.goalCard} glass={true}>
            <CardContent style={styles.goalContent}>
              <Text style={styles.emptyGoalsText}>{t('stats.no_active_goals')}</Text>
            </CardContent>
          </Card>
        ) : (
          goals.map((goal) => {
            const percentage = goal.target_value > 0 
              ? Math.min(100, Math.round((goal.current_value / goal.target_value) * 100))
              : 0;
            
            return (
              <Card key={goal.id} style={styles.goalCard} glass={true}>
                <CardContent style={styles.goalContent}>
                  <View style={styles.goalTop}>
                    <Text style={styles.goalTitle}>{goal.title}</Text>
                    <Text style={styles.goalPercentage}>{percentage}%</Text>
                  </View>
                  <View style={styles.goalMeta}>
                    <Text style={styles.goalProgressText}>
                      {goal.current_value} <Text style={styles.goalUnit}>/ {goal.target_value} {goal.unit}</Text>
                    </Text>
                  </View>
                  <View style={styles.progressTrack}>
                    <View style={[styles.progressBar, { width: `${percentage}%` }]} />
                  </View>
                </CardContent>
              </Card>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: Spacing.horizontal,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "900",
    color: Colors.text.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 16,
    marginBottom: 16,
  },
  titleWithIcon: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.text.primary,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
  },
  statCard: {
    width: "48%",
    minHeight: 140,
  },
  statContent: {
    padding: 16,
    justifyContent: "space-between",
    height: "100%",
  },
  statTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  statLabel: {
    color: Colors.text.secondary,
    fontSize: 12,
    flex: 1,
    marginRight: 4,
  },
  statMiddle: {
    marginTop: 8,
  },
  statValue: {
    color: Colors.neon.DEFAULT,
    fontSize: 24,
    fontWeight: "800",
  },
  statSubValue: {
    color: Colors.text.secondary,
    fontSize: 12,
  },
  trendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  trendText: {
    color: Colors.neon.DEFAULT,
    fontSize: 10,
    fontWeight: "600",
  },
  trendWarning: {
    color: "#F59E0B",
  },
  addBtn: {
    flexDirection: "row",
    gap: 4,
  },
  addBtnText: {
    color: Colors.neon.DEFAULT,
    fontWeight: "600",
  },
  goalCard: {
    width: "100%",
    marginBottom: 12,
  },
  goalContent: {
    padding: 20,
  },
  goalTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  goalTitle: {
    color: Colors.text.primary,
    fontSize: 18,
    fontWeight: "700",
  },
  goalPercentage: {
    color: Colors.neon.DEFAULT,
    fontSize: 18,
    fontWeight: "800",
  },
  goalMeta: {
    marginBottom: 16,
  },
  goalProgressText: {
    color: Colors.text.primary,
    fontSize: 24,
    fontWeight: "800",
  },
  goalUnit: {
    color: Colors.text.secondary,
    fontSize: 14,
    fontWeight: "400",
  },
  progressTrack: {
    height: 8,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    backgroundColor: Colors.neon.DEFAULT,
    borderRadius: 4,
  },
  emptyGoalsText: {
    color: Colors.text.secondary,
    fontSize: 14,
    textAlign: "center",
  },
});
