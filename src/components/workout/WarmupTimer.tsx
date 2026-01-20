/**
 * Warmup Timer Display Component
 * Shows countdown timer for warmup/cooldown exercises
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
} from 'react-native';
import { Play, Pause, SkipForward, Check, Flame, ThermometerSnowflake } from 'lucide-react-native';
import { Colors } from '@/constants/Colors';
import {
  WarmupCooldownExercise,
  formatDuration,
} from '@/types/warmupCooldown';

interface WarmupTimerProps {
  exercises: WarmupCooldownExercise[];
  type: 'warmup' | 'cooldown';
  onComplete: (totalDuration: number) => void;
  onCancel: () => void;
}

export function WarmupTimer({ exercises, type, onComplete, onCancel }: WarmupTimerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(exercises[0]?.duration || 0);
  const [isRunning, setIsRunning] = useState(true);
  const [completedExercises, setCompletedExercises] = useState<string[]>([]);
  const [totalElapsed, setTotalElapsed] = useState(0);

  const currentExercise = exercises[currentIndex];
  const isWarmup = type === 'warmup';
  const accentColor = isWarmup ? '#F97316' : '#60A5FA';

  // Timer logic
  useEffect(() => {
    if (!isRunning || timeRemaining <= 0) return;

    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          // Exercise complete
          handleExerciseComplete();
          return 0;
        }
        return prev - 1;
      });
      setTotalElapsed(prev => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [isRunning, timeRemaining, currentIndex]);

  const handleExerciseComplete = useCallback(() => {
    if (currentExercise) {
      setCompletedExercises(prev => [...prev, currentExercise.id]);
    }

    if (currentIndex < exercises.length - 1) {
      // Move to next exercise
      setCurrentIndex(currentIndex + 1);
      setTimeRemaining(exercises[currentIndex + 1].duration);
    } else {
      // All exercises complete
      onComplete(totalElapsed);
    }
  }, [currentIndex, exercises, totalElapsed, currentExercise, onComplete]);

  const handleSkip = () => {
    handleExerciseComplete();
  };

  const togglePause = () => {
    setIsRunning(!isRunning);
  };

  const progress = currentExercise 
    ? 1 - (timeRemaining / currentExercise.duration)
    : 0;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.iconContainer, { backgroundColor: `${accentColor}20` }]}>
          {isWarmup ? (
            <Flame size={32} color={accentColor} />
          ) : (
            <ThermometerSnowflake size={32} color={accentColor} />
          )}
        </View>
        <Text style={styles.title}>
          {isWarmup ? 'Lämmittely' : 'Jäähdyttely'}
        </Text>
        <Text style={styles.progress}>
          {currentIndex + 1} / {exercises.length}
        </Text>
      </View>

      {/* Current Exercise */}
      <View style={styles.exerciseCard}>
        <Text style={styles.exerciseName}>{currentExercise?.name}</Text>
        
        {/* Timer Display */}
        <Text style={[styles.timerText, { color: accentColor }]}>
          {formatDuration(timeRemaining)}
        </Text>

        {/* Progress Bar */}
        <View style={styles.progressBarBackground}>
          <View 
            style={[
              styles.progressBarFill, 
              { 
                width: `${progress * 100}%`,
                backgroundColor: accentColor,
              }
            ]} 
          />
        </View>
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        <Pressable 
          style={styles.secondaryButton}
          onPress={onCancel}
        >
          <Text style={styles.secondaryButtonText}>Peruuta</Text>
        </Pressable>

        <Pressable 
          style={[styles.mainButton, { backgroundColor: accentColor }]}
          onPress={togglePause}
        >
          {isRunning ? (
            <Pause size={28} color="#000" />
          ) : (
            <Play size={28} color="#000" />
          )}
        </Pressable>

        <Pressable 
          style={styles.secondaryButton}
          onPress={handleSkip}
        >
          <SkipForward size={20} color={Colors.text.secondary} />
          <Text style={styles.secondaryButtonText}>Ohita</Text>
        </Pressable>
      </View>

      {/* Exercise List */}
      <View style={styles.exerciseList}>
        {exercises.map((ex, index) => {
          const isCompleted = completedExercises.includes(ex.id);
          const isCurrent = index === currentIndex;
          
          return (
            <View 
              key={ex.id} 
              style={[
                styles.exerciseListItem,
                isCurrent && styles.exerciseListItemCurrent,
                isCompleted && styles.exerciseListItemCompleted,
              ]}
            >
              <View style={[
                styles.exerciseIndicator,
                isCompleted && styles.exerciseIndicatorCompleted,
                isCurrent && { borderColor: accentColor },
              ]}>
                {isCompleted && <Check size={12} color="#000" />}
              </View>
              <Text style={[
                styles.exerciseListName,
                isCompleted && styles.exerciseListNameCompleted,
              ]}>
                {ex.name}
              </Text>
              <Text style={styles.exerciseListDuration}>
                {formatDuration(ex.duration)}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: Colors.text.primary,
    marginBottom: 4,
  },
  progress: {
    fontSize: 14,
    color: Colors.text.secondary,
  },
  exerciseCard: {
    backgroundColor: '#111111',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    marginBottom: 32,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  exerciseName: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 24,
    textAlign: 'center',
  },
  timerText: {
    fontSize: 64,
    fontWeight: '900',
    marginBottom: 24,
  },
  progressBarBackground: {
    width: '100%',
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
    marginBottom: 32,
  },
  mainButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButton: {
    alignItems: 'center',
    gap: 4,
  },
  secondaryButtonText: {
    fontSize: 14,
    color: Colors.text.secondary,
  },
  exerciseList: {
    flex: 1,
  },
  exerciseListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
    backgroundColor: '#111111',
    borderRadius: 12,
    gap: 12,
  },
  exerciseListItemCurrent: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  exerciseListItemCompleted: {
    opacity: 0.5,
  },
  exerciseIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  exerciseIndicatorCompleted: {
    backgroundColor: Colors.neon.DEFAULT,
    borderColor: Colors.neon.DEFAULT,
  },
  exerciseListName: {
    flex: 1,
    fontSize: 14,
    color: Colors.text.primary,
  },
  exerciseListNameCompleted: {
    textDecorationLine: 'line-through',
    color: Colors.text.secondary,
  },
  exerciseListDuration: {
    fontSize: 12,
    color: Colors.text.secondary,
  },
});
