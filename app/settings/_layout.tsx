
import { Stack, useRouter } from "expo-router";
import { Colors } from "@/constants/Colors";
import { useTranslation } from "react-i18next";

export default function SettingsLayout() {
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: Colors.background,
        },
        headerShadowVisible: false,
        headerTintColor: Colors.neon.DEFAULT,
        headerTitleStyle: {
          fontWeight: '600',
          color: Colors.text.primary,
        },
        contentStyle: { backgroundColor: Colors.background },
        animation: 'default',
      }}
    >
      <Stack.Screen 
        name="index" 
        options={{ 
          title: t('settings.preferences'),
          headerLargeTitle: true,
        }} 
      />
      <Stack.Screen 
        name="edit-profile" 
        options={{ title: `${t('common.edit')} ${t('profile.title')}` }} 
      />
      <Stack.Screen 
        name="notifications" 
        options={{ title: t('settings.notifications') }} 
      />
      <Stack.Screen 
        name="privacy" 
        options={{ title: t('settings.privacy') }} 
      />
      <Stack.Screen 
        name="apple-health" 
        options={{ title: t('settings.apple_health') }} 
      />
      <Stack.Screen 
        name="smart-watch" 
        options={{ title: t('settings.smart_watch') }} 
      />
      <Stack.Screen 
        name="heart-rate" 
        options={{ title: t('settings.heart_rate') }} 
      />
    </Stack>
  );
}
