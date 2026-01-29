/**
 * Warmup Phase Component
 * Matches Next.js PWA design - shown before and after workout session
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  ScrollView,
  Platform,
  AppState,
} from 'react-native';
import { Play, Pause, RotateCcw, Check, ChevronDown, Timer, History, BellRing, Plus, Minus } from 'lucide-react-native';
import { LiveHeartRate } from './LiveHeartRate';
import { Colors } from '@/constants/Colors';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import Svg, { Circle, G } from 'react-native-svg';

// Configure notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false, // Disable foreground notification sound (we play our own)
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const completeSound = require('../../../assets/sounds/wooden_mallet.mp3');

export type WarmupMethod = 'juoksumatto' | 'cross-trainer' | 'kuntopyora' | 'soutulaite' | 'hyppynaru' | 'muu';
export type WarmupIntensity = number;

export interface WarmupPhaseData {
  duration: number; // seconds elapsed
  method: WarmupMethod;
  intensity: WarmupIntensity;
  notes: string;
  skipped: boolean;
  exercises?: any[]; // WarmupCooldownExercise[]
}

interface WarmupPhaseProps {
  type: 'warmup' | 'cooldown';
  visible: boolean;
  onComplete: (data: WarmupPhaseData) => void;
  onSkip: () => void;
  overlay?: boolean;
  workoutType?: string;
}

export function WarmupPhase({ type, visible, onComplete, onSkip, overlay = false, workoutType = 'other' }: WarmupPhaseProps) {
  const { t } = useTranslation();

  const METHODS: { id: WarmupMethod; label: string }[] = useMemo(() => [
    { id: 'juoksumatto', label: t('session.warmup.methods.juoksumatto') },
    { id: 'cross-trainer', label: t('session.warmup.methods.cross_trainer') },
    { id: 'kuntopyora', label: t('session.warmup.methods.kuntopyora') },
    { id: 'soutulaite', label: t('session.warmup.methods.soutulaite') },
    { id: 'hyppynaru', label: t('session.warmup.methods.hyppynaru') },
    { id: 'muu', label: t('session.warmup.methods.muu') },
  ], [t]);

  // Adaptive logic
  const suggestion = useMemo(() => {
    const typeLower = workoutType.toLowerCase();
    if (typeLower.includes('juoksu') || typeLower.includes('running')) {
      return { min: 480, max: 720, label: '8-12 min' }; // 8-12 min
    }
    if (typeLower.includes('voima') || typeLower.includes('strength')) {
      return { min: 300, max: 480, label: '5-8 min' }; // 5-8 min
    }
    return null;
  }, [workoutType]);

  const [mode, setMode] = useState<'stopwatch' | 'timer'>('stopwatch'); 
  const [targetDuration, setTargetDuration] = useState(300); // Default 5 min for timer
  
  // Timer state
  const [elapsed, setElapsed] = useState(0); // Display value for stopwatch
  const [remaining, setRemaining] = useState(300); // Display value for timer
  const [isRunning, setIsRunning] = useState(false);

  // Refs for accurate timing
  const startTimeRef = useRef<number | null>(null);
  const pausedTimeRef = useRef<number>(0);
  const timerStartRef = useRef<number | null>(null); // Start time for countdown
  
  // Sound
  const [sound, setSound] = useState<Audio.Sound>();

  // Use refs for current values in callbacks/effects that don't re-run often
  const modeRef = useRef(mode);
  const targetDurationRef = useRef(targetDuration);
  const isRunningRef = useRef(isRunning);

  useEffect(() => {
     modeRef.current = mode;
  }, [mode]);

  useEffect(() => {
     targetDurationRef.current = targetDuration;
  }, [targetDuration]);

  useEffect(() => {
      isRunningRef.current = isRunning;
  }, [isRunning]);

  const [method, setMethod] = useState<WarmupMethod>('juoksumatto');
  const [showMethodPicker, setShowMethodPicker] = useState(false);

  const isWarmup = type === 'warmup';
  const title = isWarmup ? t('session.warmup.warmup_title') : t('session.warmup.cooldown_title');

  // Load sound
  async function playCompleteSound() {
    try {
      console.log('Playing sound');
      const { sound } = await Audio.Sound.createAsync(completeSound);
      setSound(sound);
      await sound.playAsync();
      
      // Haptic feedback
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync();
        }
      });
    } catch (e) {
      console.log('Error playing sound', e);
      // Fallback haptics
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }

  useEffect(() => {
    return () => {
      sound?.unloadAsync();
    };
  }, [sound]);

  // Request notification permissions
  useEffect(() => {
      async function requestPermissions() {
          const { status } = await Notifications.requestPermissionsAsync();
          if (status !== 'granted') {
              console.log('Notification permissions not granted');
          }
      }
      requestPermissions();
  }, []);

  // Timer logic using timestamps
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isRunning) {
      if (mode === 'stopwatch') {
         // Initialize start if needed (e.g. continuing from pause)
         if (!startTimeRef.current) {
             startTimeRef.current = Date.now() - pausedTimeRef.current * 1000;
         }
      } else {
         // Timer mode
         if (!timerStartRef.current) {
             // Calculate start time based on current remaining to handle pause
             const alreadyElapsed = targetDuration - remaining;
             timerStartRef.current = Date.now() - (alreadyElapsed * 1000);
         }
      }

      interval = setInterval(() => {
        const now = Date.now();

        if (mode === 'stopwatch') {
            if (startTimeRef.current) {
                const diff = Math.floor((now - startTimeRef.current) / 1000);
                setElapsed(diff);
            }
        } else {
            // Timer
            if (timerStartRef.current) {
                const diff = Math.floor((now - timerStartRef.current) / 1000);
                const left = Math.max(0, targetDuration - diff);
                
                setRemaining(left);

                if (left <= 0) {
                    setIsRunning(false);
                    // Only play in-app sound if app is active (foreground)
                    if (AppState.currentState === 'active') {
                        playCompleteSound();
                    }
                    timerStartRef.current = null;
                }
            }
        }
      }, 500); // Check more frequently than 1s to be accurate
    } else {
      // Paused
      if (mode === 'stopwatch' && startTimeRef.current) {
          pausedTimeRef.current = (Date.now() - startTimeRef.current) / 1000;
          startTimeRef.current = null;
      }
      if (mode === 'timer' && timerStartRef.current) {
           timerStartRef.current = null;
      }
    }

    return () => clearInterval(interval);
  }, [isRunning, mode, targetDuration]); // Intentionally exclude remaining to avoid re-interval

  // Notification management
  useEffect(() => {
      if (isRunning && mode === 'timer' && remaining > 0) {
          // Schedule notification
          scheduleNotification(remaining);
      } else {
          // Cancel if paused or stopped or changed mode
          Notifications.cancelAllScheduledNotificationsAsync();
      }
  }, [isRunning, mode]); // Re-schedule if these change. Note: remaining is not here to avoid spamming schedule, but we need meaningful initial value.

  const scheduleNotification = async (seconds: number) => {
      await Notifications.cancelAllScheduledNotificationsAsync();
      
      // Calculate validation logic
      if (seconds <= 0) return;

      const title = type === 'warmup' ? 'Lämmittely valmis!' : 'Jäähdyttely valmis!';
      const body = 'Aika on täynnä. Palaa treeniin!';

      await Notifications.scheduleNotificationAsync({
          content: {
              title,
              body,
              sound: true, 
              priority: Notifications.AndroidNotificationPriority.HIGH,
          },
          trigger: {
              seconds: seconds,
              type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
              repeats: false,
          }
      });
  };

  // Initialize adaptive default
  useEffect(() => {
      if (suggestion) {
          // Optional
      }
  }, [suggestion]);


  const handleReset = () => {
    setIsRunning(false);
    Notifications.cancelAllScheduledNotificationsAsync();

    // Reset refs
    startTimeRef.current = null;
    pausedTimeRef.current = 0;
    timerStartRef.current = null;

    setElapsed(0);
    if (mode === 'timer') {
        setRemaining(targetDuration);
    }
  };
  
  // When switching modes or setting target
  useEffect(() => {
      // If switching mode, reset timers to be safe? Or keep running?
      // Design decision: Resetting is safer to avoid confusion.
      handleReset();
  }, [mode]);

  useEffect(() => {
      setRemaining(targetDuration);
      timerStartRef.current = null; // Invalidate start ref if target changes
  }, [targetDuration]); // Only update remaining if target changes explicitly (not just tick)

  const handleComplete = () => {
    // Determine duration based on mode
    let finalDuration = elapsed;
    if (mode === 'timer') {
        // Calculate actually spent time in timer mode
        finalDuration = targetDuration - remaining; 
        if (finalDuration < 0) finalDuration = 0; 
        // Or should we count total time spent even if timer used? 
        // For simplicity, let's just use what user "did".
    }

    onComplete({
      duration: Math.max(elapsed, targetDuration - remaining), // naive approach
      method,
      intensity: 5, // Default/Hidden
      notes: '',    // Default/Hidden
      skipped: false,
    });
  };

  const formatTime = (seconds: number) => {
    if (seconds < 0) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Helper for quick settings
  const setQuickTimer = (mins: number) => {
      setIsRunning(false); // Pause first
      setMode('timer');
      const seconds = mins * 60;
      setTargetDuration(seconds);
      setRemaining(seconds);
      timerStartRef.current = null; // Reset ref
      
      setTimeout(() => {
          setIsRunning(true);
      }, 100);
  };

  // Calculate progress for circular indicator
  let progress = 0;
  if (mode === 'timer') {
      progress = targetDuration > 0 ? remaining / targetDuration : 0;
  } else {
      progress = Math.min(elapsed / 600, 1); // Cap at 10 mins for visual
  }
  
  const radius = 100; // Inner radius
  const strokeWidth = 12;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);
  
  const displayTime = mode === 'timer' ? remaining : elapsed;
  const halfSize = radius + strokeWidth;
  const size = halfSize * 2;

  const content = (
      <ScrollView 
        style={[styles.container, overlay && styles.overlayContainer]}
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
          <View style={{ flex: 1 }}>
            {/* Header Area */}
            <View style={styles.header}>
                <View style={{ width: 40 }} /> 
                <Text style={styles.title}>{title}</Text>
                
                {/* Mode Toggle */}
                <Pressable 
                    style={styles.modeToggle}
                    onPress={() => {
                        setMode(prev => prev === 'timer' ? 'stopwatch' : 'timer');
                    }}
                >
                    {mode === 'timer' ? (
                        <History size={24} color={Colors.neon.DEFAULT} /> // Show Stopwatch icon to switch to it
                    ) : (
                        <Timer size={24} color={Colors.neon.DEFAULT} /> // Show Timer icon to switch to it
                    )}
                </Pressable>
            </View>
      

            {/* Heart Rate Monitor */}
            <View style={{ marginBottom: 32 }}>
              <LiveHeartRate />
            </View>

            {/* Circular Timer */}
            <View style={styles.timerContainer}>
              <View style={[styles.circleOuter, { width: size, height: size }]}>
                {/* SVG Ring */}
                <Svg width={size} height={size} style={{ position: 'absolute' }}>
                    {/* Background Track */}
                    <Circle
                        cx={halfSize}
                        cy={halfSize}
                        r={radius}
                        stroke="rgba(255,255,255,0.1)"
                        strokeWidth={strokeWidth}
                        fill="transparent"
                    />
                    {/* Progress Circle with Glow Layers */}
                    <G rotation="-90" origin={`${halfSize}, ${halfSize}`}>
                        {/* Outer Glow */}
                        <Circle
                            cx={halfSize}
                            cy={halfSize}
                            r={radius}
                            stroke={Colors.neon.DEFAULT}
                            strokeWidth={strokeWidth + 8}
                            strokeLinecap="round"
                            fill="transparent"
                            strokeOpacity={0.1}
                            strokeDasharray={circumference}
                            strokeDashoffset={strokeDashoffset}
                        />
                        {/* Inner Glow */}
                        <Circle
                            cx={halfSize}
                            cy={halfSize}
                            r={radius}
                            stroke={Colors.neon.DEFAULT}
                            strokeWidth={strokeWidth + 4}
                            strokeLinecap="round"
                            fill="transparent"
                            strokeOpacity={0.2}
                            strokeDasharray={circumference}
                            strokeDashoffset={strokeDashoffset}
                        />
                        {/* Main Ring */}
                        <Circle
                            cx={halfSize}
                            cy={halfSize}
                            r={radius}
                            stroke={Colors.neon.DEFAULT}
                            strokeWidth={strokeWidth}
                            strokeLinecap="round"
                            fill="transparent"
                            strokeDasharray={circumference}
                            strokeDashoffset={strokeDashoffset}
                        />
                    </G>
                </Svg>

                <View style={styles.circleInner}>
                  <Text style={styles.timerText}>{formatTime(displayTime)}</Text>
                  <Text style={styles.timerLabel}>
                      {mode === 'timer' ? (remaining === 0 ? "Valmis" : "Jäljellä") : t('session.warmup.duration_label')}
                  </Text>
                </View>
              </View>
              
              {/* Quick Settings & Adjustments */}
              <View style={styles.quickSettings}>
                  {/* Decrease Button */}
                  <Pressable 
                    style={styles.adjustBtn}
                    onPress={() => {
                        setIsRunning(false);
                        setMode('timer');
                        const newTime = Math.max(30, targetDuration - 30);
                        setTargetDuration(newTime);
                        setRemaining(newTime);
                        timerStartRef.current = null;
                    }}
                  >
                      <Minus size={20} color={Colors.text.primary} />
                  </Pressable>

                  {[5, 8, 10].map(m => (
                      <Pressable 
                        key={m} 
                        style={[styles.quickBtn, targetDuration === m*60 && mode === 'timer' && styles.quickBtnActive]}
                        onPress={() => setQuickTimer(m)}
                      >
                          <Text style={[styles.quickBtnText, targetDuration === m*60 && mode === 'timer' && styles.quickBtnTextActive]}>{m} min</Text>
                      </Pressable>
                  ))}

                  {/* Increase Button */}
                  <Pressable 
                    style={styles.adjustBtn}
                    onPress={() => {
                        setIsRunning(false);
                        setMode('timer');
                        const newTime = targetDuration + 30;
                        setTargetDuration(newTime);
                        setRemaining(newTime);
                        timerStartRef.current = null;
                    }}
                  >
                      <Plus size={20} color={Colors.text.primary} />
                  </Pressable>
              </View>
            </View>

            {/* Control Buttons */}
            <View style={styles.controls}>
              <Pressable style={styles.resetButton} onPress={handleReset}>
                <RotateCcw size={24} color={Colors.text.primary} />
              </Pressable>
              
              <Pressable 
                style={styles.playButton} 
                onPress={() => setIsRunning(!isRunning)}
              >
                {isRunning ? (
                  <Pause size={28} color="#000" fill="#000" />
                ) : (
                  <Play size={28} color="#000" fill="#000" />
                )}
              </Pressable>
            </View>

            {/* Method Selector */}
            <Pressable 
              style={styles.selectorRow}
              onPress={() => setShowMethodPicker(!showMethodPicker)}
            >
              <Text style={styles.selectorLabel}>{t('session.warmup.method')}</Text>
              <View style={styles.selectorValue}>
                <Text style={styles.selectorValueText}>
                  {METHODS.find(m => m.id === method)?.label}
                </Text>
                <ChevronDown size={20} color={Colors.neon.DEFAULT} />
              </View>
            </Pressable>

            {/* Method Picker Dropdown */}
            {showMethodPicker && (
              <View style={styles.dropdown}>
                {METHODS.map(m => (
                  <Pressable
                    key={m.id}
                    style={[
                      styles.dropdownItem,
                      method === m.id && styles.dropdownItemActive,
                    ]}
                    onPress={() => {
                      setMethod(m.id);
                      setShowMethodPicker(false);
                    }}
                  >
                    <Text style={[
                      styles.dropdownItemText,
                      method === m.id && styles.dropdownItemTextActive,
                    ]}>
                      {m.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}

            {/* Bottom Actions */}
            <View style={styles.actions}>
              <Pressable style={styles.skipButton} onPress={onSkip}>
                <Text style={styles.skipButtonText}>{t('session.warmup.skip')}</Text>
              </Pressable>
              
              <Pressable style={styles.doneButton} onPress={handleComplete}>
                <Check size={20} color="#000" />
                <Text style={styles.doneButtonText}>{t('session.warmup.done')}</Text>
              </Pressable>
            </View>
          </View>
      </ScrollView>
  );

  if (overlay) return content;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
    >
      {content}
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: 24,
    paddingTop: 60,
  },
  overlayContainer: {
    paddingTop: 60, // Ensure same padding
    backgroundColor: Colors.background, // Ensure logic covers
    zIndex: 100, // Ensure on top
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
    marginTop: -20, // Pull up slightly
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text.primary,
    textAlign: 'center',
  },
  modeToggle: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 20,
  },
  suggestionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(0, 255, 65, 0.1)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignSelf: 'center',
    marginBottom: 24,
  },
  suggestionText: {
    fontSize: 14,
    color: Colors.neon.DEFAULT,
    fontWeight: '600',
  },
  quickSettings: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
    alignItems: 'center', // Align properly
  },
  adjustBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  quickBtnActive: {
      backgroundColor: 'rgba(0, 255, 65, 0.1)',
      borderColor: Colors.neon.DEFAULT,
  },
  quickBtnText: {
      fontSize: 14,
      color: Colors.text.secondary,
      fontWeight: '600',
  },
  quickBtnTextActive: {
      color: Colors.neon.DEFAULT,
  },
  timerContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  circleOuter: {
    width: 240,
    height: 240,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleProgress: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    borderWidth: 6,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  circleInner: {
    alignItems: 'center',
  },
  timerText: {
    fontSize: 64,
    fontWeight: '300',
    color: Colors.text.primary,
    fontVariant: ['tabular-nums'],
  },
  timerLabel: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginTop: 4,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    marginBottom: 32,
  },
  resetButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.neon.DEFAULT,
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 4, // Visual centering for play icon
  },
  selectorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: '#111111',
    borderRadius: 12,
    marginBottom: 12,
  },
  selectorLabel: {
    fontSize: 16,
    color: Colors.text.primary,
  },
  selectorValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectorValueText: {
    fontSize: 16,
    color: Colors.neon.DEFAULT,
  },
  dropdown: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
  },
  dropdownItem: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  dropdownItemActive: {
    backgroundColor: 'rgba(0, 255, 65, 0.1)',
  },
  dropdownItemText: {
    fontSize: 16,
    color: Colors.text.secondary,
  },
  dropdownItemTextActive: {
    color: Colors.neon.DEFAULT,
  },
  intensityContainer: {
    flexDirection: 'row',
    backgroundColor: '#111111',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  intensityButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  intensityButtonActive: {
    backgroundColor: Colors.neon.DEFAULT,
  },
  intensityText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.secondary,
  },
  intensityTextActive: {
    color: '#000',
  },
  notesContainer: {
    backgroundColor: '#111111',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  notesLabel: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginBottom: 8,
  },
  notesInput: {
    fontSize: 16,
    color: Colors.text.primary,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 'auto',
    paddingBottom: 40,
  },
  skipButton: {
    flex: 1,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.secondary,
  },
  doneButton: {
    flex: 2,
    flexDirection: 'row',
    height: 56,
    borderRadius: 16,
    backgroundColor: Colors.neon.DEFAULT,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  doneButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
});
