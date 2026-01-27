import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator, Image } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft, Check, Watch, Bluetooth, RefreshCw, X } from "lucide-react-native";
import { useHeartRate } from "@/context/HeartRateContext";
import { Colors } from "@/constants/Colors";
import { Device } from 'react-native-ble-plx';

export default function HeartRateSettings() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { 
      connectSource, 
      disconnect, 
      activeSourceType, 
      status, 
      startBleScan, 
      stopBleScan,
      deviceName
  } = useHeartRate();

  const [bleDevices, setBleDevices] = useState<Device[]>([]);
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    return () => {
      stopBleScan();
    };
  }, []);

  const handleAppleWatchConnect = async () => {
      if (activeSourceType === 'apple_health') {
          await disconnect();
      } else {
          await connectSource('apple_health');
      }
  };

  const toggleScan = () => {
      if (isScanning) {
          stopBleScan();
          setIsScanning(false);
      } else {
          setIsScanning(true);
          setBleDevices([]); // Clear previous
          startBleScan((device) => {
               setBleDevices(prev => {
                   if (prev.find(d => d.id === device.id)) return prev;
                   return [...prev, device];
               });
          });
      }
  };

  const connectToBleDevice = async (device: Device) => {
      stopBleScan();
      setIsScanning(false);
      await connectSource('ble', device.id);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft color={Colors.text.primary} size={24} />
        </Pressable>
        <Text style={styles.title}>Heart Rate Devices</Text>
        <View style={{ width: 40 }} /> 
      </View>

      <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.sectionTitle}>Data Sources</Text>
          
          {/* Apple Watch Item */}
          <Pressable 
            style={[
                styles.deviceItem, 
                activeSourceType === 'apple_health' && styles.activeItem
            ]} 
            onPress={handleAppleWatchConnect}
          >
              <View style={styles.deviceIcon}>
                  <Watch color={activeSourceType === 'apple_health' ? Colors.neon.DEFAULT : Colors.text.primary} size={24} />
              </View>
              <View style={styles.deviceInfo}>
                  <Text style={styles.deviceName}>Apple Watch</Text>
                  <Text style={styles.deviceStatus}>
                      {activeSourceType === 'apple_health' ? 'Connected via HealthKit' : 'Tap to connect'}
                  </Text>
              </View>
              {activeSourceType === 'apple_health' && <Check size={20} color={Colors.neon.DEFAULT} />}
          </Pressable>

          <View style={styles.divider} />

          {/* Bluetooth Header */}
          <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Bluetooth Devices</Text>
              <Pressable onPress={toggleScan} style={styles.scanButton}>
                  {isScanning ? (
                      <ActivityIndicator size="small" color={Colors.neon.DEFAULT} />
                  ) : (
                      <RefreshCw size={16} color={Colors.neon.DEFAULT} />
                  )}
                  <Text style={styles.scanButtonText}>
                      {isScanning ? 'Scanning...' : 'Scan'}
                  </Text>
              </Pressable>
          </View>

          {/* Bluetooth List */}
          {bleDevices.length === 0 && isScanning && (
              <View style={styles.emptyState}>
                  <Text style={styles.emptyText}>Searching for devices...</Text>
              </View>
          )}

           {bleDevices.length === 0 && !isScanning && activeSourceType !== 'ble' && (
              <View style={styles.emptyState}>
                   <Text style={styles.emptyText}>No devices found. Press Scan to start.</Text>
              </View>
          )}

          {/* Connected BLE Device (if any and not in list) */}
          {/* We rely on the list or just render status */}

          {bleDevices.map(device => (
              <Pressable 
                key={device.id} 
                style={[
                    styles.deviceItem,
                    // Typically checking if this is the connected ID would need context to expose connected ID, 
                    // but for now we just show it in the list.
                ]}
                onPress={() => connectToBleDevice(device)}
              >
                  <View style={styles.deviceIcon}>
                      <Bluetooth color={Colors.text.primary} size={24} />
                  </View>
                  <View style={styles.deviceInfo}>
                      <Text style={styles.deviceName}>{device.name || device.localName || 'Unknown Device'}</Text>
                      <Text style={styles.deviceStatus}>{device.id}</Text>
                  </View>
              </Pressable>
          ))}
          
          {activeSourceType === 'ble' && (
              <View style={styles.activeBleContainer}>
                  <View style={styles.deviceItem}>
                    <View style={styles.deviceIcon}>
                        <Bluetooth color={Colors.neon.DEFAULT} size={24} />
                    </View>
                    <View style={styles.deviceInfo}>
                        <Text style={styles.deviceName}>{deviceName || 'Connected Device'}</Text>
                        <Text style={styles.deviceStatus}>{status}</Text>
                    </View>
                    <Pressable onPress={disconnect} style={styles.disconnectButton}>
                        <X size={20} color={Colors.status.destructive} />
                    </Pressable>
                  </View>
              </View>
          )}

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
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
  content: {
    padding: 20,
  },
  sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 24,
      marginBottom: 12,
  },
  sectionTitle: {
      color: Colors.text.secondary,
      fontSize: 14,
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: 1,
  },
  divider: {
      height: 1,
      backgroundColor: Colors.glass.border,
      marginVertical: 8,
  },
  deviceItem: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: Colors.glass.DEFAULT,
      padding: 16,
      borderRadius: 12,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: Colors.glass.border,
  },
  activeItem: {
      borderColor: Colors.neon.DEFAULT,
      backgroundColor: 'rgba(212, 255, 0, 0.05)',
  },
  deviceIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: Colors.glass.hover,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 16,
  },
  deviceInfo: {
      flex: 1,
  },
  deviceName: {
      color: Colors.text.primary,
      fontSize: 16,
      fontWeight: '600',
  },
  deviceStatus: {
      color: Colors.text.secondary,
      fontSize: 14,
  },
  scanButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      padding: 8,
  },
  scanButtonText: {
      color: Colors.neon.DEFAULT,
      fontWeight: '600',
  },
  emptyState: {
      padding: 20,
      alignItems: 'center',
  },
  emptyText: {
      color: Colors.text.secondary,
  },
  activeBleContainer: {
      marginTop: 24,
  },
  disconnectButton: {
      padding: 8,
  },
});
