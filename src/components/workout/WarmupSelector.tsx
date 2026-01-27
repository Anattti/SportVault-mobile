/**
 * Warmup Selector Component
 * Allows users to select warmup exercises before starting workout
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Modal,
  TextInput,
} from 'react-native';
import { Flame, X, Check, Plus, Clock } from 'lucide-react-native';
import { Colors } from '@/constants/Colors';
import {
  WarmupCooldownExercise,
  WARMUP_PRESETS,
  getTypeLabel,
  getTypeColor,
  formatDuration,
  calculateTotalDuration,
} from '@/types/warmupCooldown';

interface WarmupSelectorProps {
  visible: boolean;
  onClose: () => void;
  onStart: (exercises: WarmupCooldownExercise[]) => void;
  onSkip: () => void;
}

export function WarmupSelector({ visible, onClose, onStart, onSkip }: WarmupSelectorProps) {
  const [selectedExercises, setSelectedExercises] = useState<WarmupCooldownExercise[]>([
    WARMUP_PRESETS[0], // Pre-select first cardio
    WARMUP_PRESETS[3], // Pre-select arm circles
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
            <Flame size={24} color="#F97316" />
            <Text style={styles.title}>Lämmittely</Text>
          </View>
          <Pressable style={styles.closeButton} onPress={onClose}>
            <X size={24} color={Colors.text.primary} />
          </Pressable>
        </View>

        {/* Total Duration */}
        <View style={styles.durationBox}>
          <Clock size={16} color={Colors.text.secondary} />
          <Text style={styles.durationText}>
            Yhteensä: {formatDuration(totalDuration)}
          </Text>
          <Text style={styles.exerciseCount}>
            ({selectedExercises.length} liikettä)
          </Text>
        </View>

        {/* Exercise List */}
        <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
          <Text style={styles.sectionTitle}>Valitse liikkeet</Text>
          
          {WARMUP_PRESETS.map(exercise => {
            const isSelected = selectedExercises.some(e => e.id === exercise.id);
            const typeColor = getTypeColor(exercise.type);
            
            return (
              <Pressable
                key={exercise.id}
                style={[
                  styles.exerciseCard,
                  isSelected && styles.exerciseCardSelected,
                ]}
                onPress={() => toggleExercise(exercise)}
              >
               <View style={styles.exerciseHeaderRow}>
                <View style={styles.exerciseInfo}>
                  <View 
                    style={[styles.typeBadge, { backgroundColor: `${typeColor}20` }]}
                  >
                    <Text style={[styles.typeText, { color: typeColor }]}>
                      {getTypeLabel(exercise.type)}
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
               </View>

               {isSelected && (
                  <View style={styles.noteContainer}>
                    <TextInput
                        style={styles.noteInput}
                        placeholder="Lisää muistiinpano..."
                        placeholderTextColor={Colors.text.secondary}
                        value={selectedExercises.find(e => e.id === exercise.id)?.notes || ''}
                        onChangeText={(text) => {
                            setSelectedExercises(prev => prev.map(e => 
                                e.id === exercise.id ? { ...e, notes: text } : e
                            ));
                        }}
                        onPressIn={(e) => e.stopPropagation()}
                    />
                  </View>
               )}
              </Pressable>
            );
          })}

          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Bottom Actions */}
        <View style={styles.actions}>
          <Pressable style={styles.skipButton} onPress={onSkip}>
            <Text style={styles.skipButtonText}>Ohita</Text>
          </Pressable>
          
          <Pressable
            style={[
              styles.startButton,
              selectedExercises.length === 0 && styles.startButtonDisabled,
            ]}
            onPress={() => onStart(selectedExercises)}
            disabled={selectedExercises.length === 0}
          >
            <Flame size={18} color="#000" />
            <Text style={styles.startButtonText}>
              Aloita lämmittely
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
    padding: 16,
    marginBottom: 8,
    backgroundColor: '#111111',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  exerciseHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  noteContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  noteInput: {
    color: Colors.text.primary,
    fontSize: 14,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 8,
    padding: 10,
  },
  exerciseCardSelected: {
    borderColor: Colors.neon.DEFAULT,
    backgroundColor: 'rgba(0, 255, 65, 0.05)',
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
    backgroundColor: Colors.neon.DEFAULT,
    borderColor: Colors.neon.DEFAULT,
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
    backgroundColor: Colors.neon.DEFAULT,
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
