import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  TextInput,
  Alert,
} from 'react-native';
import { X, CheckCircle, Trash2, Dumbbell, Calendar, Check } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { Colors } from '@/constants/Colors';
import { CalendarDay, ScheduledWorkout } from '@/types/calendar';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useScheduleWorkout, useDeleteScheduledWorkout, useUpdateScheduledWorkout } from '@/hooks/useScheduledWorkouts';
import { getWorkoutEmoji } from '@/hooks/useWorkoutHistory';

interface ScheduleModalProps {
  visible: boolean;
  onClose: () => void;
  selectedDay: CalendarDay | null;
}

interface WorkoutOption {
  id: string;
  program: string;
  workoutType: string;
}

export function ScheduleModal({ visible, onClose, selectedDay }: ScheduleModalProps) {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const [workouts, setWorkouts] = useState<WorkoutOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedWorkout, setSelectedWorkout] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  
  const scheduleWorkout = useScheduleWorkout();
  const deleteScheduled = useDeleteScheduledWorkout();
  const updateScheduled = useUpdateScheduledWorkout();

  // Fetch available workout templates
  useEffect(() => {
    if (visible && user?.id) {
      fetchWorkouts();
    }
  }, [visible, user?.id]);

  const fetchWorkouts = async () => {
    if (!user?.id) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('workouts')
        .select('id, program, workout_type')
        .eq('user_id', user.id)
        .order('display_order', { ascending: true });

      if (error) throw error;
      
      setWorkouts(
        (data || []).map((w) => ({
          id: w.id,
          program: w.program,
          workoutType: w.workout_type,
        }))
      );
    } catch (error) {
      console.error('Error fetching workouts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSchedule = async () => {
    if (!selectedWorkout || !selectedDay) return;

    try {
      await scheduleWorkout.mutateAsync({
        workoutId: selectedWorkout,
        scheduledDate: selectedDay.dateString,
        notes: notes.trim() || undefined,
      });
      
      handleClose();
    } catch (error) {
      Alert.alert(t('profile.error'), t('calendar.modal.errors.schedule_failed'));
    }
  };

  const handleDeleteScheduled = async (scheduledId: string) => {
    Alert.alert(
      t('calendar.modal.delete_title'),
      t('calendar.modal.delete_confirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteScheduled.mutateAsync(scheduledId);
            } catch (error) {
              Alert.alert(t('profile.error'), t('calendar.modal.errors.delete_failed'));
            }
          },
        },
      ]
    );
  };

  const handleMarkCompleted = async (scheduled: ScheduledWorkout) => {
    try {
      await updateScheduled.mutateAsync({
        id: scheduled.id,
        updates: { status: 'completed' },
      });
    } catch (error) {
      Alert.alert(t('profile.error'), t('calendar.modal.errors.update_failed'));
    }
  };

  const handleClose = () => {
    setSelectedWorkout(null);
    setNotes('');
    onClose();
  };

  if (!selectedDay) return null;
  
  const locale = i18n.language === 'fi' ? 'fi-FI' : 'en-US';
  const formattedDate = selectedDay.date.toLocaleDateString(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <BlurView intensity={20} style={styles.overlay} tint="dark">
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>{formattedDate}</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <X size={24} color={Colors.text.primary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Scheduled workouts for this day */}
            {selectedDay.scheduledWorkouts.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{t('calendar.modal.scheduled_title')}</Text>
                {selectedDay.scheduledWorkouts.map((scheduled) => (
                  <View key={scheduled.id} style={styles.scheduledCard}>
                    <View style={styles.scheduledInfo}>
                      <Text style={styles.scheduledEmoji}>
                        {getWorkoutEmoji(scheduled.workout?.workoutType || null)}
                      </Text>
                      <View style={styles.scheduledTextContainer}>
                        <Text style={styles.scheduledName}>
                          {scheduled.workout?.program || t('history.default_session_name')}
                        </Text>
                        <Text style={styles.scheduledStatus}>
                          {scheduled.status === 'completed' ? `✅ ${t('calendar.modal.status.completed')}` : 
                           scheduled.status === 'skipped' ? `⏭️ ${t('calendar.modal.status.skipped')}` : `📅 ${t('calendar.modal.status.scheduled')}`}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.scheduledActions}>
                      {scheduled.status === 'pending' && (
                        <TouchableOpacity
                          style={styles.actionButton}
                          onPress={() => handleMarkCompleted(scheduled)}
                        >
                          <CheckCircle size={24} color={Colors.neon.DEFAULT} />
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => handleDeleteScheduled(scheduled.id)}
                      >
                        <Trash2 size={20} color={Colors.status.destructive} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Completed sessions (Badge style) */}
            {selectedDay.completedSessionsCount > 0 && (
              <View style={styles.completedBadge}>
                <Dumbbell size={16} color={Colors.neon.DEFAULT} />
                <Text style={styles.completedText}>
                  {t('calendar.modal.completed_badge', { count: selectedDay.completedSessionsCount })}
                </Text>
              </View>
            )}

            {/* Add new scheduled workout */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('calendar.modal.add_title')}</Text>
              
              {isLoading ? (
                <ActivityIndicator color={Colors.neon.DEFAULT} style={{ marginVertical: 20 }} />
              ) : workouts.length === 0 ? (
                <Text style={styles.emptyText}>
                  {t('calendar.modal.no_templates')}
                </Text>
              ) : (
                <View style={styles.workoutGrid}>
                  {workouts.map((workout) => (
                    <TouchableOpacity
                      key={workout.id}
                      style={[
                        styles.workoutCard,
                        selectedWorkout === workout.id && styles.workoutCardSelected,
                      ]}
                      onPress={() => setSelectedWorkout(workout.id)}
                    >
                      <Text style={styles.workoutEmoji}>
                        {getWorkoutEmoji(workout.workoutType)}
                      </Text>
                      <Text style={styles.workoutName} numberOfLines={2}>
                        {workout.program}
                      </Text>
                      {selectedWorkout === workout.id && (
                        <View style={styles.checkmark}>
                          <Check size={16} color={Colors.background} />
                        </View>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Notes input */}
              {selectedWorkout && (
                <TextInput
                  style={styles.notesInput}
                  placeholder={t('calendar.modal.notes_placeholder')}
                  placeholderTextColor={Colors.text.muted}
                  value={notes}
                  onChangeText={setNotes}
                  multiline
                />
              )}
            </View>
          </ScrollView>

          {/* Schedule button */}
          {selectedWorkout && (
            <TouchableOpacity
              style={styles.scheduleButton}
              onPress={handleSchedule}
              disabled={scheduleWorkout.isPending}
            >
              {scheduleWorkout.isPending ? (
                <ActivityIndicator color={Colors.background} />
              ) : (
                <>
                  <Calendar size={20} color={Colors.background} />
                  <Text style={styles.scheduleButtonText}>{t('calendar.modal.schedule_button')}</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      </BlurView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    borderWidth: 1,
    borderColor: Colors.glass.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.default,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text.primary,
    textTransform: 'capitalize',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.glass.DEFAULT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.secondary,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  scheduledCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.glass.DEFAULT,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  scheduledInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  scheduledEmoji: {
    fontSize: 24,
    marginRight: 12,
  },
  scheduledTextContainer: {
    flex: 1,
  },
  scheduledName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  scheduledStatus: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginTop: 2,
  },
  scheduledActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.card.DEFAULT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.neon.faint,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  completedText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.neon.DEFAULT,
  },
  emptyText: {
    color: Colors.text.muted,
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 20,
  },
  workoutGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  workoutCard: {
    width: '31%',
    backgroundColor: Colors.glass.DEFAULT,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
    position: 'relative',
  },
  workoutCardSelected: {
    borderColor: Colors.neon.DEFAULT,
    backgroundColor: Colors.neon.faint,
  },
  workoutEmoji: {
    fontSize: 28,
    marginBottom: 6,
  },
  workoutName: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.text.primary,
    textAlign: 'center',
  },
  checkmark: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.neon.DEFAULT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notesInput: {
    backgroundColor: Colors.glass.DEFAULT,
    borderRadius: 12,
    padding: 12,
    marginTop: 16,
    color: Colors.text.primary,
    fontSize: 14,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  scheduleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.neon.DEFAULT,
    marginHorizontal: 20,
    marginBottom: 34,
    marginTop: 8,
    paddingVertical: 16,
    borderRadius: 12,
  },
  scheduleButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.background,
  },
});
