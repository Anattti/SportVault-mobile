import { Text, Pressable, PressableProps, StyleSheet, ViewStyle, TextStyle, ActivityIndicator } from "react-native";
import { Colors } from "@/constants/Colors";

interface ButtonProps extends PressableProps {
  variant?: "primary" | "secondary" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  children: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
  loading?: boolean;
}

export function Button({
  variant = "primary",
  size = "default",
  children,
  style,
  textStyle,
  disabled,
  loading,
  ...props
}: ButtonProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        styles[size],
        (disabled || loading) && styles.disabled,
        pressed && styles.pressed,
        style,
      ]}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? '#000' : '#fff'} />
      ) : (
        <Text
          style={[
            styles.textBase,
            styles[`text${variant.charAt(0).toUpperCase() + variant.slice(1)}` as keyof typeof styles],
            styles[`text${size.charAt(0).toUpperCase() + size.slice(1)}` as keyof typeof styles],
            textStyle,
          ]}
        >
          {children}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
  },
  pressed: {
    opacity: 0.8,
  },
  disabled: {
    opacity: 0.5,
  },
  // Variants
  primary: {
    backgroundColor: Colors.neon.DEFAULT,
    shadowColor: Colors.neon.DEFAULT,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2, // shadow-neon/20
    shadowRadius: 8,
    elevation: 4,
  },
  secondary: {
    backgroundColor: "#27272a", // zinc-800
  },
  outline: {
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    backgroundColor: "transparent",
  },
  ghost: {
    backgroundColor: "transparent",
  },
  // Sizes
  default: {
    height: 48,
    paddingHorizontal: 24,
  },
  sm: {
    height: 36,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  lg: {
    height: 56,
    paddingHorizontal: 32,
    borderRadius: 16,
  },
  icon: {
    height: 40,
    width: 40,
    borderRadius: 20,
  },
  // Text Styles
  textBase: {
    fontWeight: "700",
  },
  textPrimary: {
    color: "#000000",
  },
  textSecondary: {
    color: "#FFFFFF",
  },
  textOutline: {
    color: "#FFFFFF",
  },
  textGhost: {
    color: "#FFFFFF",
  },
  textDefault: {
    fontSize: 16,
  },
  textSm: {
    fontSize: 14,
  },
  textLg: {
    fontSize: 18,
  },
  textIcon: {
    fontSize: 14,
  },
});
