import { View, Text, StyleSheet } from "react-native";
import { Colors } from "@/constants/Colors";

interface SettingsSectionProps {
  title?: string;
  children: React.ReactNode;
}

export function SettingsSection({ title, children }: SettingsSectionProps) {
  return (
    <View style={styles.container}>
      {title && <Text style={styles.title}>{title.toUpperCase()}</Text>}
      <View style={styles.section}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 32,
  },
  title: {
    fontSize: 13,
    color: Colors.text.secondary,
    marginBottom: 8,
    paddingHorizontal: 16,
    fontWeight: '500', // Slightly bolder for readability
    letterSpacing: 0.5, // Uppercase generally looks better with spacing
  },
  section: {
    backgroundColor: '#1C1C1E', // iOS Dark Mode Grouped Background
    borderRadius: 12,
    overflow: 'hidden',
  },
});
