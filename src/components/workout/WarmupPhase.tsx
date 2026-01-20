/**
 * Warmup Phase Component
 * Matches Next.js PWA design - shown before and after workout session
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  Modal,
} from 'react-native';
import { Play, Pause, RotateCcw, Check, ChevronDown } from 'lucide-react-native';
import { Colors } from '@/constants/Colors';

export type WarmupMethod = 'juoksumatto' | 'cross-trainer' | 'kuntopyora' | 'soutulaite' | 'hyppynaru' | 'muu';
export type WarmupIntensity = 'kevyt' | 'keskitaso' | 'raskas';

export interface WarmupPhaseData {
  duration: number; // seconds elapsed
  method: WarmupMethod;
  intensity: WarmupIntensity;
  notes: string;
  skipped: boolean;
}

interface WarmupPhaseProps {
  type: 'warmup' | 'cooldown';
  visible: boolean;
  onComplete: (data: WarmupPhaseData) => void;
  onSkip: () => void;
}

const METHODS: { id: WarmupMethod; label: string }[] = [
  { id: 'juoksumatto', label: 'Juoksumatto' },
  { id: 'cross-trainer', label: 'Cross-trainer' },
  { id: 'kuntopyora', label: 'Kuntopyörä' },
  { id: 'soutulaite', label: 'Soutulaite' },
  { id: 'hyppynaru', label: 'Hyppynaru' },
  { id: 'muu', label: 'Muu' },
];

const INTENSITIES: { id: WarmupIntensity; label: string }[] = [
  { id: 'kevyt', label: 'Kevyt' },
  { id: 'keskitaso', label: 'Keskitaso' },
  { id: 'raskas', label: 'Raskas' },
];

export function WarmupPhase({ type, visible, onComplete, onSkip }: WarmupPhaseProps) {
  const [duration, setDuration] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [method, setMethod] = useState<WarmupMethod>('juoksumatto');
  const [intensity, setIntensity] = useState<WarmupIntensity>('keskitaso');
  const [notes, setNotes] = useState('');
  const [showMethodPicker, setShowMethodPicker] = useState(false);

  const isWarmup = type === 'warmup';
  const title = isWarmup ? 'Alkulämmittely' : 'Loppujäähdyttely';

  // Timer logic
  useEffect(() => {
    if (!isRunning) return;

    const timer = setInterval(() => {
      setDuration(prev => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [isRunning]);

  const handleReset = () => {
    setDuration(0);
    setIsRunning(false);
  };

  const handleComplete = () => {
    onComplete({
      duration,
      method,
      intensity,
      notes,
      skipped: false,
    });
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate progress for circular indicator (max 10 minutes for full circle)
  const progress = Math.min(duration / 600, 1);
  const circumference = 2 * Math.PI * 110;
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
    >
      <View style={styles.container}>
        {/* Title */}
        <Text style={styles.title}>{title}</Text>

        {/* Circular Timer */}
        <View style={styles.timerContainer}>
          <View style={styles.circleOuter}>
            {/* SVG-like circle using View border */}
            <View style={[styles.circleProgress, { 
              borderColor: duration > 0 ? Colors.neon.DEFAULT : 'rgba(255,255,255,0.2)',
            }]} />
            <View style={styles.circleInner}>
              <Text style={styles.timerText}>{formatTime(duration)}</Text>
              <Text style={styles.timerLabel}>Kesto</Text>
            </View>
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
          <Text style={styles.selectorLabel}>Tapa</Text>
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

        {/* Intensity Selector */}
        <View style={styles.intensityContainer}>
          {INTENSITIES.map(i => (
            <Pressable
              key={i.id}
              style={[
                styles.intensityButton,
                intensity === i.id && styles.intensityButtonActive,
              ]}
              onPress={() => setIntensity(i.id)}
            >
              <Text style={[
                styles.intensityText,
                intensity === i.id && styles.intensityTextActive,
              ]}>
                {i.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Notes */}
        <View style={styles.notesContainer}>
          <Text style={styles.notesLabel}>Muistiinpanot</Text>
          <TextInput
            style={styles.notesInput}
            placeholder="Kirjoita fiilikset..."
            placeholderTextColor="rgba(255,255,255,0.3)"
            value={notes}
            onChangeText={setNotes}
            multiline
          />
        </View>

        {/* Bottom Actions */}
        <View style={styles.actions}>
          <Pressable style={styles.skipButton} onPress={onSkip}>
            <Text style={styles.skipButtonText}>Ohita</Text>
          </Pressable>
          
          <Pressable style={styles.doneButton} onPress={handleComplete}>
            <Check size={20} color="#000" />
            <Text style={styles.doneButtonText}>Valmis</Text>
          </Pressable>
        </View>
      </View>
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
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text.primary,
    textAlign: 'center',
    marginBottom: 32,
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
