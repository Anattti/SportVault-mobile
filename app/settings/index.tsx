import { View, Text, StyleSheet, ScrollView, Pressable, Alert } from "react-native";
import { useTranslation } from "react-i18next";
import { useRouter } from "expo-router";
import { Colors } from "@/constants/Colors";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
import { 
  User, 
  ChevronRight, 
  Bell, 
  Heart, 
  Lock, 
  Watch, 
  Cpu, 
  LogOut, 
  Zap,
} from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SettingsSection, SettingsRow } from "@/components/settings";

export default function SettingsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user, signOut } = useAuth();
  const insets = useSafeAreaInsets();

  const { data: profile } = useQuery({
    queryKey: ['user_profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const handleLogout = () => {
    Alert.alert(
      t('profile.logout'),
      t('profile.logout_confirm'),
      [
        { text: t('common.cancel'), style: "cancel" },
        { 
          text: t('profile.logout'), 
          style: "destructive",
          onPress: async () => {
            await signOut();
          }
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic"
      >
        
        {/* Profile Section - Native Style */}
        <View style={styles.sectionContainer}>
          <Pressable 
            style={({ pressed }) => [styles.profileRow, pressed && styles.pressed]}
            onPress={() => router.push("/settings/edit-profile")}
          >
            <View style={styles.avatarContainer}>
                <Text style={styles.avatarText}>
                    {profile?.nickname ? profile.nickname.substring(0, 2).toUpperCase() : "U"}
                </Text>
            </View>
            <View style={styles.profileInfo}>
                <Text style={styles.profileName}>{profile?.nickname || "User"}</Text>
                <Text style={styles.profileEmail}>{user?.email}</Text>
            </View>
            <ChevronRight size={20} color={Colors.text.secondary} style={{ opacity: 0.5 }} />
          </Pressable>
        </View>

        {/* Go Pro Card */}
        <Pressable style={styles.proCard}>
          <View style={[styles.proIconContainer, { shadowColor: Colors.neon.DEFAULT, shadowOpacity: 0.5, shadowRadius: 8 }]}>
            <Zap size={20} color="#000" fill="#000" />
          </View>
          <View style={styles.proContent}>
            <Text style={styles.proTitle}>{t('settings.pro_title', 'SportVault Pro')}</Text>
            <Text style={styles.proSubtitle}>{t('settings.pro_subtitle', 'Unlock elite analytics & routines')}</Text>
          </View>
          <ChevronRight size={16} color={Colors.text.secondary} style={{ opacity: 0.5 }} />
        </Pressable>

        <SettingsSection title={t('settings.preferences')}>
          <SettingsRow 
            icon={<Bell size={18} color="#fff" />}
            iconBackgroundColor="#FF3B30" // System Red
            label={t('settings.notifications')}
            onPress={() => router.push("/settings/notifications")}
          />
          <SettingsRow 
            icon={<Heart size={18} color="#fff" fill="#fff" />}
            iconBackgroundColor="#FF2D55" // System Pink
            label={t('settings.apple_health')}
            value={t('settings.connected')}
            onPress={() => router.push("/settings/apple-health")}
          />
          <SettingsRow 
            icon={<Lock size={18} color="#fff" />}
            iconBackgroundColor="#007AFF" // System Blue
            label={t('settings.privacy')}
            onPress={() => router.push("/settings/privacy")}
            isLast
          />
        </SettingsSection>

        <SettingsSection title={t('settings.connectivity')}>
          <SettingsRow 
            icon={<Watch size={18} color="#fff" />}
            iconBackgroundColor="#000000" // Watch typically black or gray
            label={t('settings.smart_watch')}
            onPress={() => router.push("/settings/smart-watch")}
          />
          <SettingsRow 
            icon={<Cpu size={18} color="#fff" />}
            iconBackgroundColor="#34C759" // System Green
            label={t('settings.heart_rate')}
            value={t('settings.paired')}
            onPress={() => router.push("/settings/heart-rate")}
            isLast
          />
        </SettingsSection>

        <SettingsSection>
           <SettingsRow 
            label={t('profile.logout')}
            onPress={handleLogout}
            destructive
            showChevron={false}
            isLast
          />
        </SettingsSection>
        
        <View style={{ height: 40 }} />

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: 16,
    paddingTop: 16,
  },
  sectionContainer: {
    backgroundColor: '#1C1C1E',
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 24,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    minHeight: 80,
  },
  pressed: {
    backgroundColor: '#2C2C2E',
  },
  avatarContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#2C2C2E',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#888',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    color: Colors.text.primary,
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 4,
  },
  profileEmail: {
    color: Colors.text.secondary,
    fontSize: 15,
  },
  proCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
    borderRadius: 10,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 65, 0.15)',
  },
  proIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 8, // Apple-ish rounded square
    backgroundColor: Colors.neon.DEFAULT,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  proContent: {
    flex: 1,
  },
  proTitle: {
    color: Colors.neon.DEFAULT,
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 2,
    letterSpacing: -0.3,
  },
  proSubtitle: {
    color: Colors.text.secondary,
    fontSize: 13,
  },
});
