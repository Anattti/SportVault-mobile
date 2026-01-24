import React, { useState, useCallback, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, StyleSheet, Pressable, GestureResponderEvent } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/constants/Colors';

interface RPESliderProps {
  value: number;
  onChange: (value: number) => void;
}

export function RPESlider({ value, onChange }: RPESliderProps) {
  const { t } = useTranslation();
  const containerRef = useRef<View>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const lastValueRef = useRef(value);

  const rpeInfo = useMemo(() => [
    { text: t('session.rpe.very_light'), color: '#4ADE80' },
    { text: t('session.rpe.very_light'), color: '#4ADE80' },
    { text: t('session.rpe.light_exertion'), color: '#86EFAC' },
    { text: t('session.rpe.light_exertion'), color: '#86EFAC' },
    { text: t('session.rpe.moderate'), color: '#FACC15' },
    { text: t('session.rpe.moderate'), color: '#FACC15' },
    { text: t('session.rpe.hard'), color: '#F97316' },
    { text: t('session.rpe.hard'), color: '#F97316' },
    { text: t('session.rpe.very_hard'), color: '#EF4444' },
    { text: t('session.rpe.max'), color: '#DC2626' },
  ], [t]);

  const currentInfo = rpeInfo[Math.min(value - 1, 9)];

  const calculateValue = useCallback((pageX: number, containerPageX: number) => {
    const relativeX = pageX - containerPageX;
    const percentage = relativeX / containerWidth;
    const newValue = Math.max(1, Math.min(10, Math.ceil(percentage * 10)));
    return newValue;
  }, [containerWidth]);

  const handlePress = useCallback((event: GestureResponderEvent) => {
    containerRef.current?.measure((x, y, width, height, pageX, pageY) => {
      const newValue = calculateValue(event.nativeEvent.pageX, pageX);
      if (newValue !== lastValueRef.current) {
        lastValueRef.current = newValue;
        Haptics.selectionAsync();
        onChange(newValue);
      }
    });
  }, [calculateValue, onChange]);

  const handleMove = useCallback((event: GestureResponderEvent) => {
    containerRef.current?.measure((x, y, width, height, pageX, pageY) => {
      const newValue = calculateValue(event.nativeEvent.pageX, pageX);
      if (newValue !== lastValueRef.current) {
        lastValueRef.current = newValue;
        Haptics.selectionAsync();
        onChange(newValue);
      }
    });
  }, [calculateValue, onChange]);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{t('session.rpe.title')}</Text>
      
      {/* Header Info */}
      <View style={styles.headerRow}>
        <Text style={[styles.valueText, { color: currentInfo.color }]}>
          {value}
        </Text>
        <Text style={styles.infoText}>
          {currentInfo.text}
        </Text>
      </View>

      {/* Bar Container */}
      <View 
        ref={containerRef}
        style={styles.barsContainer}
        onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={handlePress}
        onResponderMove={handleMove}
      >
        {Array.from({ length: 10 }, (_, i) => i + 1).map((num) => {
          const isActive = num <= value;
          const isCurrent = num === value;
          // Height grows from 40% to 100%
          const heightPercent = 40 + ((num - 1) / 9) * 60;

          return (
            <View
              key={num}
              style={[
                styles.bar,
                {
                  height: `${heightPercent}%`,
                  backgroundColor: isActive ? currentInfo.color : 'rgba(255, 255, 255, 0.1)',
                  opacity: isActive ? 1 : 0.3,
                  transform: [{ scaleY: isCurrent ? 1.05 : 1 }],
                },
                isCurrent && {
                  shadowColor: currentInfo.color,
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 0.6,
                  shadowRadius: 8,
                },
              ]}
            />
          );
        })}
      </View>

      {/* Labels */}
      <View style={styles.labelsRow}>
        <Text style={styles.endLabel}>{t('session.rpe.label_light')}</Text>
        <Text style={styles.endLabel}>{t('session.rpe.label_hard')}</Text>
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
    padding: 16,
  },
  label: {
    color: Colors.text.muted,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 16,
  },
  valueText: {
    fontSize: 28,
    fontWeight: '800',
  },
  infoText: {
    color: Colors.text.primary,
    fontSize: 15,
    fontWeight: '500',
  },
  barsContainer: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 6,
  },
  bar: {
    flex: 1,
    borderRadius: 12,
  },
  labelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  endLabel: {
    color: Colors.text.muted,
    fontSize: 11,
    fontWeight: '600',
  },
});
