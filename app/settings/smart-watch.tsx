import { View, StyleSheet, ScrollView, Text } from "react-native";
import { useTranslation } from "react-i18next";
import { Colors } from "@/constants/Colors";
import { SettingsSection, SettingsRow } from "@/components/settings";
import { Watch } from "lucide-react-native";

export default function SmartWatchScreen() {
  const { t } = useTranslation();

  return (
    <ScrollView style={styles.container}>
      <View style={styles.infoContainer}>
        <Watch size={48} color={Colors.text.primary} />
        <Text style={styles.infoTitle}>Smart Watch</Text>
        <Text style={styles.infoText}>
          Pair your Apple Watch or other compatible devices to track workouts directly from your wrist.
        </Text>
      </View>

      <SettingsSection title="Devices">
        <SettingsRow 
          icon={<Watch size={20} color={Colors.text.secondary} />}
          label="Apple Watch Series 7"
          value="Connected"
          onPress={() => {}}
        />
        <SettingsRow 
          icon={<Watch size={20} color={Colors.text.secondary} />}
          label="Pair New Device"
          onPress={() => {}}
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
