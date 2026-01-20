---
name: building-ui
description: Complete guide for building beautiful apps with Expo Router. Covers fundamentals, styling, components, navigation, animations, patterns, and native tabs.
version: 1.0.0
license: MIT
---

# Expo UI Guidelines

## References

Consult these resources as needed:

- Route file conventions, dynamic routes, query parameters, groups, and folder organization
- Native tab bar with NativeTabs, migration from JS tabs, iOS 26 features
- SF Symbols with expo-symbols, common icon names, animations, and weights
- Native iOS controls: Switch, Slider, SegmentedControl, DateTimePicker, Picker
- Blur effects with expo-blur and liquid glass with expo-glass-effect
- Reanimated animations: entering, exiting, layout, scroll-driven, and gestures
- Search bar integration with headers, useSearch hook, and filtering patterns

## Running the App

**CRITICAL: Always try Expo Go first before creating custom builds.**

Most Expo apps work in Expo Go without any custom native code. Before running `npx expo run:ios` or `npx expo run:android`:

1. **Start with Expo Go**: Run `npx expo start` and scan the QR code with Expo Go
2. **Check if features work**: Test your app thoroughly in Expo Go
3. **Only create custom builds when required**

### When Custom Builds Are Required

You need `npx expo run:ios/android` or `eas build` ONLY when using:

- **Local Expo modules** (custom native code in `modules/`)
- **Apple targets** (widgets, app clips, extensions via `@bacons/apple-targets`)
- **Third-party native modules** not included in Expo Go
- **Custom native configuration** that can't be expressed in `app.json`

### When Expo Go Works

Expo Go supports a huge range of features out of the box:

- All `expo-*` packages (camera, location, notifications, etc.)
- Expo Router navigation
- Most UI libraries (reanimated, gesture handler, etc.)
- Push notifications, deep links, and more

## Code Style

- Always use import statements at the top of the file.
- Always use kebab-case for file names, e.g. `comment-card.tsx`
- Always remove old route files when moving or restructuring navigation
- Never use special characters in file names
- Configure tsconfig.json with path aliases

## Routes

- Routes belong in the `app` directory.
- Never co-locate components, types, or utilities in the app directory.
- Ensure the app always has a route that matches "/".

## Library Preferences

- `expo-audio` not `expo-av`
- `expo-video` not `expo-av`
- `react-native-safe-area-context` not react-native SafeAreaView
- `expo-image` Image component instead of intrinsic element `img`

## Responsiveness

- Always wrap root component in a scroll view for responsiveness
- Use `<ScrollView contentInsetAdjustmentBehavior="automatic" />` instead of `<SafeAreaView>`
- Use flexbox instead of Dimensions API
- ALWAYS prefer `useWindowDimensions` over `Dimensions.get()`

## Behavior

- Use expo-haptics conditionally on iOS to make more delightful experiences
- Use views with built-in haptics like `<Switch />` from React Native
- Use the `<Text selectable />` prop on text containing data that could be copied

# Styling

Follow Apple Human Interface Guidelines.

## General Styling Rules

- Prefer flex gap over margin and padding styles
- Prefer padding over margin where possible
- Always account for safe area
- Add entering and exiting animations for state changes
- Use `{ borderCurve: 'continuous' }` for rounded corners
- ALWAYS use a navigation stack title instead of a custom text element
- CSS and Tailwind are not supported - use inline styles

## Text Styling

- Add the `selectable` prop to every `<Text/>` element displaying important data
- Counters should use `{ fontVariant: 'tabular-nums' }` for alignment

## Shadows

Use CSS `boxShadow` style prop. NEVER use legacy React Native shadow or elevation styles.

```tsx
<View style={{ boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)" }} />
```

# Navigation

## Link

Use `<Link href="/path" />` from 'expo-router' for navigation between routes.

```tsx
import { Link } from 'expo-router';

// Basic link
<Link href="/path" />

// Wrapping custom components
<Link href="/path" asChild>
  <Pressable>...</Pressable>
</Link>
```

## Stack

- ALWAYS use `_layout.tsx` files to define stacks
- Use Stack from 'expo-router/stack' for native navigation stacks

### Page Title

Set the page title in Stack.Screen options:

```tsx
<Stack.Screen options={{ title: "Home" }} />
```

## Modal

Present a screen as a modal:

```tsx
<Stack.Screen name="modal" options={{ presentation: "modal" }} />
```

## Sheet

Present a screen as a dynamic form sheet:

```tsx
<Stack.Screen
  name="sheet"
  options={{
    presentation: "formSheet",
    sheetGrabberVisible: true,
    sheetAllowedDetents: [0.5, 1.0],
  }}
/>
```
