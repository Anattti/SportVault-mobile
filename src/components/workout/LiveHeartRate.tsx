import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { useHeartRate } from '@/context/HeartRateContext';
import { Colors } from '@/constants/Colors';
import { Heart, Activity } from 'lucide-react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  withSequence, 
  withTiming, 
  withRepeat,
  Easing,
  useDerivedValue,
  interpolate,
  interpolateColor
} from 'react-native-reanimated';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';

const GRAPH_HEIGHT = 60;
const GRAPH_WIDTH = Dimensions.get('window').width - 48; // padding
const HISTORY_SIZE = 30;

// Helper to smooth out the displayed number
const AnimatedNumber = ({ value }: { value: number }) => {
  const [displayValue, setDisplayValue] = useState(value);
  
  useEffect(() => {
    if (value === displayValue) return;
    
    // Simple lerp animation in JS for text
    // For a "rolling" effect, we can step towards the target
    let current = displayValue;
    const diff = value - current;
    const steps = 10;
    const stepValue = diff / steps;
    let stepCount = 0;
    
    const interval = setInterval(() => {
      stepCount++;
      current += stepValue;
      setDisplayValue(Math.round(current));
      
      if (stepCount >= steps) {
        clearInterval(interval);
        setDisplayValue(value);
      }
    }, 16); // 60fps-ish
    
    return () => clearInterval(interval);
  }, [value]);

  return (
    <Text style={styles.value}>
      {displayValue}
    </Text>
  );
};

const HeartIcon = ({ bpm, color }: { bpm: number; color: string }) => {
  const scale = useSharedValue(1);
  
  // Calculate beat duration based on BPM (60000ms / bpm)
  // Limit to reasonable animation bounds (e.g. 40-200 bpm)
  const duration = 60000 / Math.max(40, Math.min(200, bpm || 60));
  
  useEffect(() => {
    // Heartbeat animation loop
    scale.value = withRepeat(
      withSequence(
        withTiming(1.2, { duration: duration * 0.15, easing: Easing.out(Easing.ease) }),
        withTiming(1, { duration: duration * 0.1, easing: Easing.in(Easing.ease) }),
        withTiming(1.15, { duration: duration * 0.15, easing: Easing.out(Easing.ease) }), // secondary bump
        withTiming(1, { duration: duration * 0.6, easing: Easing.in(Easing.ease) }) // rest
      ),
      -1,
      false
    );
  }, [bpm]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Heart fill={color} color={color} size={24} />
    </Animated.View>
  );
};

export const LiveHeartRate = () => {
  const { currentBpm, status, activeSourceType } = useHeartRate();
  const [history, setHistory] = useState<number[]>(new Array(HISTORY_SIZE).fill(0));
  
  // Update history buffer
  useEffect(() => {
    if (currentBpm) {
      setHistory(prev => {
        const newHistory = [...prev.slice(1), currentBpm];
        return newHistory;
      });
    }
  }, [currentBpm]);

  // Determine Zone Color
  const getZoneColor = (bpm: number) => {
    if (bpm < 100) return Colors.neon.blue || '#00f3ff';
    if (bpm < 130) return Colors.neon.green || '#0aff00';
    if (bpm < 160) return Colors.neon.yellow || '#ffea00';
    return Colors.neon.red || '#ff003c'; // Peak
  };
  
  const activeColor = currentBpm ? getZoneColor(currentBpm) : Colors.text.muted;
  const isConnected = status === 'connected' && currentBpm !== null;

  // Create SVG path for graph
  const createGraphPath = () => {
    // Filter out initial zeros if we want a cleaner look, or keep them to show start
    // Let's assume 0 = graph bottom, Max = graph top
    const min = Math.min(...history.filter(v => v > 0)) * 0.9 || 40;
    const max = Math.max(...history) * 1.1 || 190;
    const range = max - min;
    
    if (range === 0) return "";

    const stepX = GRAPH_WIDTH / (HISTORY_SIZE - 1);
    
    const points = history.map((val, index) => {
      const x = index * stepX;
      // If val is 0 (no data), put it at bottom
      const normalizedY = val === 0 ? 0 : (val - min) / range;
      const y = GRAPH_HEIGHT - (normalizedY * GRAPH_HEIGHT); 
      return `${x},${y}`;
    });

    return `M ${points.join(' L ')}`;
  };

  return (
    <View style={[styles.container, { borderColor: isConnected ? activeColor + '40' : Colors.glass.border }]}>
      
      {/* Background Graph */}
      {isConnected && (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
           <Svg height="100%" width="100%" style={{ opacity: 0.3 }}>
              <Defs>
                <LinearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor={activeColor} stopOpacity="0.5" />
                  <Stop offset="1" stopColor={activeColor} stopOpacity="0" />
                </LinearGradient>
              </Defs>
              <Path
                d={createGraphPath()}
                fill="none"
                stroke={activeColor}
                strokeWidth="2"
              />
               {/* Filled area below line - optional, simplifying to line for cleaner look or adding a second path */}
               <Path
                d={`${createGraphPath()} L ${GRAPH_WIDTH},${GRAPH_HEIGHT} L 0,${GRAPH_HEIGHT} Z`}
                fill="url(#grad)"
                stroke="none"
              />
           </Svg>
        </View>
      )}

      <View style={styles.content}>
        <View style={styles.leftCol}>
          <View style={styles.labelContainer}>
             <Activity size={14} color={Colors.text.secondary} style={{ marginRight: 6 }} />
             <Text style={styles.label}>HEART RATE</Text>
          </View>
          
          <View style={styles.valueRow}>
             {isConnected ? (
                <>
                   <AnimatedNumber value={currentBpm} />
                   <Text style={[styles.unit, { color: activeColor }]}>BPM</Text>
                </>
             ) : (
                <Text style={styles.placeholder}>--</Text>
             )}
          </View>
          
          {isConnected && (
             <Text style={[styles.zoneLabel, { color: activeColor }]}>
               {currentBpm < 120 ? 'WARM UP' : currentBpm < 150 ? 'CARDIO' : 'PEAK'}
             </Text>
          )}
        </View>

        <View style={styles.rightCol}>
           {isConnected ? (
             <HeartIcon bpm={currentBpm} color={activeColor} />
           ) : (
             <Heart size={24} color={Colors.text.muted} />
           )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.glass.DEFAULT,
    borderRadius: 20,
    borderWidth: 1,
    height: 100, // Fixed height for graph
    overflow: 'hidden',
    justifyContent: 'center',
    marginBottom: 8, // Spacing from other elements
  },
  content: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 2,
  },
  leftCol: {
    flex: 1,
  },
  rightCol: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 50,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  label: {
    color: Colors.text.secondary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  value: {
    fontSize: 36,
    fontWeight: '800',
    color: Colors.text.primary,
    fontVariant: ['tabular-nums'],
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  unit: {
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 6,
    transform: [{ translateY: -4 }],
  },
  placeholder: {
    fontSize: 36,
    fontWeight: '800',
    color: Colors.text.muted,
  },
  zoneLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
    letterSpacing: 0.5,
  }
});
