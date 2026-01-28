import { View, StyleSheet, ScrollView, Text } from "react-native";
import { useTranslation } from "react-i18next";
import { Colors } from "@/constants/Colors";
import { SettingsSection, SettingsRow } from "@/components/settings";
import { Heart, Activity } from "lucide-react-native";

export default function AppleHealthScreen() {
  const { t } = useTranslation();

  return (
    <ScrollView style={styles.container}>
      <View style={styles.infoContainer}>
        <Heart size={48} color={Colors.status.destructive} />
        <Text style={styles.infoTitle}>Apple Health</Text>
        <Text style={styles.infoText}>
          Sync your workouts and health data with Apple Health to get a comprehensive view of your fitness journey.
        </Text>
      </View>

      <SettingsSection title="Permissions">
        <SettingsRow 
          icon={<Activity size={20} color={Colors.text.secondary} />}
          label="Sync Workouts"
          value="Enabled"
          onPress={() => {}}
          showChevron={false}
        />
        <SettingsRow 
          icon={<Heart size={20} color={Colors.text.secondary} />}
          label="Sync Heart Rate"
          value="Enabled"
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
  infoContainer: {
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 16,
  },
  infoTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text.primary,
    marginTop: 16,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 16,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
  },
});
