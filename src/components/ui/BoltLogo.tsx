import React, { useEffect } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop, Mask, Rect, G } from 'react-native-svg';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat, 
  withTiming, 
  Easing,
  withSequence,
  cancelAnimation,
  useAnimatedProps
} from 'react-native-reanimated';

const AnimatedRect = Animated.createAnimatedComponent(Rect);
const AnimatedSvg = Animated.createAnimatedComponent(Svg);
const AnimatedView = Animated.createAnimatedComponent(View);

interface BoltLogoProps {
  size?: number;
  progress?: number;
  isAnimating?: boolean;
  style?: ViewStyle;
}

const FILL_HEIGHT = 439;
const BOLT_WIDTH = 270;
const BOLT_HEIGHT = 439;
const BOLT_PATH = "M258.84 181H161.214C158.189 181 155.857 178.335 156.258 175.337L178.173 11.6178C178.874 6.3812 172.031 3.77757 169.074 8.15566L7.26781 247.701C5.02479 251.022 7.4039 255.5 11.4111 255.5H115.773C118.802 255.5 121.136 258.173 120.727 261.175L98.0463 427.641C97.3239 432.943 104.311 435.522 107.206 431.021L263.045 188.705C265.185 185.377 262.796 181 258.84 181Z";

// Corner radius for the "rounded" look
const CORNER_RADIUS = 30; // Increased radius for softer look
const VIEWBOX_PADDING = CORNER_RADIUS; // Padding to prevent clipping

export const BoltLogo: React.FC<BoltLogoProps> = ({ 
  size = 24, 
  progress = 100, 
  isAnimating = false, 
  style 
}) => {
  const uniqueId = React.useId().replace(/:/g, '');
  const rotation = useSharedValue(0);
  const fillTranslateY = useSharedValue(FILL_HEIGHT);
  // Add animation delay
  const ANIMATION_DELAY = 1000;

  useEffect(() => {
    // Fill animation based on progress
    const targetY = -((progress / 100) * FILL_HEIGHT);
    fillTranslateY.value = withTiming(targetY + FILL_HEIGHT, { duration: 500 });
  }, [progress]);

  useEffect(() => {
    if (isAnimating) {
      // Use setTimeout for delay to avoid initial glitch or use withDelay from reanimated if preferred
      // But simple setTimeout works well for triggering the loop 
      const timer = setTimeout(() => {
         rotation.value = withRepeat(
          withTiming(360, { duration: 2000, easing: Easing.bezier(0.4, 0, 0.2, 1) }),
          -1
        );
      }, ANIMATION_DELAY); // 1 second delay
      
      return () => clearTimeout(timer);
    } else {
      rotation.value = withTiming(0);
    }
  }, [isAnimating]);

  const animatedContainerStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { perspective: 1200 },
        { rotateY: `${rotation.value}deg` }
      ]
    };
  });

  const animatedRectProps = useAnimatedProps(() => {
    return {
      y: fillTranslateY.value
    };
  });

  return (
    <AnimatedView style={[styles.container, { width: size, height: size }, style, animatedContainerStyle]}>
      <Svg
        width="100%"
        height="100%"
        // Adjusted viewBox with padding to accommodate the thick stroke
        viewBox={`${-VIEWBOX_PADDING/2} ${-VIEWBOX_PADDING/2} ${BOLT_WIDTH + VIEWBOX_PADDING} ${BOLT_HEIGHT + VIEWBOX_PADDING}`}
        style={{ overflow: 'visible' }}
      >
        <Defs>
          <LinearGradient id={`boltGradient-${uniqueId}`} x1="0" x2="0" y1="1" y2="0">
            <Stop offset="0%" stopColor="#99FF00" />
            <Stop offset="100%" stopColor="#D4FF00" />
          </LinearGradient>
          
          <Mask id={`boltMask-${uniqueId}`}>
            <AnimatedRect
              x={-VIEWBOX_PADDING/2}
              y={-VIEWBOX_PADDING/2}
              //@ts-ignore - animated props handling
              animatedProps={animatedRectProps}
              width={BOLT_WIDTH + VIEWBOX_PADDING}
              height={BOLT_HEIGHT + VIEWBOX_PADDING}
              fill="white"
            />
          </Mask>
        </Defs>

        <G>
          {/* 3D Thickness Layers - NOW ROUNDED */}
          {/* Layer 1: Darkest depth */}
          <Path
            d={BOLT_PATH}
            fill="#4A7A00"
            stroke="#4A7A00"
            strokeWidth={CORNER_RADIUS}
            strokeLinejoin="round"
            transform="translate(4, 0)" 
            opacity={progress > 5 ? 1 : 0}
          />
          {/* Layer 2: Mid depth */}
          <Path
            d={BOLT_PATH}
            fill="#2D4A00"
            stroke="#2D4A00"
            strokeWidth={CORNER_RADIUS}
            strokeLinejoin="round"
            transform="translate(6, 0)" 
            opacity={progress > 5 ? 0.5 : 0}
          />

          {/* Front Layer */}
          <G>
            {/* Outline of front layer, if desired, or just simple fill */}
             <Path
              d={BOLT_PATH}
              stroke="#99FF00"
              strokeWidth={CORNER_RADIUS} // Rounding the outline as well
              strokeLinejoin="round"
              strokeOpacity="0.2"
              fill="none"
            />
            
            {/* Main Gradient Fill - also needs stroke to match shape */}
            <Path
              d={BOLT_PATH}
              fill={`url(#boltGradient-${uniqueId})`}
              stroke={`url(#boltGradient-${uniqueId})`}
              strokeWidth={CORNER_RADIUS}
              strokeLinejoin="round"
              mask={`url(#boltMask-${uniqueId})`}
            />
          </G>
        </G>
      </Svg>
    </AnimatedView>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  }
});
