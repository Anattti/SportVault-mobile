---
name: Technical Implementation
description: Technical stack, patterns, and coding conventions for SportVault Mobile.
---

# Technical Implementation

This document outlines the technical architecture, dependencies, and coding standards for SportVault Mobile.

## 1. Tech Stack

- **Framework:** React Native (Expo SDK 54)
- **Language:** TypeScript
- **Navigation:** Expo Router
- **Backend:** Supabase (Auth & Database)
- **State Management:**
  - Server State: TanStack Query (React Query)
  - Auth State: React Context (`AuthContext`)
- **Styling:** `StyleSheet` with design tokens from `src/constants/Colors.ts`
- **Icons:** `lucide-react-native`

## 2. Project Structure

```
/app                 # Expo Router pages (Screens)
  /(dashboard)       # Protected routes (Tabs, etc.)
  /(auth)            # Public auth routes (Login)
  _layout.tsx        # Root layout & Providers
/src
  /components
    /ui              # Reusable basic components (Button, Card)
  /constants         # Global configuration (Colors.ts)
  /context           # React Context (AuthContext)
  /lib               # Utilities & Singletons (supabase.ts)
  /types             # TypeScript definitions
/skills              # Project documentation & skills (Brand, Tech)
```

## 3. Data Fetching Pattern

We use **TanStack Query** for all data fetching needs to handle caching, loading states, and side effects.

### Example: Fetching Workouts

```typescript
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Database } from "@/types/supabase";

type Workout = Database["public"]["Tables"]["workouts"]["Row"];

export function useWorkouts() {
  const { user } = useAuth(); // Always scope by user if needed

  return useQuery({
    queryKey: ["workouts", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("workouts")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Workout[];
    },
    enabled: !!user?.id, // Only run if user is defined
  });
}
```

## 4. UI Component Pattern

- **Styling:** Use `StyleSheet.create`. Avoid inline styles for complex objects.
- **Theming:** Import colors from `@/constants/Colors`.
- **Glassmorphism:** Use `expo-blur` for glass effects, or semi-transparent backgrounds for performance-critical lists.

### Example Card Component

```typescript
import { View, StyleSheet } from "react-native";
import { Colors } from "@/constants/Colors";

export function CustomCard({ children }) {
  return (
    <View style={styles.card}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card.DEFAULT,
    borderColor: Colors.border.default,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
  }
});
```

## 5. Authentication

Auth is managed via `AuthContext`. Do not call `supabase.auth.getSession()` manually in components; use the hook.

```typescript
import { useAuth } from "@/context/AuthContext";

// Inside a component
const { user, signOut } = useAuth();
```

## 6. Icons

Use `lucide-react-native` for all icons to maintain consistency.

```typescript
import { Activity } from "lucide-react-native";
import { Colors } from "@/constants/Colors";

<Activity size={24} color={Colors.text.primary} />
```

## 7. Best Practices

### Performance

- **Lists:** Always use `FlatList` or `FlashList` for long lists. Avoid `ScrollView` with `map` for data sets larger than 20 items.
- **Memoization:** Use `useMemo` for expensive calculations (like derived data from Supabase) and `useCallback` for functions passed as props to optimized children.
- **Images:** Use `expo-image` for caching and performance over standard `Image`.

### Architecture

- **Separation of Concerns:**
  - `app/`: Routing and Layout configuration only.
  - `src/components/`: Reusable UI logic.
  - `src/features/`: Complex domain-specific logic (allocating specific components to features if the app scales).
- **Hooks:** Extract logic into custom hooks (`useWorkouts`, `useProfile`) rather than cluttering components.

### Error Handling

- **Supabase Errors:** Always check `if (error) throw error;` in fetchers to let React Query handle the error state.
- **Boundaries:** Use Error Boundaries (automatically handled by Expo Router for routes) for graceful degradation.

### Type Safety

- **Database Types:** Always use generated types from `@/types/supabase`.
- **Strict Mode:** No `any`. Define proper interfaces for all component props.

## 8. Caching Strategy

### Data Caching (TanStack Query)

- **Stale Time:** default `staleTime` should be set (e.g., 60s) to prevent over-fetching on screen focus.
- **Prefetching:** Prefetch critical data (like user profile) during the splash screen or auth flow.
- **Optimistic Updates:** Implement optimistic updates for improved UX (e.g., toggling a "like" or "complete" status).

### Media Caching

- **Images:** Use `expo-image` which handles memory and disk caching automatically.
- **Assets:** Pre-load critical assets (fonts, icons) in `_layout.tsx` using `useFonts` or `SplashScreen`.

## 9. Security & Data Privacy

### Authentication

- **Storage:** Use `expo-secure-store` (AES encrypted) instead of `AsyncStorage` for persisting Supabase sessions/tokens in production.
- **Session Handling:** Ensure proper token refresh logic (handled by Supabase client) and handle "401 Unauthorized" gracefully.

### Database (RLS)

- **Row Level Security:** NEVER disable RLS on Supabase.
- **Policies:** Write explicit policies for `SELECT`, `INSERT`, `UPDATE`, `DELETE` (e.g., `auth.uid() = user_id`).

### Application Security

- **Environment Variables:** Store keys in `.env` and expose only public keys via `process.env.EXPO_PUBLIC_`.
- **Deep Links:** Validate incoming deep link parameters to prevent navigation hijacking.
