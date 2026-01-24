import { View, ViewProps, Text, StyleSheet, ViewStyle, TextStyle } from "react-native";
import { BlurView } from "expo-blur";
import { Colors } from "@/constants/Colors";

interface CardProps extends ViewProps {
  glass?: boolean;
  style?: ViewStyle;
}

export function Card({ style, glass = true, children, ...props }: CardProps) {
  const Container = glass ? BlurView : View;
  
  return (
    <Container
      intensity={glass ? 20 : 0}
      tint="dark"
      style={[
        styles.card,
        glass ? styles.glass : styles.solid,
        style
      ]}
      {...props}
    >
      {children}
    </Container>
  );
}

export function CardHeader({ style, ...props }: ViewProps) {
  return <View style={[styles.header, style]} {...props} />;
}

export function CardTitle({ style, ...props }: Text["props"]) {
  return (
    <Text
      style={[styles.title, style]}
      {...props}
    />
  );
}

export function CardContent({ style, ...props }: ViewProps) {
  return <View style={[styles.content, style]} {...props} />;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12, // rounded-xl
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)", // border-white/10
    overflow: "hidden",
  },
  glass: {
    // BlurView handles background automatically
  },
  solid: {
    backgroundColor: "hsla(240, 6%, 10%, 0.50)", // bg-zinc-900/50
  },
  header: {
    flexDirection: "column",
    gap: 6, // space-y-1.5
    padding: 24,
  },
  title: {
    fontSize: 24, // text-2xl
    fontWeight: "600",
    lineHeight: 24,
    color: "#FFFFFF",
  },
  content: {
    padding: 24,
    paddingTop: 0,
  },
});
