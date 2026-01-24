import React from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, TextInput, Pressable, StyleSheet, Platform } from 'react-native';
import { MessageSquare, Minus, Plus } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/constants/Colors';
import type { WorkoutExercise, WorkoutSet, SetResult } from '@/types';

interface ActiveExerciseCardProps {
  exercise: WorkoutExercise;
  setIndex: number;
  result: SetResult;
  oneRM?: number;
  onWeightChange: (weight: number) => void;
  onRepsChange: (reps: number) => void;
  onToggleNotes?: () => void;
  notesVisible?: boolean;
}

const WEIGHT_INCREMENTS = [1.25, 2.5, 5];
const REP_PRESETS = [5, 8, 10, 12];

export function ActiveExerciseCard({
  exercise,
  setIndex,
  result,
  oneRM,
  onWeightChange,
  onRepsChange,
  onToggleNotes,
  notesVisible,
}: ActiveExerciseCardProps) {
  const { t } = useTranslation();
  const currentSet = exercise.sets[setIndex];
  const totalSets = exercise.sets.length;

  const adjustWeight = (amount: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onWeightChange(Math.max(0, result.weight + amount));
  };

  const adjustReps = (amount: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onRepsChange(Math.max(0, result.reps + amount));
  };

  const handleWeightPreset = (inc: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    adjustWeight(inc);
  };

  const handleRepPreset = (rep: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onRepsChange(rep);
  };

  return (
    <View style={styles.container}>
      {/* Exercise Header */}
      <View style={styles.header}>
        <View style={styles.exerciseInfo}>
          <Text style={styles.exerciseIcon}>🏋️</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.exerciseName}>{exercise.name}</Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          {onToggleNotes && (
             <Pressable 
               style={[styles.noteButton, notesVisible && styles.noteButtonActive]}
               onPress={onToggleNotes}
             >
               <MessageSquare size={18} color={notesVisible ? Colors.neon.DEFAULT : Colors.text.muted} />
             </Pressable>
          )}
          <View style={styles.setsBadge}>
            <Text style={styles.setsText}>{t('session.exercise_card.set_num', { num: setIndex + 1 })}/{totalSets}</Text>
          </View>
        </View>
      </View>

      {/* 1RM Badge */}
      {oneRM && (
        <View style={styles.oneRmBadge}>
          <Text style={styles.oneRmLabel}>{t('calculator.title_short', '1RM')}</Text>
          <Text style={styles.oneRmValue}>{oneRM} {t('calculator.unit_kg')}</Text>
        </View>
      )}

      {/* Input Section */}
      <View style={styles.inputsRow}>
        {/* Weight Input */}
        <View style={styles.inputCard}>
          <View style={styles.inputHeader}>
            <Text style={styles.inputIcon}>🏋️</Text>
            <Text style={styles.inputLabel}>{t('session.exercise_card.weight').toUpperCase()}</Text>
          </View>
          <View style={styles.inputValueRow}>
            <Pressable 
              style={styles.adjustButton}
              onPress={() => adjustWeight(-2.5)}
            >
              <Minus size={20} color={Colors.text.primary} />
            </Pressable>
            <View style={styles.inputValueContainer}>
              <Text style={styles.inputValue}>{result.weight}</Text>
              <Text style={styles.inputUnit}>{t('calculator.unit_kg')}</Text>
            </View>
            <Pressable 
              style={styles.adjustButton}
              onPress={() => adjustWeight(2.5)}
            >
              <Plus size={20} color={Colors.text.primary} />
            </Pressable>
          </View>
          <View style={styles.quickButtons}>
            {WEIGHT_INCREMENTS.map((inc) => (
              <Pressable
                key={inc}
                style={styles.quickButton}
                onPress={() => handleWeightPreset(inc)}
              >
                <Text style={styles.quickButtonText}>+{inc}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Reps Input */}
        <View style={styles.inputCard}>
          <View style={styles.inputHeader}>
            <Text style={styles.inputIcon}>⇆</Text>
            <Text style={styles.inputLabel}>{t('session.exercise_card.reps').toUpperCase()}</Text>
          </View>
          <View style={styles.inputValueRow}>
            <Pressable 
              style={styles.adjustButton}
              onPress={() => adjustReps(-1)}
            >
              <Minus size={20} color={Colors.text.primary} />
            </Pressable>
            <View style={styles.inputValueContainer}>
              <Text style={styles.inputValue}>{result.reps}</Text>
              <Text style={styles.inputUnit}>{t('session.exercise_card.unit_pcs')}</Text>
            </View>
            <Pressable 
              style={styles.adjustButton}
              onPress={() => adjustReps(1)}
            >
              <Plus size={20} color={Colors.text.primary} />
            </Pressable>
          </View>
          <View style={styles.quickButtons}>
            {REP_PRESETS.map((rep) => (
              <Pressable
                key={rep}
                style={[
                  styles.quickButton,
                  result.reps === rep && styles.quickButtonActive,
                ]}
                onPress={() => handleRepPreset(rep)}
              >
                <Text style={[
                  styles.quickButtonText,
                  result.reps === rep && styles.quickButtonTextActive,
                ]}>{rep}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.card.DEFAULT,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border.default,
    padding: 16,
    gap: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  exerciseInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  exerciseIcon: {
    fontSize: 20,
  },
  exerciseName: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text.primary,
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  noteButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.glass.DEFAULT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  setsBadge: {
    backgroundColor: Colors.glass.DEFAULT,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  setsText: {
    color: Colors.text.secondary,
    fontSize: 13,
    fontWeight: '600',
  },
  oneRmBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.neon.faint,
    borderWidth: 1,
    borderColor: Colors.neon.border,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  oneRmLabel: {
    color: Colors.text.muted,
    fontSize: 11,
    fontWeight: '700',
  },
  oneRmValue: {
    color: Colors.neon.DEFAULT,
    fontSize: 13,
    fontWeight: '700',
  },
  inputsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  inputCard: {
    flex: 1,
    backgroundColor: '#111',
    borderRadius: 16,
    padding: 14,
    gap: 12,
  },
  inputHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  inputIcon: {
    fontSize: 14,
    color: Colors.neon.DEFAULT,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.neon.DEFAULT,
    letterSpacing: 0.5,
  },
  inputValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  adjustButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.glass.DEFAULT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputValueContainer: {
    alignItems: 'center',
  },
  inputValue: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.text.primary,
    fontVariant: ['tabular-nums'],
    fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }),
  },
  inputUnit: {
    fontSize: 12,
    color: Colors.neon.DEFAULT,
    fontWeight: '500',
  },
  quickButtons: {
    flexDirection: 'row',
    gap: 6,
  },
  quickButton: {
    flex: 1,
    backgroundColor: Colors.glass.DEFAULT,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  quickButtonActive: {
    backgroundColor: Colors.neon.faint,
    borderWidth: 1,
    borderColor: Colors.neon.border,
  },
  quickButtonText: {
    color: Colors.text.secondary,
    fontSize: 12,
    fontWeight: '600',
  },
  quickButtonTextActive: {
    color: Colors.neon.DEFAULT,
  },
  addNoteText: {
    fontSize: 12,
    color: Colors.neon.DEFAULT,
    fontWeight: '600',
    marginTop: 4,
  },
  noteButtonActive: {
    backgroundColor: Colors.neon.faint,
    borderWidth: 1,
    borderColor: Colors.neon.border,
  },
});
