import { TextInput, TextInputProps, View, Text, StyleSheet } from "react-native";
import { useState } from "react";
import { Colors } from "@/constants/Colors";

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
}

export function Input({ style, label, error, leftIcon, ...props }: InputProps) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={[
        styles.inputWrapper,
        isFocused && styles.inputFocused,
        error ? styles.inputError : null,
      ]}>
        {leftIcon && <View style={styles.leftIcon}>{leftIcon}</View>}
        <TextInput
          placeholderTextColor="#71717a" // zinc-500
          style={[
            styles.input,
            style
          ]}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          {...props}
        />
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    gap: 8, // space-y-2 (approx)
  },
  label: {
    fontSize: 14, // text-sm
    fontWeight: "500",
    color: "#a1a1aa", // zinc-400
    marginLeft: 4,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    height: 56,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    backgroundColor: "#000000",
  },
  leftIcon: {
    paddingLeft: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  input: {
    flex: 1,
    height: "100%",
    paddingHorizontal: 16,
    color: "#FFFFFF",
    fontSize: 16,
  },
  inputFocused: {
    borderColor: Colors.neon.DEFAULT,
  },
  inputError: {
    borderColor: "#ef4444",
  },
  errorText: {
    fontSize: 12, // text-xs
    color: "#ef4444", // red-500
    marginLeft: 4,
  },
});
