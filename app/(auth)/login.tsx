import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { Colors } from '@/constants/Colors';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Mail, Lock, ArrowRight, Zap, User } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';

export default function LoginScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; username?: string; password?: string; confirmPassword?: string }>({});

  const validate = () => {
    const newErrors: { email?: string; username?: string; password?: string; confirmPassword?: string } = {};
    if (!email) newErrors.email = t('auth.errors.email_required');
    else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = t('auth.errors.invalid_email');
    
    if (mode === 'register') {
      if (!username) newErrors.username = t('auth.errors.username_required');
      else if (username.length < 3) newErrors.username = t('auth.errors.username_min');
      else if (!/^[a-zA-Z0-9_]+$/.test(username)) newErrors.username = t('auth.errors.username_invalid');
      
      if (!confirmPassword) newErrors.confirmPassword = t('auth.errors.confirm_password_required');
      else if (password !== confirmPassword) newErrors.confirmPassword = t('auth.errors.passwords_dont_match');
    }
    
    if (!password) newErrors.password = t('auth.errors.password_required');
    else if (password.length < 6) newErrors.password = t('auth.errors.password_min');

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAuth = async () => {
    if (!validate()) return;

    setLoading(true);
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              username: username,
              nickname: username,
            }
          }
        });
        if (error) {
          throw error;
        } else {
          // Create user profile with username
          if (data.user) {
            const { error: profileError } = await supabase
              .from('user_profiles')
              .upsert({
                id: data.user.id,
                nickname: username,
              });
            if (profileError) {
              console.warn('Profile creation failed:', profileError.message);
            }
          }
          Alert.alert(t('auth.alerts.register_success'), t('auth.alerts.check_email'));
          setMode('login');
        }
      }
    } catch (error: any) {
      Alert.alert(t('profile.error'), error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <View style={styles.logoRow}>
            <Text style={styles.logoText}>SportVault</Text>
            <Zap color={Colors.neon.DEFAULT} size={32} fill={Colors.neon.DEFAULT} />
          </View>
          <Text style={styles.subtitle}>{t('auth.subtitle')}</Text>
        </View>

        <Card style={styles.card} glass={false}>
          <View style={styles.tabContainer}>
            <TouchableOpacity 
              style={[styles.tab, mode === 'login' && styles.activeTab]} 
              onPress={() => setMode('login')}
            >
              <Text style={[styles.tabText, mode === 'login' && styles.activeTabText]}>{t('auth.login')}</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.tab, mode === 'register' && styles.activeTab]} 
              onPress={() => setMode('register')}
            >
              <Text style={[styles.tabText, mode === 'register' && styles.activeTabText]}>{t('auth.register')}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('auth.email').toUpperCase()}</Text>
              <Input
                placeholder="nimi@sportvault.fi"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                leftIcon={<Mail color={Colors.text.secondary} size={20} />}
                error={errors.email}
              />
            </View>

            {mode === 'register' && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>{t('auth.username').toUpperCase()}</Text>
                <Input
                  placeholder={t('auth.username')}
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                  leftIcon={<User color={Colors.text.secondary} size={20} />}
                  error={errors.username}
                />
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('auth.password').toUpperCase()}</Text>
              <Input
                placeholder="••••••••"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                leftIcon={<Lock color={Colors.text.secondary} size={20} />}
                error={errors.password}
              />
            </View>

            {mode === 'register' && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>{t('auth.confirm_password').toUpperCase()}</Text>
                <Input
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                  leftIcon={<Lock color={Colors.text.secondary} size={20} />}
                  error={errors.confirmPassword}
                />
              </View>
            )}

            <Button 
              onPress={handleAuth} 
              loading={loading}
              style={styles.authButton}
            >
              <View style={styles.buttonContent}>
                <Text style={styles.buttonText}>
                  {mode === 'login' ? t('auth.login_button') : t('auth.register_button')}
                </Text>
                <ArrowRight color="#000" size={20} />
              </View>
            </Button>

            {mode === 'login' && (
              <TouchableOpacity style={styles.forgotPassword}>
                <Text style={styles.forgotPasswordText}>{t('auth.forgot_password')}</Text>
              </TouchableOpacity>
            )}
          </View>
        </Card>

        <View style={styles.footer}>
          <Text style={styles.copyright}>© SportVault 2026</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  logoText: {
    fontSize: 40,
    fontWeight: '900',
    color: Colors.neon.DEFAULT,
    letterSpacing: -1,
  },
  subtitle: {
    color: Colors.text.secondary,
    fontSize: 16,
    fontWeight: '500',
  },
  card: {
    backgroundColor: '#0A0A0A',
    borderRadius: 24,
    padding: 8,
    borderWidth: 1,
    borderColor: Colors.glass.border,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#161616',
    borderRadius: 16,
    padding: 4,
    marginBottom: 24,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 12,
  },
  activeTab: {
    backgroundColor: Colors.neon.DEFAULT,
  },
  tabText: {
    color: Colors.text.secondary,
    fontWeight: '600',
    fontSize: 16,
  },
  activeTabText: {
    color: '#000',
  },
  form: {
    padding: 16,
    gap: 20,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    color: Colors.text.secondary,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    marginLeft: 4,
  },
  authButton: {
    backgroundColor: Colors.neon.DEFAULT,
    borderRadius: 16,
    height: 56,
    marginTop: 12,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  buttonText: {
    color: '#000',
    fontSize: 18,
    fontWeight: '700',
  },
  forgotPassword: {
    alignItems: 'center',
    marginTop: 8,
  },
  forgotPasswordText: {
    color: Colors.text.secondary,
    fontSize: 14,
    fontWeight: '500',
  },
  footer: {
    marginTop: 40,
    alignItems: 'center',
  },
  copyright: {
    color: Colors.text.secondary,
    fontSize: 14,
    opacity: 0.5,
  },
});
