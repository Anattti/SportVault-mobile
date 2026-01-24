
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { View, StyleSheet, Pressable, Modal, Text, TouchableWithoutFeedback, Animated } from 'react-native';
import { Colors } from '@/constants/Colors';
import type { WorkoutExercise, SetResult } from '@/types';
import { BlurView } from 'expo-blur';

interface WorkoutProgressBarProps {
  sessionExercises: WorkoutExercise[];
  currentExerciseIndex: number;
  currentSetIndex: number;
  setResults: SetResult[][];
}

const AnimatedBar = ({ progress, color }: { progress: number, color: string }) => {
  const [widthAnim] = useState(new Animated.Value(progress));

  useEffect(() => {
    Animated.timing(widthAnim, {
      toValue: progress,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [progress]);

  const width = widthAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%']
  });

  return (
    <Animated.View 
      style={[
        styles.segmentFill, 
        { 
          width, 
          backgroundColor: color,
          shadowColor: color,
          shadowOpacity: progress > 0 ? 0.4 : 0,
          shadowRadius: 4,
        }
      ]} 
    />
  );
};

export function WorkoutProgressBar({
  sessionExercises,
  currentExerciseIndex,
  currentSetIndex,
  setResults
}: WorkoutProgressBarProps) {
  const { t } = useTranslation();
  const [selectedExerciseIndex, setSelectedExerciseIndex] = useState<number | null>(null);

  const renderTooltip = () => {
    if (selectedExerciseIndex === null) return null;

    const result = setResults[selectedExerciseIndex];
    if (!result) return null;

    const failureReasons: string[] = [];
    
    result.forEach((set, setIdx) => {
      if (!set) return;

      const originalWeight = set.originalWeight ?? 0;
      const originalReps = set.originalReps ?? 0;
      const currentWeight = set.weight ?? 0;
      const currentReps = set.reps ?? 0;

      // Skip if no original targets
      if (originalWeight <= 0 && originalReps <= 0) return;

      const weightDiff = currentWeight - originalWeight;
      const repsDiff = currentReps - originalReps;

      // Red: Significant failure
      const isWeightRed = originalWeight > 0 && currentWeight < originalWeight * 0.95;
      const isRepsRed = originalReps > 0 && currentReps < originalReps - 1;

      if (isWeightRed || isRepsRed) {
        if (isWeightRed) failureReasons.push(t('session.progress.set_weight_fail', { num: setIdx + 1, diff: weightDiff.toFixed(1) }));
        if (isRepsRed) failureReasons.push(t('session.progress.set_reps_fail', { num: setIdx + 1, diff: repsDiff }));
      }
      // Yellow: Near miss
      else if ((originalWeight > 0 && currentWeight < originalWeight) || (originalReps > 0 && currentReps < originalReps)) {
        if (originalWeight > 0 && currentWeight < originalWeight) failureReasons.push(t('session.progress.set_weight_fail', { num: setIdx + 1, diff: weightDiff.toFixed(1) }));
        if (originalReps > 0 && currentReps < originalReps) failureReasons.push(t('session.progress.set_reps_fail', { num: setIdx + 1, diff: repsDiff }));
      }
    });

    if (failureReasons.length === 0) return null;

    return (
      <Modal
        transparent
        visible={selectedExerciseIndex !== null}
        animationType="fade"
        onRequestClose={() => setSelectedExerciseIndex(null)}
      >
        <TouchableWithoutFeedback onPress={() => setSelectedExerciseIndex(null)}>
          <View style={styles.modalOverlay}>
            <BlurView intensity={20} style={styles.modalContent} tint="dark">
              <Text style={styles.modalTitle}>{t('session.progress.missed_goal')}</Text>
              {failureReasons.map((reason, i) => (
                <Text key={i} style={styles.modalText}>• {reason}</Text>
              ))}
            </BlurView>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.barContainer}>
        {sessionExercises.map((ex, index) => {
          let progress = 0;
          let status: 'met' | 'gold' | 'yellow' | 'red' = 'met';
          
          // Check goal status for this exercise
          if (setResults[index]) {
            let hasRed = false;
            let hasYellow = false;
            let hasGold = false;

            setResults[index].forEach((set) => {
              if (!set) return;

              const originalWeight = set.originalWeight ?? 0;
              const originalReps = set.originalReps ?? 0;
              const currentWeight = set.weight ?? 0;
              const currentReps = set.reps ?? 0;

              // Skip if no original targets
              if (originalWeight <= 0 && originalReps <= 0) return;

              // Red: Significant failure
              const isWeightRed = originalWeight > 0 && currentWeight < originalWeight * 0.95;
              const isRepsRed = originalReps > 0 && currentReps < originalReps - 1;

              if (isWeightRed || isRepsRed) {
                hasRed = true;
              }
              // Yellow: Near miss
              else if ((originalWeight > 0 && currentWeight < originalWeight) || (originalReps > 0 && currentReps < originalReps)) {
                hasYellow = true;
              }
              // Gold: Exceeded
              else if (currentWeight > originalWeight || currentReps > originalReps) {
                hasGold = true;
              }
            });

            if (hasRed) status = 'red';
            else if (hasYellow) status = 'yellow';
            else if (hasGold) status = 'gold';
          }

          if (index < currentExerciseIndex) {
            progress = 100;
          } else if (index === currentExerciseIndex) {
            progress = (currentSetIndex / (ex.sets.length || 1)) * 100;
          }

          // Determine colors
          let barColor = '#00FF41'; // Green (met)
          
          if (status === 'red') {
            barColor = '#EF4444'; 
          } else if (status === 'yellow') {
            barColor = '#EAB308';
          } else if (status === 'gold') {
            barColor = '#FBBF24';
          }

          const hasIssues = status === 'red' || status === 'yellow';

          return (
            <Pressable 
              key={index} 
              style={styles.segmentContainer}
              onPress={() => hasIssues && setSelectedExerciseIndex(index)}
              delayLongPress={200}
            >
              <View style={[styles.segmentBackground, { backgroundColor: Colors.glass.DEFAULT }]}>
                 <AnimatedBar progress={progress} color={barColor} />
              </View>
            </Pressable>
          );
        })}
      </View>
      {renderTooltip()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    paddingTop: 2,
    zIndex: 10,
  },
  barContainer: {
    flexDirection: 'row',
    gap: 4,
    height: 6,
    width: '100%',
  },
  segmentContainer: {
    flex: 1,
    height: '100%',
  },
  segmentBackground: {
    flex: 1,
    borderRadius: 3,
    overflow: 'hidden',
  },
  segmentFill: {
    height: '100%',
    borderRadius: 3,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    padding: 20,
    borderRadius: 16,
    overflow: 'hidden',
    width: '80%',
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  modalTitle: {
    color: 'white',
    fontWeight: '700',
    marginBottom: 8,
    fontSize: 16,
  },
  modalText: {
    color: '#ccc',
    fontSize: 14,
    marginBottom: 4,
  },
});
