import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Play } from 'lucide-react-native';
import { Colors } from '@/constants/Colors';
import { useActiveSession } from '@/context/ActiveSessionContext';

export function ActiveSessionBanner() {
  const { activeSession, getElapsedTime, resumeSession } = useActiveSession();
  const router = useRouter();
  const [elapsedTime, setElapsedTime] = React.useState(0);

  // Update elapsed time every second
  React.useEffect(() => {
    if (!activeSession) return;
    
    const interval = setInterval(() => {
      setElapsedTime(getElapsedTime());
    }, 1000);

    return () => clearInterval(interval);
  }, [activeSession, getElapsedTime]);

  if (!activeSession) return null;

  const formatTime = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <Pressable style={styles.container} onPress={resumeSession}>
      <View style={styles.pulsingDot} />
      <View style={styles.content}>
        <Text style={styles.title}>Treeni käynnissä</Text>
        <Text style={styles.subtitle}>
          {activeSession.workoutName} • {formatTime(elapsedTime)}
        </Text>
      </View>
      <View style={styles.resumeButton}>
        <Play size={16} color="#000" fill="#000" />
        <Text style={styles.resumeText}>Jatka</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.neon.faint,
    borderWidth: 1,
    borderColor: Colors.neon.border,
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 12,
  },
  pulsingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.neon.DEFAULT,
    shadowColor: Colors.neon.DEFAULT,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
  },
  content: {
    flex: 1,
  },
  title: {
    color: Colors.neon.DEFAULT,
    fontSize: 14,
    fontWeight: '700',
  },
  subtitle: {
    color: Colors.text.secondary,
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  resumeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.neon.DEFAULT,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    gap: 6,
  },
  resumeText: {
    color: '#000',
    fontSize: 13,
    fontWeight: '700',
  },
});
