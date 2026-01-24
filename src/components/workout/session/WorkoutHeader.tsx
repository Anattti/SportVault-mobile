import React from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Menu, Plus, Zap } from 'lucide-react-native';
import { Colors } from '@/constants/Colors';

interface WorkoutHeaderProps {
  formattedTime: string;
  workoutName: string;
  onClose: () => void;
  onAddExercise?: () => void;
  onOpenMenu?: () => void;
}

export function WorkoutHeader({
  formattedTime,
  workoutName,
  onClose,
  onAddExercise,
  onOpenMenu,
}: WorkoutHeaderProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      {/* Timer */}
      <View style={styles.timerBadge}>
        <Text style={styles.timerText}>{formattedTime}</Text>
      </View>

      {/* Workout Name */}
      <View style={styles.nameBadge}>
        <Zap color={Colors.neon.DEFAULT} size={14}/>
        <Text style={styles.nameText} numberOfLines={1}>
          {workoutName}
        </Text>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        {onAddExercise && (
          <Pressable style={styles.iconButton} onPress={onAddExercise}>
            <Plus color={Colors.text.primary} size={20} />
          </Pressable>
        )}
        {onOpenMenu && (
          <Pressable style={styles.iconButton} onPress={onOpenMenu}>
            <Menu color={Colors.text.primary} size={20} />
          </Pressable>
        )}
        <Pressable onPress={onClose}>
          <Text style={styles.closeText}>{t('session.header.stop')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
    backgroundColor: Colors.background,
  },
  timerBadge: {
    backgroundColor: Colors.glass.DEFAULT,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  timerText: {
    color: Colors.text.primary,
    fontSize: 14,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  nameBadge: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.neon.faint,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  nameIcon: {
    fontSize: 14,
  },
  nameText: {
    color: Colors.neon.DEFAULT,
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.glass.DEFAULT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    color: Colors.status.destructive,
    fontSize: 14,
    fontWeight: '600',
  },
});
