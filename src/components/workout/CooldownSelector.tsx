/**
 * Cooldown Selector Component
 * Allows users to select cooldown exercises after completing workout
 */

import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Modal,
} from 'react-native';
import { ThermometerSnowflake, X, Check, Clock } from 'lucide-react-native';
import { Colors } from '@/constants/Colors';
import {
  WarmupCooldownExercise,
  COOLDOWN_PRESETS,
  getTypeLabel,
  getTypeColor,
  formatDuration,
  calculateTotalDuration,
} from '@/types/warmupCooldown';

interface CooldownSelectorProps {
  visible: boolean;
  onClose: () => void;
  onStart: (exercises: WarmupCooldownExercise[]) => void;
  onSkip: () => void;
}

export function CooldownSelector({ visible, onClose, onStart, onSkip }: CooldownSelectorProps) {
  const { t } = useTranslation();
  
  const TRANSLATED_COOLDOWN_PRESETS = useMemo(() => COOLDOWN_PRESETS.map(ex => ({
    ...ex,
    name: t(`session.warmup_cooldown.presets.${ex.id.replace('cooldown-', '')}` as any, { defaultValue: ex.name })
  })), [t]);

  const [selectedExercises, setSelectedExercises] = useState<WarmupCooldownExercise[]>([
    TRANSLATED_COOLDOWN_PRESETS[0], // Pre-select walking
    TRANSLATED_COOLDOWN_PRESETS[1], // Pre-select hamstring stretch
  ]);

  const toggleExercise = (exercise: WarmupCooldownExercise) => {
    const isSelected = selectedExercises.some(e => e.id === exercise.id);
    if (isSelected) {
      setSelectedExercises(selectedExercises.filter(e => e.id !== exercise.id));
    } else {
      setSelectedExercises([...selectedExercises, exercise]);
    }
  };

  const totalDuration = calculateTotalDuration(selectedExercises);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTitle}>
            <ThermometerSnowflake size={24} color="#60A5FA" />
            <Text style={styles.title}>{t('session.cooldown.title')}</Text>
          </View>
          <Pressable style={styles.closeButton} onPress={onClose}>
            <X size={24} color={Colors.text.primary} />
          </Pressable>
        </View>

        {/* Total Duration */}
        <View style={styles.durationBox}>
          <Clock size={16} color={Colors.text.secondary} />
          <Text style={styles.durationText}>
            {t('session.cooldown.total')} {formatDuration(totalDuration)}
          </Text>
          <Text style={styles.exerciseCount}>
            ({t('session.cooldown.movements_count', { count: selectedExercises.length })})
          </Text>
        </View>

        {/* Exercise List */}
        <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
          <Text style={styles.sectionTitle}>{t('session.cooldown.select_movements')}</Text>
          
          {TRANSLATED_COOLDOWN_PRESETS.map(exercise => {
            const isSelected = selectedExercises.some(e => e.id === exercise.id);
            const typeColor = getTypeColor(exercise.type);
            
            const translatedType = t(`session.warmup_cooldown.types.${exercise.type}` as any, { defaultValue: exercise.type });
            
            return (
              <Pressable
                key={exercise.id}
                style={[
                  styles.exerciseCard,
                  isSelected && styles.exerciseCardSelected,
                ]}
                onPress={() => toggleExercise(exercise)}
              >
                <View style={styles.exerciseInfo}>
                  <View 
                    style={[styles.typeBadge, { backgroundColor: `${typeColor}20` }]}
                  >
                    <Text style={[styles.typeText, { color: typeColor }]}>
                      {translatedType}
                    </Text>
                  </View>
                  <Text style={styles.exerciseName}>{exercise.name}</Text>
                  <Text style={styles.exerciseDuration}>
                    {formatDuration(exercise.duration)}
                  </Text>
                </View>
                
                <View style={[
                  styles.checkbox,
                  isSelected && styles.checkboxSelected,
                ]}>
                  {isSelected && <Check size={16} color="#000" />}
                </View>
              </Pressable>
            );
          })}

          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Bottom Actions */}
        <View style={styles.actions}>
          <Pressable style={styles.skipButton} onPress={onSkip}>
            <Text style={styles.skipButtonText}>{t('session.cooldown.skip')}</Text>
          </Pressable>
          
          <Pressable
            style={[
              styles.startButton,
              selectedExercises.length === 0 && styles.startButtonDisabled,
            ]}
            onPress={() => onStart(selectedExercises)}
            disabled={selectedExercises.length === 0}
          >
            <ThermometerSnowflake size={18} color="#000" />
            <Text style={styles.startButtonText}>
              {t('session.cooldown.start')}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  headerTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: Colors.text.primary,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  durationBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
  },
  durationText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  exerciseCount: {
    fontSize: 14,
    color: Colors.text.secondary,
  },
  list: {
    flex: 1,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.secondary,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  exerciseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    marginBottom: 8,
    backgroundColor: '#111111',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  exerciseCardSelected: {
    borderColor: '#60A5FA',
    backgroundColor: 'rgba(96, 165, 250, 0.05)',
  },
  exerciseInfo: {
    flex: 1,
    gap: 4,
  },
  typeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: 4,
  },
  typeText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  exerciseDuration: {
    fontSize: 14,
    color: Colors.text.secondary,
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#60A5FA',
    borderColor: '#60A5FA',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    paddingBottom: 40,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  skipButton: {
    flex: 1,
    height: 56,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  skipButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text.secondary,
  },
  startButton: {
    flex: 2,
    flexDirection: 'row',
    height: 56,
    borderRadius: 16,
    backgroundColor: '#60A5FA',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  startButtonDisabled: {
    opacity: 0.5,
  },
  startButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
});
