import { View, Text, StyleSheet, Pressable, Switch } from "react-native";
import { Colors } from "@/constants/Colors";
import { ChevronRight } from "lucide-react-native";

interface SettingsRowProps {
  icon?: React.ReactNode;
  iconBackgroundColor?: string;
  label: string;
  value?: string | React.ReactNode;
  onPress?: () => void;
  showChevron?: boolean;
  destructive?: boolean;
  style?: object;
  isLast?: boolean;
}

export function SettingsRow({ 
  icon, 
  iconBackgroundColor,
  label, 
  value, 
  onPress, 
  showChevron = true,
  destructive = false,
  style,
  isLast = false
}: SettingsRowProps) {
  return (
    <Pressable 
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        pressed && onPress && styles.pressed,
        style
      ]}
    >
      <View style={styles.leftContent}>
        {icon && (
          <View style={[
            styles.iconContainer, 
            iconBackgroundColor && { backgroundColor: iconBackgroundColor, borderRadius: 7 }
          ]}>
            {icon}
          </View>
        )}
        <View style={[
          styles.contentContainer,
          !isLast && styles.separator
        ]}>
            <Text style={[
              styles.label,
              destructive && styles.destructiveLabel
            ]}>
              {label}
            </Text>
            
            <View style={styles.rightContent}>
              {value && (
                typeof value === 'string' ? (
                  <Text style={styles.valueText}>{value}</Text>
                ) : (
                  value
                )
              )}
              {showChevron && (
                <ChevronRight size={20} color={Colors.text.secondary} style={{ opacity: 0.5, marginLeft: 8 }} />
              )}
            </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
    minHeight: 44, // Minimum touch target size
  },
  pressed: {
    backgroundColor: '#2C2C2E',
  },
  leftContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingLeft: 16,
  },
  iconContainer: {
    marginRight: 16,
    width: 29, 
    height: 29,
    alignItems: 'center',
    justifyContent: 'center',
    // Default style if no background color provided
  },
  contentContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 11, // Vertical padding for row content
    paddingRight: 16,
  },
  separator: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#38383A', // iOS dark mode separator color
  },
  label: {
    fontSize: 17, 
    color: Colors.text.primary,
  },
  destructiveLabel: {
    color: Colors.status.destructive,
  },
  rightContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  valueText: {
    fontSize: 17,
    color: Colors.text.secondary,
  },
});
