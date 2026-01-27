/**
 * Offline Indicator Component
 * Shows banner when device is offline with pending sync items
 */

import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, StyleSheet, Animated, Pressable } from 'react-native';
import { WifiOff, CloudOff, RefreshCw } from 'lucide-react-native';
import { Colors } from '@/constants/Colors';
import { useNetworkStatus, getQueueSize, processQueue } from '@/lib/offlineSync';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface OfflineIndicatorProps {
  showPendingCount?: boolean;
}

export function OfflineIndicator({ showPendingCount = true }: OfflineIndicatorProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { isConnected, isInternetReachable } = useNetworkStatus();
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const slideAnim = useState(() => new Animated.Value(-100))[0];

  const isOffline = !isConnected || isInternetReachable === false;

  useEffect(() => {
    // Check pending count periodically
    const checkPending = async () => {
      const count = await getQueueSize();
      setPendingCount(count);
    };

    checkPending();
    const interval = setInterval(checkPending, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Animate slide in/out
    Animated.spring(slideAnim, {
      toValue: isOffline || pendingCount > 0 ? 0 : -100,
      useNativeDriver: true,
      tension: 100,
      friction: 10,
    }).start();
  }, [isOffline, pendingCount, slideAnim]);

  const handleSync = async () => {
    if (isOffline || isSyncing) return;
    
    setIsSyncing(true);
    try {
      await processQueue();
      const count = await getQueueSize();
      setPendingCount(count);
    } finally {
      setIsSyncing(false);
    }
  };

  // Don't render if online and no pending items
  if (!isOffline && pendingCount === 0) {
    return null;
  }

  return (
    <Animated.View 
      style={[
        styles.container,
        { top: insets.top + 6 }, // Position in header
        { transform: [{ translateY: slideAnim }] },
        isOffline ? styles.offlineContainer : styles.pendingContainer,
      ]}
    >
      <View style={styles.content}>
        {isOffline ? (
          <>
            <WifiOff size={16} color="#FFFFFF" />
            <Text style={styles.text}>
              {t('offline.no_connection')}
            </Text>
          </>
        ) : (
          <>
            <CloudOff size={16} color="#FFFFFF" />
            <Text style={styles.text}>
              {t('offline.pending_sync', { count: pendingCount })}
            </Text>
          </>
        )}
      </View>

      {showPendingCount && pendingCount > 0 && !isOffline && (
        <Pressable 
          style={[styles.syncButton, isSyncing && styles.syncButtonDisabled]}
          onPress={handleSync}
          disabled={isSyncing}
        >
          <RefreshCw 
            size={14} 
            color="#FFFFFF" 
            style={isSyncing ? styles.spinning : undefined}
          />
          <Text style={styles.syncButtonText}>
            {isSyncing ? t('offline.syncing') : t('offline.sync_button')}
          </Text>
        </Pressable>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 16, // Float right
    zIndex: 1000,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20, // Capsule shape
    paddingHorizontal: 12,
    paddingVertical: 6,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  offlineContainer: {
    backgroundColor: '#EF4444', 
  },
  pendingContainer: {
    backgroundColor: '#F59E0B', 
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  text: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  syncButtonDisabled: {
    opacity: 0.6,
  },
  syncButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  spinning: {
    // Note: actual spinning animation would need Reanimated
  },
});
