export type HeartRateSample = {
  value: number; // BPM
  timestamp: string;
  source: 'apple_health' | 'ble_device' | 'manual';
};

export type HeartRateSourceStatus = 'connected' | 'disconnected' | 'scanning' | 'connecting' | 'error';

export interface IHeartRateSource {
  connect(deviceId?: string): Promise<boolean>;
  getConnectedDevices?(): Promise<any[]>;
  disconnect(): Promise<void>;
  getDeviceName(): string | null;
  observe(callback: (sample: HeartRateSample) => void): void;
  stopObservation(): void;
  status: HeartRateSourceStatus;
  
  // Callback for unexpected disconnection
  onDisconnected?: () => void;
}
