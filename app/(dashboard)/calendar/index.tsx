import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Text,
  ActivityIndicator,
} from 'react-native';
// SafeAreaView ei tarvita - _layout.tsx hoitaa safe area:n
import { Colors } from '@/constants/Colors';
import { useCalendarData } from '@/hooks/useCalendarData';
import {
  CalendarHeader,
  MonthView,
  ScheduleModal,
} from '@/components/calendar';
import { CalendarDay } from '@/types/calendar';

export default function CalendarScreen() {
  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);

  const {
    calendarMonth,
    scheduledWorkouts,
    completedSessions,
    isLoading,
    error,
  } = useCalendarData(currentYear, currentMonth);

  const handlePreviousMonth = useCallback(() => {
    if (currentMonth === 0) {
      setCurrentYear((prev) => prev - 1);
      setCurrentMonth(11);
    } else {
      setCurrentMonth((prev) => prev - 1);
    }
  }, [currentMonth]);

  const handleNextMonth = useCallback(() => {
    if (currentMonth === 11) {
      setCurrentYear((prev) => prev + 1);
      setCurrentMonth(0);
    } else {
      setCurrentMonth((prev) => prev + 1);
    }
  }, [currentMonth]);

  const handleDayPress = useCallback((day: CalendarDay) => {
    setSelectedDay(day);
    setIsModalVisible(true);
  }, []);

  const handleAddPress = useCallback(() => {
    // Find today in calendar or use first day of current month
    const todayDay = calendarMonth.days.find((d) => d.isToday);
    if (todayDay) {
      setSelectedDay(todayDay);
    } else {
      const firstCurrentMonthDay = calendarMonth.days.find((d) => d.isCurrentMonth);
      if (firstCurrentMonthDay) {
        setSelectedDay(firstCurrentMonthDay);
      }
    }
    setIsModalVisible(true);
  }, [calendarMonth]);

  const handleCloseModal = useCallback(() => {
    setIsModalVisible(false);
    setSelectedDay(null);
  }, []);

  // Stats for the month
  const scheduledCount = scheduledWorkouts.length;
  const completedCount = completedSessions.length;

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={false}
            onRefresh={() => {}}
            tintColor={Colors.neon.DEFAULT}
          />
        }
      >
        {/* Header */}
        <CalendarHeader
          year={currentYear}
          month={currentMonth}
          onPreviousMonth={handlePreviousMonth}
          onNextMonth={handleNextMonth}
          onAddPress={handleAddPress}
        />

        {/* Month Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{scheduledCount}</Text>
            <Text style={styles.statLabel}>Suunniteltu</Text>
          </View>
          <View style={[styles.statItem, styles.statItemBorder]}>
            <Text style={[styles.statValue, styles.completedValue]}>{completedCount}</Text>
            <Text style={styles.statLabel}>Suoritettu</Text>
          </View>
        </View>

        {/* Calendar Grid */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.neon.DEFAULT} />
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>Virhe ladattaessa kalenteria</Text>
          </View>
        ) : (
          <MonthView
            calendarMonth={calendarMonth}
            onDayPress={handleDayPress}
          />
        )}

        {/* Legend */}
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, styles.scheduledDot]} />
            <Text style={styles.legendText}>Suunniteltu</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, styles.completedDot]} />
            <Text style={styles.legendText}>Suoritettu</Text>
          </View>
        </View>
      </ScrollView>

      {/* Schedule Modal */}
      <ScheduleModal
        visible={isModalVisible}
        onClose={handleCloseModal}
        selectedDay={selectedDay}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
  },
  statsRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: Colors.glass.DEFAULT,
    borderRadius: 16,
    overflow: 'hidden',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
  },
  statItemBorder: {
    borderLeftWidth: 1,
    borderLeftColor: Colors.border.default,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.status.warning,
  },
  completedValue: {
    color: Colors.neon.DEFAULT,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginTop: 4,
  },
  loadingContainer: {
    padding: 60,
    alignItems: 'center',
  },
  errorContainer: {
    padding: 40,
    alignItems: 'center',
  },
  errorText: {
    color: Colors.status.destructive,
    fontSize: 14,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    paddingVertical: 20,
    marginTop: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  scheduledDot: {
    backgroundColor: Colors.status.warning,
  },
  completedDot: {
    backgroundColor: Colors.neon.DEFAULT,
  },
  legendText: {
    fontSize: 12,
    color: Colors.text.secondary,
  },
});
