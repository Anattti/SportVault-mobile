import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { Colors } from '@/constants/Colors';
import { CalendarMonth } from '@/types/calendar';
import { DayCell } from './DayCell';
import { getWeekdayNames } from '@/hooks/useCalendarData';
import { CalendarDay } from '@/types/calendar';

interface MonthViewProps {
  calendarMonth: CalendarMonth;
  onDayPress: (day: CalendarDay) => void;
}

export function MonthView({ calendarMonth, onDayPress }: MonthViewProps) {
  const { t } = useTranslation();
  // OPTIMIZED: Use useWindowDimensions for responsive sizing on rotation/foldables
  const { width } = useWindowDimensions();
  const CELL_SIZE = (width - 32) / 7;

  // Week starts on Monday in this app logic (Ma, Ti, Ke, To, Pe, La, Su)
  // Mapping Ma -> nav.mon equivalent
  const weekdays = useMemo(() => [
    t('calendar.weekdays.1'),
    t('calendar.weekdays.2'),
    t('calendar.weekdays.3'),
    t('calendar.weekdays.4'),
    t('calendar.weekdays.5'),
    t('calendar.weekdays.6'),
    t('calendar.weekdays.0'),
  ], [t]);
  
  // Split days into weeks (7 days each)
  const weeks: CalendarDay[][] = [];
  for (let i = 0; i < calendarMonth.days.length; i += 7) {
    weeks.push(calendarMonth.days.slice(i, i + 7));
  }
  
  return (
    <View style={styles.container}>
      {/* Weekday headers */}
      <View style={styles.weekdayRow}>
        {weekdays.map((day, index) => (
          <View key={index} style={[styles.weekdayCell, { width: CELL_SIZE }]}>
            <Text style={[
              styles.weekdayText,
              (index === 5 || index === 6) && styles.weekendText
            ]}>
              {day}
            </Text>
          </View>
        ))}
      </View>
      
      {/* Calendar grid */}
      <View style={styles.grid}>
        {weeks.map((week, weekIndex) => (
          <View key={weekIndex} style={styles.weekRow}>
            {week.map((day, dayIndex) => (
              <DayCell
                key={`${weekIndex}-${dayIndex}`}
                day={day}
                onPress={onDayPress}
              />
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
  },
  weekdayRow: {
    flexDirection: 'row',
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.default,
    paddingBottom: 8,
  },
  weekdayCell: {
    // width is set dynamically in render
    alignItems: 'center',
  },
  weekdayText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text.secondary,
    textTransform: 'uppercase',
  },
  weekendText: {
    color: Colors.text.muted,
  },
  grid: {
    gap: 2,
  },
  weekRow: {
    flexDirection: 'row',
  },
});
