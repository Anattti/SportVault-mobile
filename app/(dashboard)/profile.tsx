import { View, Text, StyleSheet, TextInput, ScrollView, Pressable, ActivityIndicator, Alert } from "react-native";
import { useTranslation } from "react-i18next";
import { useState, useEffect } from "react";
import { useRouter } from "expo-router";
import { Colors } from "@/constants/Colors";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Save, User, Ruler, Weight, Target, Award, Calendar, LogOut } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "@/components/ui/Button";

type ProfileData = {
  nickname: string;
  age: string;
  height: string;
  weight: string;
  experience_level: string;
  fitness_goals: string;
};

export default function ProfileScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user, signOut } = useAuth();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<ProfileData>({
    nickname: "",
    age: "",
    height: "",
    weight: "",
    experience_level: "beginner",
    fitness_goals: "",
  });

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
      setFormData({
        nickname: profile.nickname || "",
        age: profile.age?.toString() || "",
        height: profile.height?.toString() || "",
        weight: profile.weight?.toString() || "",
        experience_level: profile.experience_level || "beginner",
        fitness_goals: profile.fitness_goals || "",
      });
    }
  }, [profile]);

  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileData) => {
      if (!user?.id) throw new Error("No user");
      
      const { error } = await supabase
        .from('user_profiles')
        .update({
          nickname: data.nickname,
          age: data.age ? parseInt(data.age) : null,
          height: data.height ? parseFloat(data.height) : null,
          weight: data.weight ? parseFloat(data.weight) : null,
          experience_level: data.experience_level,
          fitness_goals: data.fitness_goals,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user_profile'] });
      setIsEditing(false);
      Alert.alert(t('profile.success'), t('profile.update_success'));
    },
    onError: (error) => {
      Alert.alert(t('profile.error'), `${t('profile.update_error')}: ${error.message}`);
    },
  });

  const handleSave = () => {
    updateProfileMutation.mutate(formData);
  };

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

  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={Colors.neon.DEFAULT} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft color={Colors.text.primary} size={24} />
        </Pressable>
        <Text style={styles.title}>{t('profile.title')}</Text>
        <Pressable 
          onPress={() => isEditing ? handleSave() : setIsEditing(true)} 
          style={styles.actionButton}
          disabled={updateProfileMutation.isPending}
        >
          {updateProfileMutation.isPending ? (
            <ActivityIndicator size="small" color={Colors.neon.DEFAULT} />
          ) : isEditing ? (
            <Text style={styles.saveText}>{t('common.save')}</Text>
          ) : (
             <Text style={styles.editText}>{t('common.edit')}</Text>
          )}
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.avatarSection}>
          <View style={styles.avatarPlaceholder}>
             <User size={48} color={Colors.text.secondary} />
          </View>
          <Text style={styles.emailText}>{user?.email}</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('profile.nickname')}</Text>
            <View style={styles.inputContainer}>
              <User size={20} color={Colors.text.secondary} />
              <TextInput
                style={[styles.input, !isEditing && styles.disabledInput]}
                value={formData.nickname}
                onChangeText={(text) => setFormData({...formData, nickname: text})}
                placeholder={t('profile.not_set')}
                placeholderTextColor={Colors.text.secondary}
                editable={isEditing}
              />
            </View>
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>{t('profile.age')}</Text>
              <View style={styles.inputContainer}>
                <Calendar size={20} color={Colors.text.secondary} />
                <TextInput
                  style={[styles.input, !isEditing && styles.disabledInput]}
                  value={formData.age}
                  onChangeText={(text) => setFormData({...formData, age: text})}
                  placeholder="-"
                  placeholderTextColor={Colors.text.secondary}
                  keyboardType="numeric"
                  editable={isEditing}
                />
              </View>
            </View>
            <View style={{ width: 16 }} />
             <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>{t('profile.experience_level')}</Text>
              <View style={styles.inputContainer}>
                <Award size={20} color={Colors.text.secondary} />
                <TextInput
                  style={[styles.input, !isEditing && styles.disabledInput]}
                  value={formData.experience_level}
                  onChangeText={(text) => setFormData({...formData, experience_level: text})}
                  placeholder="-"
                  placeholderTextColor={Colors.text.secondary}
                  editable={isEditing}
                />
              </View>
            </View>
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>{t('profile.height')}</Text>
              <View style={styles.inputContainer}>
                <Ruler size={20} color={Colors.text.secondary} />
                <TextInput
                  style={[styles.input, !isEditing && styles.disabledInput]}
                  value={formData.height}
                  onChangeText={(text) => setFormData({...formData, height: text})}
                  placeholder="-"
                  placeholderTextColor={Colors.text.secondary}
                  keyboardType="numeric"
                  editable={isEditing}
                />
              </View>
            </View>

            <View style={{ width: 16 }} />

            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>{t('profile.weight')}</Text>
              <View style={styles.inputContainer}>
                 <Weight size={20} color={Colors.text.secondary} />
                <TextInput
                  style={[styles.input, !isEditing && styles.disabledInput]}
                  value={formData.weight}
                  onChangeText={(text) => setFormData({...formData, weight: text})}
                  placeholder="-"
                  placeholderTextColor={Colors.text.secondary}
                  keyboardType="numeric"
                  editable={isEditing}
                />
              </View>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('profile.goals')}</Text>
            <View style={[styles.inputContainer, styles.textAreaContainer]}>
               <Target size={20} color={Colors.text.secondary} style={{ marginTop: 12 }} />
              <TextInput
                style={[styles.input, styles.textArea, !isEditing && styles.disabledInput]}
                value={formData.fitness_goals}
                onChangeText={(text) => setFormData({...formData, fitness_goals: text})}
                placeholder={t('profile.goals_placeholder')}
                placeholderTextColor={Colors.text.secondary}
                multiline
                numberOfLines={4}
                editable={isEditing}
              />
            </View>
          </View>
          
          {isEditing && (
            <Button 
                style={styles.saveButton} 
                onPress={handleSave}
                disabled={updateProfileMutation.isPending}
            >
                <Text style={styles.saveButtonText}>
                    {updateProfileMutation.isPending ? t('profile.saving') : t('profile.save_changes')}
                </Text>
            </Button>
          )}

          <Pressable style={styles.logoutButton} onPress={handleLogout}>
            <LogOut size={20} color={Colors.status.destructive} />
            <Text style={styles.logoutText}>{t('profile.logout')}</Text>
          </Pressable>

          <Pressable 
              style={[styles.logoutButton, { borderTopWidth: 0, marginTop: 0 }]} 
              onPress={() => router.push('/(dashboard)/settings/heart-rate')}
          >
             <Text style={[styles.logoutText, { color: Colors.neon.DEFAULT }]}>Heart Rate Devices</Text>
          </Pressable>

        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.glass.border,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  actionButton: {
    padding: 8,
    marginRight: -8,
  },
  editText: {
    color: Colors.neon.DEFAULT,
    fontWeight: '600',
    fontSize: 16,
  },
  saveText: {
    color: Colors.neon.DEFAULT,
    fontWeight: '600',
    fontSize: 16,
  },
  content: {
    padding: 20,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.glass.DEFAULT,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.glass.border,
    marginBottom: 12,
  },
  emailText: {
    color: Colors.text.secondary,
    fontSize: 14,
  },
  form: {
    gap: 20,
  },
  row: {
    flexDirection: 'row',
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    color: Colors.text.secondary,
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.glass.DEFAULT,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.glass.border,
    paddingHorizontal: 16,
    height: 50,
  },
  input: {
    flex: 1,
    color: Colors.text.primary,
    fontSize: 16,
    marginLeft: 12,
  },
  disabledInput: {
    opacity: 0.7,
  },
  textAreaContainer: {
    height: 120,
    alignItems: 'flex-start',
  },
  textArea: {
    height: '100%',
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  saveButton: {
    marginTop: 12,
    backgroundColor: Colors.neon.DEFAULT,
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButtonText: {
    color: "#000",
    fontWeight: "600",
    fontSize: 16,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 32,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.glass.border,
  },
  logoutText: {
    color: Colors.status.destructive,
    fontWeight: '600',
    fontSize: 16,
  },
});
