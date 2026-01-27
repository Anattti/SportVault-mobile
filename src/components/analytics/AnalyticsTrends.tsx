import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Colors } from '@/constants/Colors';
import { TrendingUp, TrendingDown, Minus, AlertTriangle, Zap, Target } from 'lucide-react-native';
import { Spacing } from '@/constants/Layout';
import {
  getWeeklyVolumeTrend,
  detectVolumeSpike,
  detectPlateaus,
  getExerciseE1RMTrend,
  WorkoutSessionWithSets
} from '@/lib/analytics';

// Simple bar chart component from before
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

import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useQuery } from '@tanstack/react-query';

// ... (imports remain)

export function AnalyticsTrends() {
  const { t } = useTranslation();
  const { user } = useAuth();

  const { data: sessions, isLoading } = useQuery({
    queryKey: ['analytics_trends', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const sessionsWithDetails: WorkoutSessionWithSets[] = [];
      
      const { data: sessionData, error } = await supabase
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

      if (error) throw error;

      for (const session of sessionData || []) {
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
      
      // Sort desc
      sessionsWithDetails.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      return sessionsWithDetails;
    },
    enabled: !!user,
  });

  // ... (rest of the component uses `sessions` from useQuery instead of props)

  const weeklyVolume = useMemo(() => {
    if (!sessions) return [];
    return getWeeklyVolumeTrend(sessions, 8);
  }, [sessions]);

  const volumeSpike = useMemo(() => {
    if (!sessions) return null;
    return detectVolumeSpike(sessions);
  }, [sessions]);

  const plateaus = useMemo(() => {
    if (!sessions) return [];
    
    const exerciseMap = new Map<string, { date: string; sets: any[] }[]>();
    
    for (const session of sessions) {
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
  }, [sessions]);

  const e1rmTrends = useMemo(() => {
    if (!sessions) return [];
    
    const exerciseMap = new Map<string, { date: string; sets: any[] }[]>();
    
    for (const session of sessions) {
      for (const exercise of session.exercises) {
        const existing = exerciseMap.get(exercise.name) || [];
        existing.push({
          date: session.date,
          sets: exercise.sets,
        });
        exerciseMap.set(exercise.name, existing);
      }
    }

    const sorted = Array.from(exerciseMap.entries())
      .filter(([_, sessions]) => sessions.length >= 3)
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 5);

    return sorted.map(([name, sessions]) => getExerciseE1RMTrend(name, sessions));
  }, [sessions]);

  const formatVolume = (kg: number) => {
      if (kg >= 1000) return `${(kg / 1000).toFixed(1)}`;
      return `${kg}`;
  };
  
  const maxVolume = Math.max(...weeklyVolume.map(v => v.volume), 1);

  return (
    <View>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{t('analytics.title')}</Text>
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
    </View>
  );
}

const styles = StyleSheet.create({
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text.primary,
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
