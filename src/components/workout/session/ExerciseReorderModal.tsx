import React, { useState, useRef, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, Modal, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DraggableFlatList, {
  ScaleDecorator,
  RenderItemParams,
} from 'react-native-draggable-flatlist';
import * as Haptics from 'expo-haptics';
import { GripVertical, X, Check } from 'lucide-react-native';
import { Colors } from '@/constants/Colors';
import type { WorkoutExercise } from '@/types';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

interface ExerciseReorderModalProps {
  visible: boolean;
  exercises: WorkoutExercise[];
  completedIndices: number[]; // Indices of exercises that have at least one completed set
  onClose: () => void;
  onSave: (newOrder: number[]) => void;
}

interface ReorderItem {
  exercise: WorkoutExercise;
  originalIndex: number;
  isCompleted: boolean;
}

export function ExerciseReorderModal({
  visible,
  exercises,
  completedIndices,
  onClose,
  onSave,
}: ExerciseReorderModalProps) {
  const insets = useSafeAreaInsets();
  const prevVisible = useRef(false);
  
  // Split items into completed (fixed) and pending (draggable)
  const [completedItems, setCompletedItems] = useState<ReorderItem[]>([]);
  const [pendingItems, setPendingItems] = useState<ReorderItem[]>([]);

  // Initialize/Reset items when modal opens
  useEffect(() => {
    if (visible && !prevVisible.current) {
      const allItems = exercises.map((exercise, index) => ({
        exercise,
        originalIndex: index,
        isCompleted: completedIndices.includes(index),
      }));

      setCompletedItems(allItems.filter(i => i.isCompleted));
      setPendingItems(allItems.filter(i => !i.isCompleted));
    }
    prevVisible.current = visible;
  }, [visible, exercises, completedIndices]);

  const handleSave = () => {
    // Combine fixed completed items + reordered pending items
    const newOrder = [
      ...completedItems.map(item => item.originalIndex),
      ...pendingItems.map(item => item.originalIndex)
    ];
    onSave(newOrder);
  };

  const renderDraggableItem = ({ item, drag, isActive, getIndex }: RenderItemParams<ReorderItem>) => {
    // Determine display index: count completed items + current index in pending list + 1
    const displayIndex = completedItems.length + (getIndex() ?? 0) + 1;
    
    return (
      <ScaleDecorator activeScale={1.0}>
        <Pressable
          onLongPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            drag();
          }}
          disabled={isActive}
          style={[
            styles.itemContainer,
            isActive && styles.itemActive,
          ]}
        >
          <View style={styles.indexBadge}>
            <Text style={styles.indexText}>{displayIndex}</Text>
          </View>
          <Text style={styles.exerciseName}>{item.exercise.name}</Text>
          <GripVertical color={Colors.text.muted} size={20} />
        </Pressable>
      </ScaleDecorator>
    );
  };

  const renderCompletedItem = (item: ReorderItem, index: number) => {
    const displayIndex = index + 1;
    return (
      <View key={item.exercise.id} style={[styles.itemContainer, styles.itemCompleted]}>
        <View style={[styles.indexBadge, styles.indexBadgeCompleted]}>
          <Text style={styles.indexText}>{displayIndex}</Text>
        </View>
        
        <Text style={[styles.exerciseName, styles.exerciseNameCompleted]}>
          {item.exercise.name}
        </Text>
        
        <View style={styles.completedTag}>
          <Text style={styles.completedTagText}>Valmis</Text>
        </View>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
            <Text style={styles.title}>Muokkaa liikkeiden järjestystä</Text>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <X color={Colors.text.primary} size={24} />
            </Pressable>
          </View>

          <View style={styles.contentContainer}>
             {/* Fixed List (Completed) */}
             {completedItems.length > 0 && (
              <View style={styles.completedSection}>
                {completedItems.map(renderCompletedItem)}
                <View style={styles.separator} />
              </View>
            )}

            {/* Draggable List (Pending) */}
            <GestureHandlerRootView style={{ flex: 1 }}>
              <DraggableFlatList
                data={pendingItems}
                onDragEnd={({ data }) => setPendingItems(data)}
                keyExtractor={(item) => item.exercise.id}
                renderItem={renderDraggableItem}
                containerStyle={styles.listContainer}
              />
            </GestureHandlerRootView>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Pressable style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Peruuta</Text>
            </Pressable>
            <Pressable style={styles.saveButton} onPress={handleSave}>
              <Text style={styles.saveButtonText}>Tallenna järjestys</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.default,
  },
  title: {
    color: Colors.text.primary,
    fontSize: 18,
    fontWeight: '700',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.glass.DEFAULT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentContainer: {
    flex: 1,
  },
  completedSection: {
    padding: 16,
    paddingBottom: 0,
  },
  listContainer: {
    padding: 16,
    paddingTop: 20, // Avoid double padding with completed section
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card.DEFAULT, // Dark card background
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border.default,
    gap: 12,
  },
  itemActive: {
    borderColor: Colors.neon.DEFAULT,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
    zIndex: 100,
  },
  itemCompleted: {
    borderColor: '#333', // Subtle border
    backgroundColor: '#000', // Darker background to recede
    borderLeftWidth: 4, // Green accent on left
    borderLeftColor: Colors.neon.DEFAULT,
    paddingLeft: 12, // Compensate for border
  },
  separator: {
    height: 1,
    backgroundColor: Colors.border.default,
    marginVertical: 12,
    marginTop: 0,
  },
  indexBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.glass.DEFAULT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indexBadgeCompleted: {
    backgroundColor: Colors.neon.faint, // Greenish background
  },
  indexText: {
    color: Colors.text.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  exerciseName: {
    flex: 1,
    color: Colors.text.primary,
    fontSize: 16,
    fontWeight: '500',
  },
  exerciseNameCompleted: {
    color: Colors.neon.DEFAULT, // Green text for completed name? Or white? Image shows green name.
  },
  completedTag: {
    backgroundColor: Colors.neon.faint,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  completedTagText: {
    color: Colors.neon.DEFAULT,
    fontSize: 12,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border.default,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: Colors.glass.DEFAULT,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: Colors.text.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    backgroundColor: Colors.neon.DEFAULT,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  saveButtonText: {
    color: Colors.background,
    fontSize: 16,
    fontWeight: '600',
  },
});
