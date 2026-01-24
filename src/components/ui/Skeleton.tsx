import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, DimensionValue, ViewStyle } from 'react-native';
import { Colors } from '@/constants/Colors';

interface SkeletonProps {
  width?: DimensionValue;
  height?: DimensionValue;
  variant?: 'rect' | 'circle' | 'rounded';
  style?: ViewStyle;
}

export function Skeleton({ 
  width = '100%', 
  height = 20, 
  variant = 'rect',
  style 
}: SkeletonProps) {
  const shimmerValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    
    animation.start();
    return () => animation.stop();
  }, [shimmerValue]);

  const opacity = shimmerValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  const borderRadius = variant === 'circle' ? 999 : variant === 'rounded' ? 8 : 0;

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius,
          opacity,
        },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
});
