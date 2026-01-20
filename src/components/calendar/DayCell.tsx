import React, { memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { Colors } from '@/constants/Colors';
import { CalendarDay } from '@/types/calendar';

interface DayCellProps {
  day: CalendarDay;
  onPress: (day: CalendarDay) => void;
}

const SCREEN_WIDTH = Dimensions.get('window').width;
const CELL_SIZE = (SCREEN_WIDTH - 32) / 7; // 16px padding on each side

// OPTIMIZED: Memoized component to prevent unnecessary re-renders
// Only re-renders when day data actually changes
function DayCellComponent({ day, onPress }: DayCellProps) {
  const hasScheduled = day.scheduledWorkouts.length > 0;
  const hasCompleted = day.completedSessionsCount > 0;
  
  return (
    <TouchableOpacity
      style={[
        styles.cell,
        !day.isCurrentMonth && styles.otherMonth,
        day.isToday && styles.today,
      ]}
      onPress={() => onPress(day)}
      activeOpacity={0.7}
    >
      <Text
        style={[
          styles.dayNumber,
          !day.isCurrentMonth && styles.otherMonthText,
          day.isToday && styles.todayText,
        ]}
      >
        {day.date.getDate()}
      </Text>
      
      {/* Indicators */}
      <View style={styles.indicators}>
        {hasScheduled && (
          <View style={[styles.indicator, styles.scheduledIndicator]} />
        )}
        {hasCompleted && (
          <View style={[styles.indicator, styles.completedIndicator]} />
        )}
      </View>
    </TouchableOpacity>
  );
}

// Custom comparison - only re-render if day data changed
export const DayCell = memo(DayCellComponent, (prevProps, nextProps) => {
  const prev = prevProps.day;
  const next = nextProps.day;
  
  return (
    prev.dateString === next.dateString &&
    prev.isToday === next.isToday &&
    prev.isCurrentMonth === next.isCurrentMonth &&
    prev.scheduledWorkouts.length === next.scheduledWorkouts.length &&
    prev.completedSessionsCount === next.completedSessionsCount
  );
});

const styles = StyleSheet.create({
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
  },
  otherMonth: {
    opacity: 0.3,
  },
  today: {
    backgroundColor: Colors.neon.faint,
    borderRadius: CELL_SIZE / 2,
  },
  dayNumber: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text.primary,
  },
  otherMonthText: {
    color: Colors.text.muted,
  },
  todayText: {
    color: Colors.neon.DEFAULT,
    fontWeight: '700',
  },
  indicators: {
    flexDirection: 'row',
    gap: 3,
    marginTop: 2,
    height: 6,
  },
  indicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  scheduledIndicator: {
    backgroundColor: Colors.status.warning,
  },
  completedIndicator: {
    backgroundColor: Colors.neon.DEFAULT,
  },
});
