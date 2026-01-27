import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AppleHealthSource } from '../services/heartRate/AppleHealthSource';
import { BluetoothSource } from '../services/heartRate/BluetoothSource';
import { IHeartRateSource, HeartRateSample, HeartRateSourceStatus } from '../services/heartRate/types';
import { AppState } from 'react-native';

type SourceType = 'none' | 'apple_health' | 'ble';

interface HeartRateContextType {
  currentBpm: number | null;
  status: HeartRateSourceStatus;
  activeSourceType: SourceType;
  connectSource: (type: SourceType, deviceId?: string) => Promise<boolean>;
  disconnect: () => Promise<void>;
  deviceName: string | null;
  
  // For BLE Scanning
  startBleScan: (callback: (device: any) => void) => void;
  stopBleScan: () => void;
  
  // Last sample info
  lastSample: HeartRateSample | null;
}

const HeartRateContext = createContext<HeartRateContextType | undefined>(undefined);

export const HeartRateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeSource, setActiveSource] = useState<IHeartRateSource | null>(null);
  const [activeSourceType, setActiveSourceType] = useState<SourceType>('none');
  const activeSourceTypeRef = React.useRef<SourceType>('none'); // Ref for async checks
  
  useEffect(() => { activeSourceTypeRef.current = activeSourceType; }, [activeSourceType]);

  const [currentBpm, setCurrentBpm] = useState<number | null>(null);
  const [lastSample, setLastSample] = useState<HeartRateSample | null>(null);
  const [status, setStatus] = useState<HeartRateSourceStatus>('disconnected');
  const [deviceName, setDeviceName] = useState<string | null>(null);

  // Keep instances
  const [appleHealthSource] = useState(() => new AppleHealthSource());
  const [bluetoothSource] = useState(() => {
     const src = new BluetoothSource();
     src.init();
     return src;
  });

  // Handle source status updates & Auto-connect
  useEffect(() => {
     const handleAutoConnect = async () => {
         // Prevent auto-connect if we already have a source
         // (You might want to allow switching from 'none' to 'ble' seamlessly, but not overriding existing)
         // We'll read the current state inside the effect or use a ref if needed, 
         // but here we rely on the closure or check activeSourceType if we added it to dependency (careful of loops).
         // Ideally, check if we are disconnected.
         
         // 1. Try to find a system-connected BLE device
         try {
             // Only auto-connect if we aren't already using something (or if we want to prioritize BLE)
             if (activeSourceTypeRef.current !== 'none') {
                 return;
             }
             
             const connectedDevices = await bluetoothSource.getConnectedDevices();
             if (connectedDevices.length > 0) {
                 // Found a device handled by system
                 const device = connectedDevices[0];
                 console.log('[HeartRateContext] Auto-connecting to system device:', device.name || device.id);
                 
                 // We only auto-connect if we are currently not connected or connecting?
                 // For now, let's assume we want to prioritize this device if nothing else is active.
                 // We can check activeSourceType in a ref to be safe inside async.
                 await connectSource('ble', device.id);
             }
         } catch (e) {
             console.warn('[HeartRateContext] Auto-connect BLE failed:', e);
         }
     };

     // Run on mount
     handleAutoConnect();

     // Run on AppState change (background -> foreground)
     const subscription = AppState.addEventListener('change', nextAppState => {
         if (nextAppState === 'active') {
             // We verify if we are already connected inside connectSource mostly, 
             // but let's avoid unnecessary calls if we can.
             // Accessing state here might be stale if not careful, but 'bluetoothSource' is constant.
             // We'll let handleAutoConnect do the check.
             // NOTE: We need to know if we are ALREADY connected. 
             // Since we can't easily access updated 'activeSourceType' in this closure without re-binding,
             // we might blindly try, and connectSource handles "disconnect current" logic.
             // BETTER: Check if the context's current 'activeSourceType' is 'none' before calling connectSource?
             // But we can't see it here easily without re-running effect.
             // Let's rely on connectSource to handle it or use a ref.
             handleAutoConnect();
         }
     });

     return () => {
         subscription.remove();
     };
  }, []);

  const handleNewSample = useCallback((sample: HeartRateSample) => {
    setLastSample(sample);
    setCurrentBpm(sample.value);
  }, []);

  const connectSource = async (type: SourceType, deviceId?: string): Promise<boolean> => {
    // Disconnect current if any
    if (activeSource) {
      await activeSource.disconnect();
      setActiveSource(null);
      setActiveSourceType('none');
      setStatus('disconnected');
    }

    if (type === 'none') return true;

    let source: IHeartRateSource | null = null;
    if (type === 'apple_health') {
      source = appleHealthSource;
    } else if (type === 'ble') {
      source = bluetoothSource;
    }

    if (!source) return false;

    setStatus('connecting' as any); // Use scanning or similar if needed, or simple 'connecting'
    
    // Connect
    const success = await source.connect(deviceId); // BLE needs deviceId implicitly handled or passed
    // NOTE: BluetoothSource.connect requires deviceId if adhering to our implementation. 
    // If type is BLE and no deviceId, we assume flow is handled elsewhere or error.
    
    if (success) {
      setActiveSource(source);
      setActiveSourceType(type);
      setStatus(source.status);
      setDeviceName(source.getDeviceName());
      
      // Handle unexpected disconnection
      source.onDisconnected = () => {
          console.log('[HeartRateContext] Source disconnected unexpectedly');
          // Disconnect fully to clear state
          disconnect(); 
          // Optional: Attempt auto-reconnect?
      };
      
      // Start observer
      source.observe(handleNewSample);
    } else {
      setStatus('error');
    }

    return success;
  };

  const disconnect = async () => {
    if (activeSource) {
      await activeSource.disconnect();
      setActiveSource(null);
      setActiveSourceType('none');
      setStatus('disconnected');
      setCurrentBpm(null);
      setDeviceName(null);
    }
  };

  const startBleScan = (callback: (device: any) => void) => {
      // Use the blueooth source instance to scan even if not 'active' strictly as HR source yet
      bluetoothSource.startScan(callback);
  };

  const stopBleScan = () => {
      bluetoothSource.stopScan();
  };

  return (
    <HeartRateContext.Provider
      value={{
        currentBpm,
        status,
        activeSourceType,
        connectSource,
        disconnect,
        startBleScan,
        stopBleScan,
        lastSample,
        deviceName
      }}
    >
      {children}
    </HeartRateContext.Provider>
  );
};

export const useHeartRate = () => {
  const context = useContext(HeartRateContext);
  if (!context) {
    throw new Error('useHeartRate must be used within a HeartRateProvider');
  }
  return context;
};
