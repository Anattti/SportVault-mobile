import React, { useEffect } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Plus, Minus, Play, Pause } from 'lucide-react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedProps, 
  withTiming, 
  Easing,
  useDerivedValue,
  withSpring,
  interpolate,
  Extrapolation
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { Colors } from '@/constants/Colors';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface RestTimerDisplayProps {
  currentSeconds: number;
  totalSeconds: number;
  isActive: boolean;
  onAdjust: (seconds: number) => void;
  onToggle: () => void;
}

const CIRCLE_SIZE = 160;
const STROKE_WIDTH = 6;
const RADIUS = (CIRCLE_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function RestTimerDisplay({ 
  currentSeconds, 
  totalSeconds,
  isActive, 
  onAdjust, 
  onToggle 
}: RestTimerDisplayProps) {
  const progress = useSharedValue(1);

  useEffect(() => {
    // If total time is 0 (shouldn't happen often but safe guard), set progress to 0
    if (totalSeconds <= 0) {
      progress.value = withTiming(0, { duration: 300 });
      return;
    }

    const targetProgress = Math.min(Math.max(currentSeconds / totalSeconds, 0), 1);
    
    // When timer is active, we validly transition.
    // If we just adjusted time, we want to animate well.
    // Use linear for smooth ticking when active? 
    // Actually reanimated handles state updates typically via spring or timing.
    // Since currentSeconds updates every second, simple timing is okay but might feel "steppy"
    // Ideally we'd have a millisecond precision timer for super smooth, but second precision is okay.
    progress.value = withTiming(targetProgress, {
      duration: 500,
      easing: Easing.linear,
    });
  }, [currentSeconds, totalSeconds]);
  
  const animatedProps = useAnimatedProps(() => {
    const strokeDashoffset = CIRCUMFERENCE * (1 - progress.value);
    return {
      strokeDashoffset,
    };
  });

  const formatTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.container}>
      {/* Circular timer display */}
      <View style={styles.circleContainer}>
        <View style={styles.svgContainer}>
           <Svg width={CIRCLE_SIZE} height={CIRCLE_SIZE}>
            {/* Background Circle */}
            <Circle
              cx={CIRCLE_SIZE / 2}
              cy={CIRCLE_SIZE / 2}
              r={RADIUS}
              stroke={Colors.glass.border}
              strokeWidth={STROKE_WIDTH}
              fill="rgba(0,0,0,0.3)"
            />
            {/* Progress Circle */}
            <AnimatedCircle
              cx={CIRCLE_SIZE / 2}
              cy={CIRCLE_SIZE / 2}
              r={RADIUS}
              stroke={isActive ? Colors.neon.DEFAULT : Colors.text.muted}
              strokeWidth={STROKE_WIDTH}
              fill="none"
              strokeDasharray={CIRCUMFERENCE}
              animatedProps={animatedProps}
              strokeLinecap="round"
              rotation="-90"
              origin={`${CIRCLE_SIZE / 2}, ${CIRCLE_SIZE / 2}`}
            />
          </Svg>
        </View>

        <View style={styles.innerContent}>
          <Text style={[styles.timeText, isActive && styles.timeTextActive]}>
            {formatTime(currentSeconds)}
          </Text>
          <Text style={styles.label}>
            {isActive ? 'Lepo' : 'Valmis'}
          </Text>
        </View>
      </View>

      {/* Timer controls */}
      <View style={styles.controls}>
        <Pressable 
          style={({ pressed }) => [styles.controlButton, pressed && styles.buttonPressed]}
          onPress={() => onAdjust(-15)}
        >
          <Minus size={18} color={Colors.text.primary} />
          <Text style={styles.controlText}>15s</Text>
        </Pressable>

        <Pressable 
          style={({ pressed }) => [styles.playButton, isActive && styles.playButtonActive, pressed && styles.buttonPressed]}
          onPress={onToggle}
        >
          {isActive ? (
            <Pause size={22} color="#000" fill="#000" />
          ) : (
            <Play size={22} color="#000" fill="#000" />
          )}
        </Pressable>

        <Pressable 
          style={({ pressed }) => [styles.controlButton, pressed && styles.buttonPressed]}
          onPress={() => onAdjust(15)}
        >
          <Plus size={18} color={Colors.text.primary} />
          <Text style={styles.controlText}>15s</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.card.DEFAULT,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border.default,
    padding: 24,
    alignItems: 'center',
    gap: 20,
  },
  circleContainer: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  svgContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
  },
  innerContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeText: {
    fontSize: 40,
    fontWeight: '800',
    color: Colors.text.primary,
    fontVariant: ['tabular-nums'],
  },
  timeTextActive: {
    color: Colors.neon.DEFAULT,
  },
  label: {
    fontSize: 14,
    color: Colors.text.muted,
    fontWeight: '500',
    marginTop: 4,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  controlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.glass.DEFAULT,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.glass.border,
  },
  playButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.neon.DEFAULT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButtonActive: {
    backgroundColor: Colors.neon.dim,
  },
  controlText: {
    color: Colors.text.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  buttonPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.95 }],
  },
});
