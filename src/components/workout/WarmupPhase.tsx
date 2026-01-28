/**
 * Warmup Phase Component
 * Matches Next.js PWA design - shown before and after workout session
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  Modal,
  Keyboard,
  TouchableWithoutFeedback,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Play, Pause, RotateCcw, Check, ChevronDown, Timer, History, BellRing, Plus, Minus } from 'lucide-react-native';
import { RPESlider } from './session/RPESlider';
import { Colors } from '@/constants/Colors';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import Svg, { Circle, G } from 'react-native-svg';

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

  const [duration, setDuration] = useState(0); // Current elapsed time or remaining time based on mode? 
  // Let's keep 'duration' as the actual time spent for the record.
  // We need a separate Display Time or Timer State.
  // Actually, requested: "valita haluaako ajastimen vai ajan kulkemaan 0s eteenpäin"
  // So we need two modes.
  
  const [mode, setMode] = useState<'stopwatch' | 'timer'>('stopwatch'); 
  const [targetDuration, setTargetDuration] = useState(300); // Default 5 min for timer
  const [elapsed, setElapsed] = useState(0); // always counts up for record keeping
  const [remaining, setRemaining] = useState(300); // for timer mode

  const [isRunning, setIsRunning] = useState(false);
  const [method, setMethod] = useState<WarmupMethod>('juoksumatto');
  const [intensity, setIntensity] = useState<WarmupIntensity>(5);
  const [notes, setNotes] = useState('');
  const [showMethodPicker, setShowMethodPicker] = useState(false);

  const isWarmup = type === 'warmup';
  const title = isWarmup ? t('session.warmup.warmup_title') : t('session.warmup.cooldown_title');

  // Sound loading
  const playSound = async () => {
      try {
          // Play a simple system sound or use expo-av if asset exists. 
          // For now, simple Haptic is reliable.
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (e) {
          console.log('Feedback error', e);
      }
  };

  // Timer logic
  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      setElapsed(prev => prev + 1);
      
      if (mode === 'timer') {
        setRemaining(prev => {
            const next = prev - 1;
            // Feedback logic
            if (next === 0) {
                // Finished
                playSound();
                setIsRunning(false);
                return 0;
            }
            if (next === 30) {
                // Last 30s
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            }
            if (targetDuration > 0 && next === Math.floor(targetDuration / 2)) {
                 // Halfway
                 Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }
            return next;
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, mode, targetDuration]);

  // Initialize adaptive default
  useEffect(() => {
      if (suggestion) {
          // Optional: Pre-select something? Or just show the hint.
          // User said "ehdota" (suggest). We can show it in UI.
      }
  }, [suggestion]);


  const handleReset = () => {
    setElapsed(0);
    if (mode === 'timer') {
        setRemaining(targetDuration);
    }
    setIsRunning(false);
  };
  
  // When switching modes or setting target
  useEffect(() => {
      if (mode === 'timer') {
          setRemaining(targetDuration);
      } else {
          // Stopwatch just shows 'elapsed'
      }
  }, [mode, targetDuration]);

  const handleComplete = () => {
    onComplete({
      duration: elapsed, // Always return actual time spent
      method,
      intensity,
      notes,
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
      setMode('timer');
      setTargetDuration(mins * 60);
      setRemaining(mins * 60);
      setIsRunning(true);
  };

  // Calculate progress for circular indicator
  // Stopwatch: Fill up 10 mins? Or just spin?
  // Timer: 100% -> 0%
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
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
      <ScrollView 
        style={[styles.container, overlay && styles.overlayContainer]}
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <View style={{ flex: 1 }}>
            {/* Header Area */}
            <View style={styles.header}>
                <View style={{ width: 40 }} /> 
                <Text style={styles.title}>{title}</Text>
                
                {/* Mode Toggle */}
                <Pressable 
                    style={styles.modeToggle}
                    onPress={() => {
                        setIsRunning(false);
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
            
            {/* Adaptive Suggestion Hint */}
            {suggestion && (
                <View style={styles.suggestionContainer}>
                    <BellRing size={14} color={Colors.neon.DEFAULT} />
                    <Text style={styles.suggestionText}>
                        Suositus: {suggestion.label}
                    </Text>
                </View>
            )}

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
                        setMode('timer');
                        const newTime = Math.max(30, targetDuration - 30);
                        setTargetDuration(newTime);
                        setRemaining(newTime);
                        setIsRunning(false); 
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
                        setMode('timer');
                        const newTime = targetDuration + 30;
                        setTargetDuration(newTime);
                        setRemaining(newTime);
                        setIsRunning(false);
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

            {/* Intensity Selector - Replaced with RPE Slider */}
            <View style={{ marginBottom: 24 }}>
                <RPESlider
                    value={intensity}
                    onChange={setIntensity}
                />
            </View>

            {/* Notes */}
            <View style={styles.notesContainer}>
              <Text style={styles.notesLabel}>{t('session.warmup.notes')}</Text>
              <TextInput
                style={styles.notesInput}
                placeholder={t('session.warmup.notes_placeholder')}
                placeholderTextColor="rgba(255,255,255,0.3)"
                value={notes}
                onChangeText={setNotes}
                multiline
                returnKeyType="done"
                blurOnSubmit={true}
                onSubmitEditing={Keyboard.dismiss}
              />
            </View>

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
        </TouchableWithoutFeedback>
      </ScrollView>
    </KeyboardAvoidingView>
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
