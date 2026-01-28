import { View, StyleSheet, ScrollView, Alert } from "react-native";
import { useTranslation } from "react-i18next";
import { Colors } from "@/constants/Colors";
import { SettingsSection, SettingsRow } from "@/components/settings";
import { Lock, Eye, Trash2 } from "lucide-react-native";

export default function PrivacyScreen() {
  const { t } = useTranslation();

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete Account",
      "Are you sure you want to delete your account? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => console.log("Account deleted") }
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <SettingsSection title="Visibility">
        <SettingsRow 
          icon={<Eye size={20} color={Colors.text.secondary} />}
          label="Profile Visibility"
          value="Public"
          onPress={() => {}}
        />
      </SettingsSection>

      <SettingsSection title="Data">
        <SettingsRow 
          icon={<Lock size={20} color={Colors.text.secondary} />}
          label="Export Data"
          onPress={() => {}}
        />
      </SettingsSection>

      <SettingsSection>
        <SettingsRow 
          icon={<Trash2 size={20} color={Colors.status.destructive} />}
          label="Delete Account"
          onPress={handleDeleteAccount}
          destructive
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
