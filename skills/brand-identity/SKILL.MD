---
name: Brand Identity
description: SportVault brand identity guide including colors, typography, and UI patterns.
---

# SportVault Brand Identity

This document defines the visual identity for SportVault, derived from the web application.

## 1. Core Colors

The color palette is high-contrast, featuring a deep black background with a signature neon green accent.

| Token              | Value            | Tailwind Class                    | Description                                                                    |
| :----------------- | :--------------- | :-------------------------------- | :----------------------------------------------------------------------------- |
| **Primary / Neon** | `#00FF41`        | `text-[#00FF41]` / `bg-[#00FF41]` | The main brand color. Used for active states, highlights, and primary actions. |
| **Background**     | `#000000`        | `bg-black`                        | Pure black background for maximum contrast (OLED friendly).                    |
| **Foreground**     | `#FFFFFF`        | `text-white`                      | Primary text color.                                                            |
| **Destructive**    | `hsl(0 84% 60%)` | `text-destructive`                | Error states and destructive actions.                                          |

## 2. UI Elements & Materials

### Glassmorphism

The interface relies heavily on glassmorphism to create depth on the black background.

- **Surface:** `bg-white/10` with `backdrop-blur-xl`
- **Border:** `border-white/10`
- **Hover:** `bg-white/20` (transition-colors)

```css
.glass {
  @apply bg-white/10 backdrop-blur-xl border-white/10;
}
.glass-hover {
  @apply hover:bg-white/20 transition-colors;
}
```

### Neon Glow

Key text elements or active items use a neon glow effect.

```css
.neon-text {
  @apply text-[#00FF41] drop-shadow-[0_0_8px_rgba(0,255,65,0.5)];
}
```

### Borders & Radius

- **Border Radius:** `1rem` (16px) is the standard rounded corner size (`rounded-2xl` equivalent but defined as `--radius`).
- **Borders:** Subtle borders using `border-white/10` or variations of white opacity.

## 3. Typography

**Font Family:** `Inter` (Sans-serif)

- Clean, modern, and highly legible.
- **Weights:** Standard weights (Regular 400, Medium 500, Bold 700).
- **Settings:** `font-feature-settings: 'calt' 1, 'kern' 1` for optimized rendering.

## 4. UI Patterns

### Cards

Cards typically use the glassmorphism style or a very dark semi-transparent black.

- **Default Card:** `rgb(0 0 0 / 0.3)` or `bg-white/10` depending on context.
- **Calendar/Date Selection:**
  - Selected Day: `#00FF41` (Black text)
  - Today: Border `#00FF41`

### Inputs

- **Base Style:** `bg-input` (dark), `text-foreground`, `border-input`.
- **Focus:** Standard focus rings, often using the primary neon color.

### Safe Areas

The design respects safe areas for mobile devices (notch, home indicator).

---

# React Native / Expo Implementation

## 1. Colors Constant (`src/constants/Colors.ts`)

Use the `Colors` object for consistent theming.

```typescript
import { Colors } from "@/constants/Colors";

// Usage
const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.background, // #000000
  },
  title: {
    color: Colors.text.primary, // #FFFFFF
  },
  accent: {
    color: Colors.neon.DEFAULT, // #00FF41
  },
});
```

## 2. Glassmorphism in React Native

Since React Native doesn't support `backdrop-filter` natively in the same way as CSS, we use `rgba` colors with opacity. For true blur, use `expo-blur`.

```typescript
import { View, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { Colors } from '@/constants/Colors';

const GlassCard = ({ children }) => (
  <View style={styles.glassContainer}>
    {/* Option 1: Simple transparency (better performance) */}
    <View style={styles.glassBackground} />

    {/* Option 2: Blur effect (requires expo-blur) */}
    {/* <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} /> */}

    {children}
  </View>
);

const styles = StyleSheet.create({
  glassContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.glass.border,
    position: 'relative',
  },
  glassBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.glass.DEFAULT,
  }
});
```

## 3. Neon Glow (Shadows)

React Native shadows (`shadowColor`, `shadowOffset`, etc.) work well on iOS. For Android, `elevation` is limited to black/grey shadows usually, but strictly speaking `shadowColor` support on Android was added in recent RN versions (checking compatibility is advised).

```typescript
const styles = StyleSheet.create({
  neonButton: {
    backgroundColor: Colors.neon.DEFAULT,
    // iOS Shadow
    shadowColor: Colors.neon.DEFAULT,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    // Android Elevation (fallback)
    elevation: 4,
  },
  neonText: {
    color: Colors.neon.DEFAULT,
    textShadowColor: "rgba(0, 255, 65, 0.5)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
});
```

## 4. Typography

Ensure you are using the correct font family names as loaded in `_layout.tsx`.

```typescript
const styles = StyleSheet.create({
  heading: {
    fontFamily: "Inter_700Bold", // Or whatever your font resource is named
    fontSize: 24,
    color: Colors.text.primary,
  },
  body: {
    fontFamily: "Inter_400Regular",
    fontSize: 16,
    color: Colors.text.secondary,
  },
});
```
