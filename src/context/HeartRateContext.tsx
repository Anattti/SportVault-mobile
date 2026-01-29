import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AppleHealthSource } from '../services/heartRate/AppleHealthSource';
import { BluetoothSource } from '../services/heartRate/BluetoothSource';
import { IHeartRateSource, HeartRateSample, HeartRateSourceStatus } from '../services/heartRate/types';
import { AppState } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const LAST_DEVICE_ID_KEY = 'last_connected_hr_device_id';

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
         if (activeSourceTypeRef.current !== 'none') {
             return;
         }
         
         try {
             // 1. First check if we have any system-connected devices (already paired/used by OS)
             // This is fast and reliable for devices currently active.
             const connectedDevices = await bluetoothSource.getConnectedDevices();
             
             if (connectedDevices.length > 0) {
                 const device = connectedDevices[0];
                 console.log('[HeartRateContext] Auto-connecting to system device:', device.name || device.id);
                 await connectSource('ble', device.id);
                 return;
             }
             
             // 2. If no system devices, check if we have a saved device ID from previous session
             const savedDeviceId = await SecureStore.getItemAsync(LAST_DEVICE_ID_KEY);
             if (savedDeviceId) {
                 console.log('[HeartRateContext] Found saved device ID, attempting to connect:', savedDeviceId);
                 // We try to connect to it. The BluetoothSource.connect will probably need to scan or use retrievePeripherals
                 // depending on implementation. connectToDevice usually works if the device is advertising.
                 
                 // Use scanAndConnect here too!
                 const success = await bluetoothSource.scanAndConnect(savedDeviceId, 5000); // 5s scan
                 if (success) {
                      // We need to register it as active source if successful
                      // scanAndConnect only connects the prompt, but we need to set context state
                      // Calling connectSource('ble', savedId) is easier as it sets up state,
                      // BUT connectSource uses .connect() by default. 
                      // Let's call connectSource BUT we update connectSource to use scanAndConnect? 
                      // Or just call connectSource passing the logic?
                      
                      // Actually, if scanAndConnect succeeded, the device IS connected.
                      // We can just call connectSource('ble', savedDeviceId) and it might re-connect or just work?
                      // If we change connectSource to use scanAndConnect it changes behavior for manual selection too (good?).
                      
                      // Let's just call connectSource. It calls .connect(). If already connected, .connect() usually handles it?
                      await connectSource('ble', savedDeviceId);
                 } else {
                      // Check if it works with simple connect (if hidden)
                      // await connectSource('ble', savedDeviceId);
                 }
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
          
          // 1. Reset state immediately so UI shows "disconnected" or "connecting"
          setStatus('disconnected');
          setCurrentBpm(null);
          setDeviceName(null);
          setActiveSource(null); // Clear the active source instance
          // We DO NOT clear activeSourceType here to indicate we *want* to be connected?
          // Actually, our UI relies on activeSourceType to show controls. 
          // Let's keep activeSourceType as 'ble' if we want to show "Connecting..." state?
          // But connectSource usually resets it. 
          // Let's set it to 'none' but keep the loop running. 
          // OR better: Set status to 'connecting' and keep activeSourceType as 'ble' so UI shows the BLE controls/status?
          // If we set activeSourceType='none', the UI might hide the heart rate entirely if conditional.
          // Let's keep activeSourceType as 'ble' but activeSource as null.
          setActiveSourceType('ble'); 
          setStatus('connecting');

          // 2. Attempt auto-reconnect if it was a BLE device
          if (type === 'ble' && deviceId) {
             console.log('[HeartRateContext] Starting persistent auto-reconnect to', deviceId);
             
             // Check if we are still meant to be connecting (user didn't press disconnect)
             // We can use a unique ID for this connection attempt session?
             // Or just check if activeSource is still null and we are in this loop.
             
             const attemptReconnect = async () => {
                 // Return if user manually disconnected (status would be disconnected/none or source changed)
                 // However, we set status to connecting above.
                 // We need a way to stop this loop if 'disconnect()' is called.
                 // We can check a ref 'shouldReconnect' or similar, but let's use the mounted/active check.
                 
                 // If the user called disconnect(), activeSourceType would be 'none'.
                 if (activeSourceTypeRef.current !== 'ble') {
                     console.log('[HeartRateContext] Auto-reconnect stopped (method changed or disconnected)');
                     return;
                 }
                 
                 console.log(`[HeartRateContext] Reconnecting...`);
                 
                 // Try to connect
                 // We use the raw 'connect' from our stored instance or create a new one?
                 // connectingSource('ble', deviceId) handles instance creation.
                 // But it also handles state cleanup. 
                 
                 // Let's try to connect source. if it fails, wait and recurse.
                 // We need to re-use the same BluetoothSource instance usually, or create new?
                 // Context keeps a single 'bluetoothSource' instance.
                 
                 // USE SCAN AND CONNECT
                 // This is more robust for "Out of Range" scenarios than simple connect()
                 const success = await bluetoothSource.scanAndConnect(deviceId, 6000); // 6s scan timeout
                 
                 if (success) {
                     console.log('[HeartRateContext] Auto-reconnect successful!');
                     // We need to re-setup the listeners because 'connectSource' usually does that.
                     // But we are bypassing 'connectSource' to avoid its "disconnect previous" logic which might mess us up?
                     // Actually, we should probably just call 'setupSource(bluetoothSource)' logic.
                     
                     // Re-bind listeners
                     setActiveSource(bluetoothSource);
                     setStatus('connected');
                     setDeviceName(bluetoothSource.getDeviceName());
                     
                     bluetoothSource.onDisconnected = source.onDisconnected; // Keep the same handler!
                     bluetoothSource.observe(handleNewSample);
                     
                 } else {
                     // Failed, wait and try again
                     if (activeSourceTypeRef.current === 'ble') {
                         console.log('[HeartRateContext] Reconnect failed, retrying in 2s...');
                         setTimeout(attemptReconnect, 2000);
                     }
                 }
             };
             
             // First attempt after delay
             setTimeout(attemptReconnect, 1000);
          }
      };
      
      // Start observer
      source.observe(handleNewSample);
      
      // Save device ID for future auto-connect
      if (type === 'ble' && deviceId) {
          SecureStore.setItemAsync(LAST_DEVICE_ID_KEY, deviceId).catch(err => {
              console.warn('Failed to save device ID', err);
          });
      }

    } else {
      setStatus('error');
    }

    return success;
  };

  const disconnect = async () => {
    // Setting this ref/state will stop any pending auto-reconnect loops
    setActiveSourceType('none'); 
    
    if (activeSource) {
      await activeSource.disconnect();
      setActiveSource(null);
      setStatus('disconnected');
      setCurrentBpm(null);
      setDeviceName(null);
      
      // If user manually disconnects, we should probably forget the device so we don't auto-connect
      // next time against their will.
      SecureStore.deleteItemAsync(LAST_DEVICE_ID_KEY).catch(() => {});
      
    } else {
        // Even if no active source, we might be in 'connecting' loop
        setStatus('disconnected');
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
