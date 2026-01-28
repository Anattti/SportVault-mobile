import { View, Text, StyleSheet, ScrollView, TextInput, Alert, ActivityIndicator } from "react-native";
import { useTranslation } from "react-i18next";
import { useRouter } from "expo-router";
import { Colors } from "@/constants/Colors";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { SettingsSection } from "@/components/settings";
import { User, Ruler, Weight, Dumbbell, Target } from "lucide-react-native";

export default function EditProfileScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [nickname, setNickname] = useState("");
  const [age, setAge] = useState("");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [experienceLevel, setExperienceLevel] = useState("");
  const [goals, setGoals] = useState("");

  const { data: profile, isLoading } = useQuery({
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

  useEffect(() => {
    if (profile) {
      setNickname(profile.nickname || "");
      setAge(profile.age?.toString() || "");
      setHeight(profile.height?.toString() || "");
      setWeight(profile.weight?.toString() || "");
      setExperienceLevel(profile.experience_level || "");
      setGoals(profile.goals || "");
    }
  }, [profile]);

  const updateProfileMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("No user");
      
      const updates = {
        id: user.id,
        nickname,
        age: age ? parseInt(age) : null,
        height: height ? parseFloat(height) : null,
        weight: weight ? parseFloat(weight) : null,
        experience_level: experienceLevel,
        goals,
        updated_at: new Date(),
      };

      const { error } = await supabase
        .from('user_profiles')
        .upsert(updates);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user_profile', user?.id] });
      Alert.alert(t('profile.success'), t('profile.update_success'));
      router.back();
    },
    onError: (error) => {
      Alert.alert(t('profile.error'), error.message);
    },
  });

  if (isLoading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={Colors.neon.DEFAULT} />
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      contentInsetAdjustmentBehavior="automatic"
    >
      <SettingsSection title={t('profile.edit')}>
        <View style={styles.inputRow}>
          <User size={20} color={Colors.text.secondary} style={styles.icon} />
          <View style={styles.inputContainer}>
            <Text style={styles.label}>{t('profile.nickname')}</Text>
            <TextInput
              style={styles.input}
              value={nickname}
              onChangeText={setNickname}
              placeholder={t('profile.nickname')}
              placeholderTextColor={Colors.text.muted}
            />
          </View>
        </View>

        <View style={styles.separator} />

        <View style={styles.inputRow}>
          <Ruler size={20} color={Colors.text.secondary} style={styles.icon} />
          <View style={styles.inputContainer}>
            <Text style={styles.label}>{t('profile.height')}</Text>
            <TextInput
              style={styles.input}
              value={height}
              onChangeText={setHeight}
              keyboardType="numeric"
              placeholder="cm"
              placeholderTextColor={Colors.text.muted}
            />
          </View>
        </View>

        <View style={styles.separator} />

        <View style={styles.inputRow}>
          <Weight size={20} color={Colors.text.secondary} style={styles.icon} />
          <View style={styles.inputContainer}>
            <Text style={styles.label}>{t('profile.weight')}</Text>
            <TextInput
              style={styles.input}
              value={weight}
              onChangeText={setWeight}
              keyboardType="numeric"
              placeholder="kg"
              placeholderTextColor={Colors.text.muted}
            />
          </View>
        </View>
      </SettingsSection>

      <View style={{ height: 20 }} />

      <Button 
        onPress={() => updateProfileMutation.mutate()}
        disabled={updateProfileMutation.isPending}
        style={styles.saveButton}
      >
        <Text style={styles.saveButtonText}>
          {updateProfileMutation.isPending ? "Saving..." : t('common.save')}
        </Text>
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: 16,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#1C1C1E',
  },
  icon: {
    marginRight: 16,
  },
  inputContainer: {
    flex: 1,
  },
  label: {
    color: Colors.text.secondary,
    fontSize: 12,
    marginBottom: 4,
  },
  input: {
    color: Colors.text.primary,
    fontSize: 16,
    height: 24,
    padding: 0,
  },
  separator: {
    height: 1,
    backgroundColor: '#2C2C2E',
    marginLeft: 52, // Align with text start
  },
  saveButton: {
    backgroundColor: Colors.neon.DEFAULT,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
});
