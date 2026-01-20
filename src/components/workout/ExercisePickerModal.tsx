/**
 * Exercise Picker Modal
 * Allows adding exercises mid-workout from existing workout templates
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Search, X, Plus, Dumbbell } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { Colors } from '@/constants/Colors';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import type { WorkoutExercise } from '@/types';

interface ExercisePickerProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (exercise: WorkoutExercise) => void;
  excludeExerciseIds?: string[];
}

export function ExercisePickerModal({ 
  visible, 
  onClose, 
  onSelect,
  excludeExerciseIds = [],
}: ExercisePickerProps) {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch all exercises from user's workouts
  const { data: exercises, isLoading } = useQuery({
    queryKey: ['all_exercises', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('exercises')
        .select(`
          id,
          name,
          category,
          superset_group,
          workout_id,
          exercise_sets (
            id,
            weight,
            reps,
            rest_time,
            rpe,
            is_bodyweight,
            target_type
          )
        `)
        .order('name');

      if (error) throw error;

      // Get unique exercises by name
      const uniqueExercises = new Map<string, WorkoutExercise>();
      
      for (const ex of data || []) {
        if (!uniqueExercises.has(ex.name)) {
          uniqueExercises.set(ex.name, {
            id: ex.id,
            name: ex.name,
            category: ex.category,
            supersetGroup: ex.superset_group,
            sets: (ex.exercise_sets || []).map((set: any) => ({
              id: set.id,
              weight: set.weight || 0,
              reps: set.reps || 10,
              restTime: set.rest_time || 120,
              rpe: set.rpe,
              isBodyweight: set.is_bodyweight || false,
              targetType: set.target_type,
            })),
          });
        }
      }

      return Array.from(uniqueExercises.values());
    },
    enabled: !!user && visible,
    staleTime: 5 * 60 * 1000,
  });

  // Filter exercises based on search and exclusions
  const filteredExercises = useMemo(() => {
    if (!exercises) return [];
    
    return exercises.filter(ex => {
      // Exclude already added exercises
      if (excludeExerciseIds.includes(ex.id)) return false;
      
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return ex.name.toLowerCase().includes(query) ||
               (ex.category && ex.category.toLowerCase().includes(query));
      }
      
      return true;
    });
  }, [exercises, searchQuery, excludeExerciseIds]);

  // Quick-add templates
  const quickAddExercises: WorkoutExercise[] = [
    {
      id: 'quick-1',
      name: 'Käsipainopunnerrus',
      category: 'Rinta',
      supersetGroup: null,
      sets: [
        { id: 'q1s1', weight: 24, reps: 12, restTime: 90, isBodyweight: false, rpe: null, targetType: null },
        { id: 'q1s2', weight: 24, reps: 10, restTime: 90, isBodyweight: false, rpe: null, targetType: null },
        { id: 'q1s3', weight: 24, reps: 8, restTime: 90, isBodyweight: false, rpe: null, targetType: null },
      ],
    },
    {
      id: 'quick-2',
      name: 'Veto ylätaljasta',
      category: 'Selkä',
      supersetGroup: null,
      sets: [
        { id: 'q2s1', weight: 60, reps: 12, restTime: 90, isBodyweight: false, rpe: null, targetType: null },
        { id: 'q2s2', weight: 60, reps: 10, restTime: 90, isBodyweight: false, rpe: null, targetType: null },
        { id: 'q2s3', weight: 60, reps: 8, restTime: 90, isBodyweight: false, rpe: null, targetType: null },
      ],
    },
    {
      id: 'quick-3',
      name: 'Hauiskääntö',
      category: 'Käsivarret',
      supersetGroup: null,
      sets: [
        { id: 'q3s1', weight: 12, reps: 12, restTime: 60, isBodyweight: false, rpe: null, targetType: null },
        { id: 'q3s2', weight: 12, reps: 10, restTime: 60, isBodyweight: false, rpe: null, targetType: null },
      ],
    },
  ];

  const handleSelect = (exercise: WorkoutExercise) => {
    onSelect(exercise);
    onClose();
    setSearchQuery('');
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Lisää liike</Text>
          <Pressable style={styles.closeButton} onPress={onClose}>
            <X size={24} color={Colors.text.primary} />
          </Pressable>
        </View>

        {/* Search */}
        <View style={styles.searchContainer}>
          <Search size={20} color={Colors.text.secondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Etsi liikettä..."
            placeholderTextColor={Colors.text.secondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color={Colors.neon.DEFAULT} />
          </View>
        ) : (
          <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
            {/* Quick Add */}
            {!searchQuery && (
              <>
                <Text style={styles.sectionTitle}>Pikaluonti</Text>
                {quickAddExercises
                  .filter(ex => !excludeExerciseIds.includes(ex.id))
                  .map(exercise => (
                    <Pressable
                      key={exercise.id}
                      style={styles.exerciseCard}
                      onPress={() => handleSelect(exercise)}
                    >
                      <View style={styles.exerciseIcon}>
                        <Dumbbell size={20} color={Colors.neon.DEFAULT} />
                      </View>
                      <View style={styles.exerciseInfo}>
                        <Text style={styles.exerciseName}>{exercise.name}</Text>
                        <Text style={styles.exerciseCategory}>
                          {exercise.category} • {exercise.sets.length} sarjaa
                        </Text>
                      </View>
                      <View style={styles.addButton}>
                        <Plus size={20} color={Colors.neon.DEFAULT} />
                      </View>
                    </Pressable>
                  ))}
                
                <Text style={[styles.sectionTitle, { marginTop: 24 }]}>
                  Aiemmat liikkeet
                </Text>
              </>
            )}

            {/* Exercise List */}
            {filteredExercises.map(exercise => (
              <Pressable
                key={exercise.id}
                style={styles.exerciseCard}
                onPress={() => handleSelect(exercise)}
              >
                <View style={styles.exerciseIcon}>
                  <Dumbbell size={20} color={Colors.text.secondary} />
                </View>
                <View style={styles.exerciseInfo}>
                  <Text style={styles.exerciseName}>{exercise.name}</Text>
                  <Text style={styles.exerciseCategory}>
                    {exercise.category || 'Ei kategoriaa'} • {exercise.sets.length} sarjaa
                  </Text>
                </View>
                <View style={styles.addButton}>
                  <Plus size={20} color={Colors.neon.DEFAULT} />
                </View>
              </Pressable>
            ))}

            {filteredExercises.length === 0 && !isLoading && (
              <Text style={styles.noResults}>
                Ei löytynyt liikkeitä hakusanalla "{searchQuery}"
              </Text>
            )}

            <View style={{ height: 100 }} />
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: Colors.text.primary,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 20,
    paddingHorizontal: 16,
    height: 48,
    backgroundColor: '#111111',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.text.primary,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    flex: 1,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.secondary,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  exerciseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 8,
    backgroundColor: '#111111',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    gap: 12,
  },
  exerciseIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  exerciseInfo: {
    flex: 1,
    gap: 2,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  exerciseCategory: {
    fontSize: 14,
    color: Colors.text.secondary,
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 255, 65, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  noResults: {
    fontSize: 14,
    color: Colors.text.secondary,
    textAlign: 'center',
    padding: 40,
  },
});
