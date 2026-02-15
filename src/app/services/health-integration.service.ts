import { Injectable, signal } from '@angular/core';
import { Capacitor } from '@capacitor/core';

export interface HealthData {
  steps?: number;
  caloriesBurned?: number;
  activeMinutes?: number;
  distance?: number; // in kilometers
  heartRate?: number;
  sleepHours?: number;
}

export interface HealthIntegrationStatus {
  connected: boolean;
  platform: 'apple-health' | 'google-fit' | 'web' | 'unknown';
  lastSync?: string;
  availableMetrics: string[];
}

@Injectable({ providedIn: 'root' })
export class HealthIntegrationService {
  private readonly HEALTH_STATUS_KEY = 'health_integration_status';
  private readonly HEALTH_DATA_KEY = 'health_data_cache';

  isConnected = signal<boolean>(this.loadConnectionStatus());
  connectionStatus = signal<HealthIntegrationStatus>(this.loadStatus());
  todaysHealthData = signal<HealthData>({});

  constructor() {
    this.initializeHealthIntegration();
  }

  // ─── Initialization ─────────────────────────────────────────
  private initializeHealthIntegration(): void {
    if (Capacitor.isNativePlatform()) {
      // TODO: Initialize native health plugins
      // For iOS: Apple Health (HealthKit)
      // For Android: Google Fit
      this.initializeNativeHealth();
    } else {
      // Web platform - use mock/demo data
      this.initializeWebHealth();
    }
  }

  private async initializeNativeHealth(): Promise<void> {
    // TODO: Implement native health integration
    // 
    // For iOS (Apple Health):
    // - Request HealthKit permissions for steps, active energy, exercise time
    // - Set up background sync for health data
    // 
    // For Android (Google Fit):
    // - Request Google Fit API permissions
    // - Set up Google Fit client for reading fitness data
    // 
    // Implementation notes:
    // - Use @capacitor-community/health or similar plugin
    // - Handle permissions gracefully
    // - Cache data locally for offline use
    // - Sync periodically in the background

    console.log('TODO: Initialize native health integration');
    
    // Placeholder implementation
    this.connectionStatus.set({
      connected: false,
      platform: Capacitor.getPlatform() === 'ios' ? 'apple-health' : 'google-fit',
      availableMetrics: ['steps', 'calories', 'activeMinutes', 'distance']
    });
    this.saveStatus();
  }

  private initializeWebHealth(): void {
    // Web platform mock implementation
    this.connectionStatus.set({
      connected: this.isConnected(),
      platform: 'web',
      lastSync: this.isConnected() ? new Date().toISOString() : undefined,
      availableMetrics: ['steps', 'caloriesBurned', 'activeMinutes', 'distance']
    });
    
    if (this.isConnected()) {
      this.generateMockData();
    }
  }

  // ─── Connection Management ──────────────────────────────────
  async connect(): Promise<boolean> {
    if (Capacitor.isNativePlatform()) {
      // TODO: Request native health permissions
      return this.requestNativePermissions();
    } else {
      // Web simulation
      return this.simulateWebConnection();
    }
  }

  async disconnect(): Promise<void> {
    this.isConnected.set(false);
    this.connectionStatus.update(status => ({
      ...status,
      connected: false,
      lastSync: undefined
    }));
    this.todaysHealthData.set({});
    this.saveConnectionStatus();
    this.saveStatus();
  }

  private async requestNativePermissions(): Promise<boolean> {
    // TODO: Request actual health permissions on native platforms
    console.log('TODO: Request native health permissions');
    
    // Simulate permission request
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // For now, randomly approve/deny to simulate real behavior
    const granted = Math.random() > 0.3;
    
    if (granted) {
      this.isConnected.set(true);
      this.connectionStatus.update(status => ({
        ...status,
        connected: true,
        lastSync: new Date().toISOString()
      }));
      this.saveConnectionStatus();
      this.saveStatus();
      this.syncHealthData();
    }
    
    return granted;
  }

  private async simulateWebConnection(): Promise<boolean> {
    // Simulate connection process
    await new Promise(resolve => setTimeout(resolve, 800));
    
    this.isConnected.set(true);
    this.connectionStatus.update(status => ({
      ...status,
      connected: true,
      lastSync: new Date().toISOString()
    }));
    this.saveConnectionStatus();
    this.saveStatus();
    this.generateMockData();
    
    return true;
  }

  // ─── Data Sync ──────────────────────────────────────────────
  async syncHealthData(): Promise<HealthData> {
    if (!this.isConnected()) {
      return {};
    }

    if (Capacitor.isNativePlatform()) {
      return this.syncNativeHealthData();
    } else {
      return this.generateMockData();
    }
  }

  private async syncNativeHealthData(): Promise<HealthData> {
    // TODO: Sync real health data from native platforms
    console.log('TODO: Sync native health data');
    
    // Placeholder - in real implementation:
    // - Read today's step count from HealthKit/Google Fit
    // - Read calories burned, active minutes, distance
    // - Cache data locally
    // - Update lastSync timestamp
    
    const mockData: HealthData = {
      steps: Math.floor(Math.random() * 12000) + 3000,
      caloriesBurned: Math.floor(Math.random() * 800) + 200,
      activeMinutes: Math.floor(Math.random() * 120) + 30,
      distance: Math.round((Math.random() * 10 + 2) * 100) / 100
    };

    this.todaysHealthData.set(mockData);
    this.connectionStatus.update(status => ({
      ...status,
      lastSync: new Date().toISOString()
    }));
    this.saveHealthData();
    this.saveStatus();
    
    return mockData;
  }

  private generateMockData(): HealthData {
    // Generate realistic mock data for web demo
    const baseDate = new Date().toDateString();
    const seed = this.hashCode(baseDate); // Consistent data per day
    
    const data: HealthData = {
      steps: 8000 + Math.floor((seed * 1234) % 8000),
      caloriesBurned: 400 + Math.floor((seed * 567) % 600),
      activeMinutes: 45 + Math.floor((seed * 89) % 90),
      distance: Math.round((5 + ((seed * 12) % 8)) * 100) / 100,
      sleepHours: Math.round((6.5 + ((seed * 34) % 3)) * 10) / 10
    };

    this.todaysHealthData.set(data);
    this.saveHealthData();
    
    return data;
  }

  private hashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  // ─── Habit Auto-completion ──────────────────────────────────
  checkForAutoCompletions(): { habitName: string; reason: string; metric: string; value: number }[] {
    const data = this.todaysHealthData();
    const completions: { habitName: string; reason: string; metric: string; value: number }[] = [];

    // Define fitness habit patterns that can be auto-completed
    const fitnessPatterns = [
      {
        keywords: ['walk', '10k', 'steps', '10000'],
        metric: 'steps',
        threshold: 10000,
        reason: 'You walked over 10,000 steps today!'
      },
      {
        keywords: ['exercise', 'workout', 'active', '30', 'minutes'],
        metric: 'activeMinutes',
        threshold: 30,
        reason: 'You were active for 30+ minutes today!'
      },
      {
        keywords: ['calories', 'burn', '500', 'cal'],
        metric: 'caloriesBurned',
        threshold: 500,
        reason: 'You burned over 500 calories today!'
      },
      {
        keywords: ['distance', 'run', 'jog', '5k', 'km'],
        metric: 'distance',
        threshold: 5,
        reason: 'You covered over 5km today!'
      }
    ];

    // This would integrate with HabitService to check actual habits
    // For now, return potential completions for demo
    fitnessPatterns.forEach(pattern => {
      const value = data[pattern.metric as keyof HealthData] as number;
      if (value && value >= pattern.threshold) {
        completions.push({
          habitName: `Auto-complete for ${pattern.metric}`,
          reason: pattern.reason,
          metric: pattern.metric,
          value
        });
      }
    });

    return completions;
  }

  // ─── Settings ───────────────────────────────────────────────
  getAvailableMetrics(): string[] {
    return this.connectionStatus().availableMetrics;
  }

  toggleMetric(metric: string, enabled: boolean): void {
    // TODO: Enable/disable specific health metrics
    console.log(`TODO: ${enabled ? 'Enable' : 'Disable'} metric: ${metric}`);
  }

  // ─── Persistence ────────────────────────────────────────────
  private loadConnectionStatus(): boolean {
    const data = localStorage.getItem(this.HEALTH_STATUS_KEY);
    return data ? JSON.parse(data) : false;
  }

  private saveConnectionStatus(): void {
    localStorage.setItem(this.HEALTH_STATUS_KEY, JSON.stringify(this.isConnected()));
  }

  private loadStatus(): HealthIntegrationStatus {
    const data = localStorage.getItem('health_integration_full_status');
    return data ? JSON.parse(data) : {
      connected: false,
      platform: 'unknown',
      availableMetrics: []
    };
  }

  private saveStatus(): void {
    localStorage.setItem('health_integration_full_status', JSON.stringify(this.connectionStatus()));
  }

  private saveHealthData(): void {
    localStorage.setItem(this.HEALTH_DATA_KEY, JSON.stringify(this.todaysHealthData()));
  }
}