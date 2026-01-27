/**
 * Analytics Screen
 * Displays training statistics, volume trends, and plateau warnings
 */

import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp, TrendingDown, Minus, AlertTriangle, Zap, Target } from 'lucide-react-native';

import { Colors } from '@/constants/Colors';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import {
  getWeeklyVolumeTrend,
  detectVolumeSpike,
  detectPlateaus,
  getExerciseE1RMTrend,
  type WorkoutSessionWithSets,
} from '@/lib/analytics';
import { DashboardHeader } from '@/components/layout/DashboardHeader';
import { Spacing } from '@/constants/Layout';

// Simple bar chart component
function SimpleBarChart({ data, maxValue }: { data: { label: string; value: number }[]; maxValue: number }) {
  return (
    <View style={chartStyles.container}>
      {data.map((item, index) => {
        const barHeight = maxValue > 0 ? (item.value / maxValue) * 100 : 0;
        return (
          <View key={index} style={chartStyles.barContainer}>
            <View style={chartStyles.barWrapper}>
              <View 
                style={[
                  chartStyles.bar, 
                  { height: `${Math.max(barHeight, 2)}%` }
                ]} 
              />
            </View>
            <Text style={chartStyles.label}>{item.label}</Text>
          </View>
        );
      })}
    </View>
  );
}

const chartStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 120,
    paddingTop: 16,
  },
  barContainer: {
    flex: 1,
    alignItems: 'center',
  },
  barWrapper: {
    height: 100,
    width: '60%',
    justifyContent: 'flex-end',
  },
  bar: {
    width: '100%',
    backgroundColor: Colors.neon.DEFAULT,
    borderRadius: 4,
    minHeight: 2,
  },
  label: {
    fontSize: 10,
    color: Colors.text.secondary,
    marginTop: 8,
  },
});

export default function AnalyticsScreen() {
  const { t } = useTranslation();
  const { user } = useAuth();

  const { data: analyticsData, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['analytics', user?.id],
    queryFn: async () => {
      if (!user) return null;

      const sessionsWithDetails: WorkoutSessionWithSets[] = [];


      // 1. Fetch workout sessions (new format)
      const { data: sessions, error: sessionsError } = await supabase
        .from('workout_sessions')
        .select(`
          id,
          date,
          duration,
          total_volume,
          workout_id,
          created_at
        `)
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .limit(100);

      if (sessionsError) throw sessionsError;

      // Fetch session exercises and sets for each session
      for (const session of sessions || []) {

        
        const { data: exercises } = await supabase
          .from('session_exercises')
          .select(`
            id,
            name,
            session_sets (
              weight_used,
              reps_completed
            )
          `)
          .eq('session_id', session.id);

        // Get exercise categories from the original exercises table (optional, used for broad categorizing)
        // Optimization: Could batch fetch or just store category in session_exercises if needed.
        // For now, defaulting category to null or basic inference if needed later.

        sessionsWithDetails.push({
          id: session.id,
          date: session.date || session.created_at || '',
          duration: session.duration || 0,
          total_volume: session.total_volume || 0,
          exercises: (exercises || []).map(ex => ({
            name: ex.name,
            category: null, 
            sets: (ex.session_sets || []).map((s: any) => ({
              weight_used: s.weight_used || 0,
              reps_completed: s.reps_completed || 0,
            })),
          })),
        });
      }

      // Legacy fetching removed as per request.
      
      sessionsWithDetails.sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        return dateB - dateA;
      });

      return sessionsWithDetails;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  const weeklyVolume = useMemo(() => {
    if (!analyticsData) return [];
    return getWeeklyVolumeTrend(analyticsData, 8);
  }, [analyticsData]);

  const volumeSpike = useMemo(() => {
    if (!analyticsData) return null;
    return detectVolumeSpike(analyticsData);
  }, [analyticsData]);

  const plateaus = useMemo(() => {
    if (!analyticsData) return [];
    
    const exerciseMap = new Map<string, { date: string; sets: any[] }[]>();
    
    for (const session of analyticsData) {
      for (const exercise of session.exercises) {
        const existing = exerciseMap.get(exercise.name) || [];
        existing.push({
          date: session.date,
          sets: exercise.sets,
        });
        exerciseMap.set(exercise.name, existing);
      }
    }

    const histories = Array.from(exerciseMap.entries()).map(([name, sessions]) => ({
      exerciseName: name,
      sessions,
    }));

    return detectPlateaus(histories);
  }, [analyticsData]);

  const e1rmTrends = useMemo(() => {
    if (!analyticsData) return [];
    
    const exerciseMap = new Map<string, { date: string; sets: any[] }[]>();
    
    for (const session of analyticsData) {
      for (const exercise of session.exercises) {
        const existing = exerciseMap.get(exercise.name) || [];
        existing.push({
          date: session.date,
          sets: exercise.sets,
        });
        exerciseMap.set(exercise.name, existing);
      }
    }

    // Filter out exercises with too few sessions to be meaningful (e.g., < 3)
    // And pick top 5 most frequent
    const sorted = Array.from(exerciseMap.entries())
      .filter(([_, sessions]) => sessions.length >= 3)
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 5);

    return sorted.map(([name, sessions]) => getExerciseE1RMTrend(name, sessions));
  }, [analyticsData]);

  const formatVolume = (kg: number) => {
      if (kg >= 1000) return `${(kg / 1000).toFixed(1)}`;
      return `${kg}`;
  };
  
  const maxVolume = Math.max(...weeklyVolume.map(v => v.volume), 1);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={Colors.neon.DEFAULT} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.mainContainer}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={Colors.neon.DEFAULT}
          />
        }
      >
        <View style={styles.headerSpacer} />
        
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{t('analytics.title')}</Text>
          <Text style={styles.headerSubtitle}>
            {t('analytics.workouts_analyzed', { count: analyticsData?.length || 0 })}
          </Text>
        </View>

        {/* Volume Spike Alert */}
        {volumeSpike?.hasSpike && (
          <View style={styles.alertCard}>
            <View style={styles.alertHeader}>
              <AlertTriangle size={20} color="#F59E0B" />
              <Text style={styles.alertTitle}>{t('analytics.volume_increased')}</Text>
            </View>
            <Text style={styles.alertText}>
              {t('analytics.volume_spike_desc', { percent: Math.round(volumeSpike.percentChange) })}
            </Text>
          </View>
        )}

        {/* Weekly Volume Chart */}
        <View style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <View style={styles.chartTitleRow}>
              <Zap size={18} color={Colors.neon.DEFAULT} />
              <Text style={styles.chartTitle}>{t('analytics.weekly_volume')}</Text>
            </View>
            {weeklyVolume.length > 0 && (
              <Text style={styles.chartValue}>
                {formatVolume(weeklyVolume[weeklyVolume.length - 1]?.volume || 0)} {t('analytics.ton')}
              </Text>
            )}
          </View>

          {weeklyVolume.length > 0 ? (
            <SimpleBarChart
              data={weeklyVolume.map(v => ({ label: v.label, value: v.volume }))}
              maxValue={maxVolume}
            />
          ) : (
            <Text style={styles.noDataText}>{t('analytics.not_enough_data')}</Text>
          )}
        </View>

        {/* E1RM Trends */}
        <View style={styles.sectionHeader}>
          <Target size={18} color={Colors.text.primary} />
          <Text style={styles.sectionTitle}>{t('analytics.one_rm_progression')}</Text>
        </View>

        {e1rmTrends.length > 0 ? (
          e1rmTrends.map((trend) => (
            <View key={trend.exerciseName} style={styles.trendCard}>
              <View style={styles.trendHeader}>
                <Text style={styles.trendExercise}>{trend.exerciseName}</Text>
                <View style={styles.trendIndicator}>
                  {trend.trend === 'up' && <TrendingUp size={16} color={Colors.neon.DEFAULT} />}
                  {trend.trend === 'down' && <TrendingDown size={16} color="#EF4444" />}
                  {trend.trend === 'stable' && <Minus size={16} color={Colors.text.secondary} />}
                </View>
              </View>
              <View style={styles.trendStats}>
                <View style={styles.trendStat}>
                  <Text style={styles.trendStatLabel}>{t('analytics.current')}</Text>
                  <Text style={styles.trendStatValue}>{trend.currentE1RM} {t('calculator.unit_kg')}</Text>
                </View>
                <View style={styles.trendStat}>
                  <Text style={styles.trendStatLabel}>{t('analytics.pr')}</Text>
                  <Text style={[styles.trendStatValue, { color: Colors.neon.DEFAULT }]}>
                    {trend.bestE1RM} {t('calculator.unit_kg')}
                  </Text>
                </View>
              </View>
            </View>
          ))
        ) : (
          <Text style={styles.noDataText}>{t('analytics.not_enough_workout_data')}</Text>
        )}

        {/* Plateau Warnings */}
        {plateaus.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <AlertTriangle size={18} color="#F59E0B" />
              <Text style={styles.sectionTitle}>{t('analytics.plateau_warnings')}</Text>
            </View>

            {plateaus.map((plateau, index) => (
              <View key={index} style={styles.plateauCard}>
                <Text style={styles.plateauExercise}>{plateau.exerciseName}</Text>
                <Text style={styles.plateauDuration}>
                  {t('analytics.weeks_without_progress', { weeks: plateau.stagnantWeeks })}
                </Text>
                <Text style={styles.plateauSuggestion}>
                  {t(plateau.suggestionKey, plateau.suggestionParams) as string}
                </Text>
              </View>
            ))}
          </>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.horizontal,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSpacer: {
    height: 12, // Space between top and first card (or DashboardHeader handles it?)
    // Actually DashboardHeader is global now so we don't render it here 
    // BUT analytics/index.tsx might need padding top if global header is present.
    // _layout.tsx says !isFullscreen && <DashboardHeader />
    // analytics/index DOES have DashboardHeader.
    // The previous implementation did not include DashboardHeader in the render.
    // The global _layout handles it. So we just need padding.
  },
  header: {
    marginTop: 12,
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: Colors.text.primary,
    fontFamily: 'InstrumentSans-Bold',
  },
  headerSubtitle: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginTop: 4,
  },
  alertCard: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.2)',
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F59E0B',
  },
  alertText: {
    fontSize: 14,
    color: Colors.text.secondary,
    lineHeight: 20,
  },
  chartCard: {
    backgroundColor: Colors.card.background,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  chartTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  chartValue: {
    fontSize: 24,
    fontWeight: '900',
    color: Colors.neon.DEFAULT,
    fontFamily: 'InstrumentSans-Bold',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text.primary,
    fontFamily: 'InstrumentSans-Bold',
  },
  trendCard: {
    backgroundColor: Colors.card.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  trendHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  trendExercise: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  trendIndicator: {
    padding: 4,
  },
  trendStats: {
    flexDirection: 'row',
    gap: 24,
  },
  trendStat: {},
  trendStatLabel: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginBottom: 2,
  },
  trendStatValue: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.text.primary,
    fontFamily: 'InstrumentSans-Bold',
  },
  plateauCard: {
    backgroundColor: 'rgba(245, 158, 11, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.1)',
  },
  plateauExercise: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 4,
  },
  plateauDuration: {
    fontSize: 14,
    color: '#F59E0B',
    marginBottom: 8,
  },
  plateauSuggestion: {
    fontSize: 13,
    color: Colors.text.secondary,
    lineHeight: 18,
  },
  noDataText: {
    fontSize: 14,
    color: Colors.text.secondary,
    textAlign: 'center',
    padding: 20,
  },
});
