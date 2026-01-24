import React from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react-native';
import { Colors } from '@/constants/Colors';
import { getMonthName } from '@/hooks/useCalendarData';

interface CalendarHeaderProps {
  year: number;
  month: number;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  onAddPress: () => void;
}

export function CalendarHeader({
  year,
  month,
  onPreviousMonth,
  onNextMonth,
  onAddPress,
}: CalendarHeaderProps) {
  const { t } = useTranslation();
  return (
    <View style={styles.container}>
      <View style={styles.navigationContainer}>
        <TouchableOpacity
          style={styles.navButton}
          onPress={onPreviousMonth}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ChevronLeft size={24} color={Colors.text.primary} />
        </TouchableOpacity>
        
        <Text style={styles.monthTitle}>
          {t(`calendar.months.${month}`)} {year}
        </Text>
        
        <TouchableOpacity
          style={styles.navButton}
          onPress={onNextMonth}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ChevronRight size={24} color={Colors.text.primary} />
        </TouchableOpacity>
      </View>
      
      <TouchableOpacity style={styles.addButton} onPress={onAddPress}>
        <Plus size={24} color={Colors.neon.DEFAULT} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8, // Sisäinen väli kalenterin headerissa
  },
  navigationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  navButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.glass.DEFAULT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text.primary,
    minWidth: 160,
    textAlign: 'center',
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.glass.DEFAULT,
    borderWidth: 1,
    borderColor: Colors.neon.dim,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
