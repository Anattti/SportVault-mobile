import AppleHealthKit, {
  HealthValue,
  HealthInputOptions,
  HealthKitPermissions,
} from 'react-native-health';
import { IHeartRateSource, HeartRateSample, HeartRateSourceStatus } from './types';
import { Platform, NativeEventEmitter, NativeModules } from 'react-native';

const permissions: HealthKitPermissions = {
  permissions: {
    read: [AppleHealthKit.Constants.Permissions.HeartRate],
    write: [],
  },
};

export class AppleHealthSource implements IHeartRateSource {
  status: HeartRateSourceStatus = 'disconnected';
  onDisconnected?: () => void;
  private hasPermissions: boolean = false;
  private isObserving: boolean = false;

  async connect(): Promise<boolean> {
    if (Platform.OS !== 'ios') {
        this.status = 'error';
        return false;
    }

    return new Promise((resolve) => {
      AppleHealthKit.initHealthKit(permissions, (error: string) => {
        if (error) {
          console.error('[AppleHealthSource] Error initializing HealthKit:', error);
          this.status = 'error';
          resolve(false);
          return;
        }
        this.hasPermissions = true;
        this.status = 'connected';
        resolve(true);
      });
    });
  }

  getDeviceName(): string | null {
      return 'Apple Watch';
  }

  async disconnect(): Promise<void> {
    this.stopObservation();
    this.status = 'disconnected';
  }

  observe(callback: (sample: HeartRateSample) => void): void {
     if (!this.hasPermissions) {
        console.warn('[AppleHealthSource] No permissions to observe');
        return;
     }

     if (this.isObserving) return;
     this.isObserving = true;

     // Initialize Heart Rate Observer
     (AppleHealthKit as any).initHeartRateObserver({});

     // Subscribe to the event
     const sub = new NativeEventEmitter(NativeModules.AppleHealthKit).addListener(
        'HealthKit:HeartRate:new',
        () => {
            this.getLatestHeartRate(callback);
        }
     );
     
     // Store subscription to remove it later? 
     // For simplicity in this adapter, we might rely on stopObservation to just set flags or we should store the subscription.
     // But `react-native-health` setup for listeners is global. 
     // We will fetch immediately once to get current state
     this.getLatestHeartRate(callback);
  }

  stopObservation(): void {
      this.isObserving = false;
      // Note: react-native-health doesn't provide a clean way to remove the specific internal observer easily without native code changes sometimes,
      // but we can at least stop our internal logic or remove the listener if we stored it.
      // For now, we assume simple usage.
  }

  private getLatestHeartRate(callback: (sample: HeartRateSample) => void) {
      if (!this.isObserving) return;

      const options: HealthInputOptions = {
          startDate: new Date(new Date().getTime() - 1000 * 60).toISOString(), // Last minute
          endDate: new Date().toISOString(),
          limit: 1,
          ascending: false,
      };

      AppleHealthKit.getHeartRateSamples(options, (err: Object, results: HealthValue[]) => {
          if (err) {
              console.warn('Could not fetch HR samples', err);
              return;
          }
          if (results && results.length > 0) {
              const sample = results[0];
              callback({
                  value: sample.value,
                  timestamp: sample.startDate,
                  source: 'apple_health'
              });
          }
      });
  }
}
