import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  interpolate,
  Extrapolation 
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/constants/Colors';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface WorkoutControlsProps {
  isLastSet: boolean;
  isLastExercise: boolean;
  isSetCompleted: boolean;
  isFirstStep: boolean;
  onComplete: () => void;
  onMarkComplete: () => void;
  onBack: () => void;
}

export function WorkoutControls({
  isLastSet,
  isLastExercise,
  isSetCompleted,
  isFirstStep,
  onComplete,
  onMarkComplete,
  onBack,
}: WorkoutControlsProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  
  // Animation for back button
  const backButtonProgress = useSharedValue(isFirstStep ? 0 : 1);

  useEffect(() => {
    backButtonProgress.value = withSpring(isFirstStep ? 0 : 1, {
      damping: 15,
      stiffness: 150,
    });
  }, [isFirstStep]);

  const backButtonStyle = useAnimatedStyle(() => {
    return {
      opacity: backButtonProgress.value,
      width: interpolate(backButtonProgress.value, [0, 1], [0, 56], Extrapolation.CLAMP),
      transform: [
        { scale: interpolate(backButtonProgress.value, [0, 1], [0.8, 1], Extrapolation.CLAMP) },
        { translateX: interpolate(backButtonProgress.value, [0, 1], [-20, 0], Extrapolation.CLAMP) },
      ],
    };
  });

  const nextButtonStyle = useAnimatedStyle(() => {
    return {
      marginLeft: interpolate(backButtonProgress.value, [0, 1], [0, 12], Extrapolation.CLAMP),
    };
  });

  const getButtonText = () => {
    if (isSetCompleted) {
      if (isLastSet && isLastExercise) {
        return t('session.controls.finish_workout');
      }
      if (isLastSet) {
        return t('session.controls.next_exercise');
      }
      return t('session.controls.next_set');
    }
    return t('session.controls.mark_complete');
  };

  const handlePress = () => {
    // Add haptic feedback for primary action
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    if (isSetCompleted) {
      onComplete();
    } else {
      onMarkComplete();
    }
  };

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <View style={styles.buttonsRow}>
        {/* Animated Back Button */}
        <AnimatedPressable 
          style={[styles.backButton, backButtonStyle]}
          onPress={onBack}
          disabled={isFirstStep}
        >
          <ChevronLeft color={Colors.text.primary} size={24} />
        </AnimatedPressable>

        {/* Main Action Button */}
        <Animated.View style={[{ flex: 1 }, nextButtonStyle]}>
          <Pressable 
            style={({ pressed }) => [
              styles.button,
              pressed && styles.buttonPressed
            ]}
            onPress={handlePress}
          >
            <Text style={styles.buttonText}>{getButtonText()}</Text>
            {isSetCompleted && !(isLastSet && isLastExercise) && (
              <ChevronRight color="#000" size={20} />
            )}
          </Pressable>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    borderTopWidth: 1,
    borderTopColor: Colors.glass.border,
  },
  buttonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    // gap intentionally removed for animation control
  },
  backButton: {
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.glass.DEFAULT,
    borderWidth: 1,
    borderColor: Colors.glass.border,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden', // Highlight: Ensure content doesn't overflow during width animation
  },
  button: {
    flex: 1,
    backgroundColor: Colors.neon.DEFAULT,
    height: 56,
    borderRadius: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  buttonPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
  buttonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
});
