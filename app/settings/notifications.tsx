import { StyleSheet, ScrollView, Switch, Alert } from "react-native";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Colors } from "@/constants/Colors";
import { SettingsSection, SettingsRow } from "@/components/settings";
import { Bell, MessageSquare, Calendar, Zap, Clock } from "lucide-react-native";
import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';

const SETTINGS_KEYS = {
  WORKOUT_REMINDERS: 'settings_notifications_workout_reminders',
  COMMUNITY_UPDATES: 'settings_notifications_community_updates',
  WEEKLY_SUMMARY: 'settings_notifications_weekly_summary',
};

export default function NotificationsScreen() {
  const { t } = useTranslation();
  
  const [workoutReminders, setWorkoutReminders] = useState(false);
  const [communityUpdates, setCommunityUpdates] = useState(false);
  const [weeklySummary, setWeeklySummary] = useState(false);
  const [permissions, setPermissions] = useState<Notifications.NotificationPermissionsStatus | null>(null);

  useEffect(() => {
    loadSettings();
    checkPermissions();
  }, []);

  const checkPermissions = async () => {
    const { status } = await Notifications.getPermissionsAsync();
    setPermissions(status as any);
  };

  const requestPermissions = async () => {
    const { status } = await Notifications.requestPermissionsAsync();
    setPermissions(status as any);
    return status === 'granted';
  };

  const loadSettings = async () => {
    try {
      const reminders = await SecureStore.getItemAsync(SETTINGS_KEYS.WORKOUT_REMINDERS);
      const community = await SecureStore.getItemAsync(SETTINGS_KEYS.COMMUNITY_UPDATES);
      const summary = await SecureStore.getItemAsync(SETTINGS_KEYS.WEEKLY_SUMMARY);
      
      setWorkoutReminders(reminders === 'true');
      setCommunityUpdates(community === 'true');
      setWeeklySummary(summary === 'true');
    } catch (error) {
      console.log('Error loading settings:', error);
    }
  };

  const toggleSetting = async (key: string, value: boolean, setter: (val: boolean) => void) => {
    try {
      if (value) {
        // For any notification setting, we should ensure permission is granted
        const granted = await requestPermissions();
        if (!granted) {
          Alert.alert(
            t('settings.notifications.permission_required'),
            t('settings.notifications.permission_denied_msg'),
            [{ text: 'OK' }]
          );
          return;
        }
      }
      setter(value);
      await SecureStore.setItemAsync(key, String(value));
    } catch (error) {
      console.log('Error saving setting:', error);
    }
  };

  const handleTestNotification = async (delaySeconds = 0) => {
    const granted = await requestPermissions();
    if (!granted) {
      Alert.alert(t('settings.notifications.error'), t('settings.notifications.no_permission'));
      return;
    }

    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: delaySeconds > 0 ? "Scheduled Test" : "Test Notification",
          body: delaySeconds > 0 
            ? `This is a test notification sent ${delaySeconds} seconds ago.` 
            : "This is an immediate test notification from SportVault.",
          sound: "default",
        },
        trigger: delaySeconds > 0 ? { 
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, 
          seconds: delaySeconds, 
          repeats: false 
        } : null,
      });

      if (delaySeconds > 0) {
        Alert.alert("Scheduled", `Notification will appear in ${delaySeconds} seconds.`);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to schedule notification");
      console.error(error);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <SettingsSection title={t('settings.push_notifications')}>
        <SettingsRow 
          icon={<Bell size={20} color={workoutReminders ? Colors.neon.DEFAULT : Colors.text.secondary} />}
          label={t('settings.workout_reminders')}
          onPress={() => toggleSetting(SETTINGS_KEYS.WORKOUT_REMINDERS, !workoutReminders, setWorkoutReminders)}
          showChevron={false}
          value={
            <Switch 
              value={workoutReminders} 
              onValueChange={(val) => toggleSetting(SETTINGS_KEYS.WORKOUT_REMINDERS, val, setWorkoutReminders)}
              trackColor={{ false: '#333', true: 'rgba(0, 255, 65, 0.3)' }}
              thumbColor={workoutReminders ? Colors.neon.DEFAULT : '#f4f3f4'}
            />
          }
        />
        <SettingsRow 
          icon={<MessageSquare size={20} color={communityUpdates ? Colors.neon.DEFAULT : Colors.text.secondary} />}
          label={t('settings.community_updates')}
          onPress={() => toggleSetting(SETTINGS_KEYS.COMMUNITY_UPDATES, !communityUpdates, setCommunityUpdates)}
          showChevron={false}
          value={
            <Switch 
              value={communityUpdates} 
              onValueChange={(val) => toggleSetting(SETTINGS_KEYS.COMMUNITY_UPDATES, val, setCommunityUpdates)}
              trackColor={{ false: '#333', true: 'rgba(0, 255, 65, 0.3)' }}
              thumbColor={communityUpdates ? Colors.neon.DEFAULT : '#f4f3f4'}
            />
          }
        />
        <SettingsRow 
          icon={<Calendar size={20} color={weeklySummary ? Colors.neon.DEFAULT : Colors.text.secondary} />}
          label={t('settings.weekly_summary')}
          onPress={() => toggleSetting(SETTINGS_KEYS.WEEKLY_SUMMARY, !weeklySummary, setWeeklySummary)}
          showChevron={false}
          isLast={true}
          value={
            <Switch 
              value={weeklySummary} 
              onValueChange={(val) => toggleSetting(SETTINGS_KEYS.WEEKLY_SUMMARY, val, setWeeklySummary)}
              trackColor={{ false: '#333', true: 'rgba(0, 255, 65, 0.3)' }}
              thumbColor={weeklySummary ? Colors.neon.DEFAULT : '#f4f3f4'}
            />
          }
        />
      </SettingsSection>

      <SettingsSection title={t('settings.test_area')}>
        <SettingsRow 
          icon={<Zap size={20} color={Colors.text.primary} />}
          label={t('settings.send_test')}
          onPress={() => handleTestNotification(0)}
          showChevron={true}
        />
        <SettingsRow 
          icon={<Clock size={20} color={Colors.text.primary} />}
          label={t('settings.schedule_test')}
          onPress={() => handleTestNotification(5)}
          showChevron={true}
          isLast={true}
        />
      </SettingsSection>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: 16,
  },
});
