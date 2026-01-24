import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import Animated, { 
  useAnimatedStyle, 
  withTiming, 
  useSharedValue,
  withSpring,
  interpolate,
  Extrapolation
} from 'react-native-reanimated';
import { Colors } from '@/constants/Colors';

interface WorkoutNotesProps {
  visible: boolean;
  setNote: string;
  onSetNoteChange: (text: string) => void;
  exerciseNote: string;
  onExerciseNoteChange: (text: string) => void;
}

export function WorkoutNotes({
  visible,
  setNote,
  onSetNoteChange,
  exerciseNote,
  onExerciseNoteChange,
}: WorkoutNotesProps) {
  const { t } = useTranslation();
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(visible ? 1 : 0, {
      duration: 300,
    });
  }, [visible]);

  const containerStyle = useAnimatedStyle(() => {
    return {
      opacity: progress.value,
      maxHeight: interpolate(progress.value, [0, 1], [0, 400], Extrapolation.CLAMP),
      padding: interpolate(progress.value, [0, 1], [0, 16], Extrapolation.CLAMP),
      borderWidth: interpolate(progress.value, [0, 1], [0, 1], Extrapolation.CLAMP),
      marginTop: interpolate(progress.value, [0, 1], [-16, 0], Extrapolation.CLAMP),
      marginBottom: 0, 
      overflow: 'hidden',
      transform: [
        { translateY: interpolate(progress.value, [0, 1], [-10, 0], Extrapolation.CLAMP) }, // Reduced translation
        { scale: interpolate(progress.value, [0, 1], [0.95, 1], Extrapolation.CLAMP) }
      ],
      display: visible || progress.value > 0 ? 'flex' : 'none',
    };
  });

  return (
    <Animated.View style={[styles.container, containerStyle]}>
      {/* Set Note Section */}
      <View style={styles.section}>
        <Text style={styles.label}>{t('session.notes.set_comment')}</Text>
        <TextInput
          style={styles.input}
          value={setNote}
          onChangeText={onSetNoteChange}
          placeholder={t('session.notes.set_comment_placeholder')}
          placeholderTextColor={Colors.text.muted}
          multiline
        />
      </View>

      <View style={styles.divider} />

      {/* Exercise Note Section */}
      <View style={styles.section}>
        <Text style={styles.label}>{t('session.notes.exercise_notes')}</Text>
        <TextInput
          style={styles.input}
          value={exerciseNote}
          onChangeText={onExerciseNoteChange}
          placeholder={t('session.notes.exercise_notes_placeholder')}
          placeholderTextColor={Colors.text.muted}
          multiline
        />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.card.DEFAULT,
    borderRadius: 20,
    borderColor: Colors.border.default,
    gap: 16,
  },
  section: {
    gap: 8,
  },
  label: {
    color: Colors.text.secondary,
    fontSize: 13,
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#111',
    borderRadius: 12,
    padding: 12,
    color: Colors.text.primary,
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: Colors.glass.border,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border.default,
  },
});
