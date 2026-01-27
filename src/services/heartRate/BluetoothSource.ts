import { BleManager, Device, Characteristic, Subscription, BleError } from 'react-native-ble-plx';
import { IHeartRateSource, HeartRateSample, HeartRateSourceStatus } from './types';
import { Platform, PermissionsAndroid } from 'react-native';
import { Buffer } from 'buffer'; // Requires 'buffer' package or similar polyfill usually, or simple parsing

// Polyfill for Buffer if not present usually in RN, but let's use base64 decoding manually or a helper if available.
// react-native-ble-plx returns base64 value.
// We can use 'atob' (available in RN JS environment) and charCodeAt.

const HEART_RATE_SERVICE_UUID_SHORT = '180d';
const HEART_RATE_SERVICE_UUID_LONG = '0000180d-0000-1000-8000-00805f9b34fb';
const HEART_RATE_MEASUREMENT_CHARACTERISTIC = '2a37';

export class BluetoothSource implements IHeartRateSource {
  status: HeartRateSourceStatus = 'disconnected';
  private manager: BleManager | null = null;
  private connectedDevice: Device | null = null;
  private monitorSubscription: Subscription | null = null;
  
  constructor() {
      // Defer initialization to allow logger attachment
  }

  init() {
    try {
        if (!this.manager) {
            this.manager = new BleManager();
        }
    } catch (e) {
        console.warn('BluetoothSource: Failed to initialize BleManager. Native module might be missing.', e);
        this.status = 'error';
    }
  }

  async connect(deviceId?: string): Promise<boolean> {
    if (!this.manager) {
        console.warn('BluetoothSource: BleManager not initialized');
        return false;
    }

    if (!deviceId) {
        console.warn('BluetoothSource: connect called without deviceId');
        return false;
    }

    try {
        const connected = await this.manager.connectToDevice(deviceId);
        this.connectedDevice = await connected.discoverAllServicesAndCharacteristics();
        
        // Listen for disconnection
        this.manager.onDeviceDisconnected(deviceId, (error, device) => {
             console.log('[BluetoothSource] Device disconnected', error);
             this.status = 'disconnected';
             this.connectedDevice = null;
             if (this.onDisconnected) {
                 this.onDisconnected();
             }
        });

        this.status = 'connected';
        return true;
    } catch (e) {
        console.error('Connection failed', e);
        this.status = 'error';
        return false;
    }
  }

  // Allow setting the callback
  onDisconnected?: () => void;

  getDeviceName(): string | null {
      return this.connectedDevice?.name || this.connectedDevice?.localName || this.connectedDevice?.id || null;
  }

  async getConnectedDevices(): Promise<Device[]> {
    if (!this.manager) return [];
    try {
        // Search for both short and long UUIDs to be safe
        const uuids = [HEART_RATE_SERVICE_UUID_SHORT, HEART_RATE_SERVICE_UUID_LONG];
        
        const devices = await this.manager.connectedDevices(uuids);
        console.log('Found connected devices:', devices.length);
        
        return devices;
    } catch (e) {
        console.warn('BluetoothSource: Failed to get connected devices', e);
        return [];
    }
  }

  // Helper for scanning
  async startScan(onDeviceFound: (device: Device) => void) {
      if (!this.manager) return;

      if (Platform.OS === 'android') {
          // Check permissions
      }
      
      this.status = 'scanning';

      // 1. Check for peripherals already connected to the system (e.g. paired in Settings)
      const connected = await this.getConnectedDevices();
      for (const device of connected) {
          onDeviceFound(device);
      }

      // 2. Start scanning for advertising peripherals
      const scanUuids = [HEART_RATE_SERVICE_UUID_SHORT, HEART_RATE_SERVICE_UUID_LONG];

      this.manager.startDeviceScan(scanUuids, null, (error, device) => {
          if (error) {
              console.error(error);
              this.status = 'error';
              return;
          }
          if (device) {
              onDeviceFound(device);
          }
      });
  }

  stopScan() {
      if (!this.manager) return;
      this.manager.stopDeviceScan();
      if (this.status === 'scanning') {
          this.status = 'disconnected'; // Or back to previous state
      }
  }

  async disconnect(): Promise<void> {
    if (this.connectedDevice) {
        try {
            await this.connectedDevice.cancelConnection();
        } catch (e) {} // Ignore if already disconnected
    }
    this.monitorSubscription?.remove();
    this.connectedDevice = null;
    this.status = 'disconnected';
  }

  observe(callback: (sample: HeartRateSample) => void): void {
      if (!this.connectedDevice) return;

      // We don't strictly know if the device was discovered with short or long UUID service,
      // but monitorCharacteristicForService typically works if the service exists.
      // Usually standard is short '180d' for lookup, but let's try strict first.
      
      this.monitorSubscription = this.connectedDevice.monitorCharacteristicForService(
          HEART_RATE_SERVICE_UUID_SHORT, // Try short first as it is most common standard
          HEART_RATE_MEASUREMENT_CHARACTERISTIC,
          (error, characteristic) => {
              if (error) {
                  console.error('Monitor error', error);
                  // Optional: fallback to long UUID if needed?
                  return;
              }
              if (characteristic?.value) {
                  const bpm = this.parseHeartRate(characteristic.value);
                  if (bpm !== null) {
                      callback({
                          value: bpm,
                          timestamp: new Date().toISOString(),
                          source: 'ble_device'
                      });
                  }
              }
          }
      );
  }

  stopObservation(): void {
      this.monitorSubscription?.remove();
      this.monitorSubscription = null;
  }

  private parseHeartRate(base64Value: string): number | null {
      // Decode Base64 to byte array
      const binaryString = atob(base64Value);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
      }

      if (bytes.length === 0) return null;

      const flags = bytes[0];
      const isUint16 = (flags & 0x01) === 0x01;
      
      if (isUint16 && bytes.length >= 3) {
          // Little Endian
          return bytes[1] + (bytes[2] << 8);
      } else if (!isUint16 && bytes.length >= 2) {
          return bytes[1];
      }
      
      return null;
  }
}
