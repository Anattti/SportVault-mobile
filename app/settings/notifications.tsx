import { View, StyleSheet, ScrollView } from "react-native";
import { useTranslation } from "react-i18next";
import { Colors } from "@/constants/Colors";
import { SettingsSection, SettingsRow } from "@/components/settings";
import { Bell, MessageSquare, Calendar } from "lucide-react-native";

export default function NotificationsScreen() {
  const { t } = useTranslation();

  return (
    <ScrollView style={styles.container}>
      <SettingsSection title="Push Notifications">
        <SettingsRow 
          icon={<Bell size={20} color={Colors.text.secondary} />}
          label="Workout Reminders"
          onPress={() => {}}
          showChevron={false}
          value={<View style={{ width: 50, height: 30, backgroundColor: Colors.neon.DEFAULT, borderRadius: 15 }} />} // Placeholder for Switch
        />
        <SettingsRow 
          icon={<MessageSquare size={20} color={Colors.text.secondary} />}
          label="Community Updates"
          onPress={() => {}}
          showChevron={false}
        />
        <SettingsRow 
          icon={<Calendar size={20} color={Colors.text.secondary} />}
          label="Weekly Summary"
          onPress={() => {}}
          showChevron={false}
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
