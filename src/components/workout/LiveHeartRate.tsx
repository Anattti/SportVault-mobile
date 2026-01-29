import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useHeartRate } from '@/context/HeartRateContext';
import { Colors } from '@/constants/Colors';
import { Heart, Watch, Bluetooth, AlertCircle } from 'lucide-react-native';

export const LiveHeartRate = () => {
  const { currentBpm, status, activeSourceType, lastSample } = useHeartRate();

  const getIcon = () => {
    if (activeSourceType === 'apple_health') return <Watch size={16} color={Colors.neon.DEFAULT} />;
    if (activeSourceType === 'ble') return <Bluetooth size={16} color={Colors.neon.DEFAULT} />;
    return <Heart size={16} color={Colors.text.secondary} />;
  };

  const getSignalStrength = () => {
      // RSSI visualization
      if (activeSourceType !== 'ble' || !lastSample?.rssi) return null;
      
      const rssi = lastSample.rssi;
      
      // Typical BLE RSSI ranges:
      // > -60: Excellent (4 bars)
      // > -70: Good (3 bars)
      // > -80: Fair (2 bars)
      // < -80: Poor (1 bar)
      
      const bars = [1, 2, 3, 4];
      let strength = 0;
      if (rssi > -60) strength = 4;
      else if (rssi > -70) strength = 3;
      else if (rssi > -80) strength = 2;
      else strength = 1;

      return (
          <View style={styles.signalContainer}>
              {bars.map(bar => (
                  <View 
                      key={bar} 
                      style={[
                          styles.signalBar, 
                          { 
                              height: 6 + (bar * 2), 
                              backgroundColor: bar <= strength ? Colors.neon.DEFAULT : Colors.text.muted 
                          }
                      ]} 
                  />
              ))}
          </View>
      );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
            <View style={styles.iconContainer}>
                {getIcon()}
            </View>
            <Text style={styles.label}>Heart Rate</Text>
        </View>
        {getSignalStrength()}
      </View>
      
      <View style={styles.valueContainer}>
        {status === 'connecting' || status === 'scanning' ? (
             <ActivityIndicator size="small" color={Colors.text.secondary} />
        ) : (
            <Text style={[styles.value, { color: status === 'connected' ? Colors.text.primary : Colors.text.muted }]}>
            {currentBpm ?? '--'}
            </Text>
        )}
        <Text style={styles.unit}>BPM</Text>
      </View>

      {status === 'error' && (
          <View style={styles.errorContainer}>
              <AlertCircle size={12} color={Colors.status.destructive} />
              <Text style={styles.errorText}>Connection Error</Text>
          </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.glass.DEFAULT,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.glass.border,
    minWidth: 100,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
  },
  iconContainer: {
      opacity: 0.8,
  },
  label: {
    color: Colors.text.secondary,
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  signalContainer: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 2,
      height: 14,
  },
  signalBar: {
      width: 3,
      borderRadius: 1,
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  value: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text.primary,
    fontVariant: ['tabular-nums'],
  },
  unit: {
    fontSize: 12,
    color: Colors.text.secondary,
    fontWeight: '600',
  },
  errorContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 4,
      gap: 4,
  },
  errorText: {
      color: Colors.status.destructive,
      fontSize: 10,
  },
});
