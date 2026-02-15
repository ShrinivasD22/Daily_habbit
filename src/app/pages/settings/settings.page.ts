import { Component, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonList, IonItem,
  IonLabel, IonToggle, IonButton, IonIcon, IonCard, IonCardHeader, IonBackButton, IonButtons,
  IonCardTitle, IonCardContent,
} from '@ionic/angular/standalone';
import { HabitService } from '../../services/habit.service';
import { HealthIntegrationService } from '../../services/health-integration.service';
import { SpotifyIntegrationService } from '../../services/spotify-integration.service';
import { CalendarIntegrationService } from '../../services/calendar-integration.service';
import { addIcons } from 'ionicons';
import { 
  moonOutline, downloadOutline, cloudUploadOutline, heartOutline,
  musicalNotesOutline, calendarOutline, linkOutline, checkmarkCircleOutline,
  closeCircleOutline, playOutline
} from 'ionicons/icons';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    CommonModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonList, IonItem,
    IonLabel, IonToggle, IonButton, IonIcon, IonCard, IonCardHeader, IonBackButton, IonButtons,
    IonCardTitle, IonCardContent,
  ],
  template: `
    <ion-header translucent="true">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/settings"></ion-back-button>
        </ion-buttons>
        <ion-title>Settings</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content [fullscreen]="true" class="ion-padding">

      <!-- Profile -->
      <div class="settings-group">
        <div class="group-header">Profile</div>
        <div class="settings-card">
          <div class="profile-row">
            <div class="profile-level-badge">{{ profile().level }}</div>
            <div class="profile-info">
              <span class="profile-name">Level {{ profile().level }}</span>
              <span class="profile-detail">{{ profile().xp }} XP · {{ profile().achievements.length }} achievements</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Appearance -->
      <div class="settings-group">
        <div class="group-header">Appearance</div>
        <div class="settings-card">
          <div class="settings-row">
            <span class="row-label">🌙 Dark Mode</span>
            <ion-toggle
              [checked]="isDarkMode()"
              (ionChange)="toggleDarkMode($event)"
            ></ion-toggle>
          </div>
        </div>
      </div>

      <!-- Data -->
      <div class="settings-group">
        <div class="group-header">Data</div>
        <div class="settings-card">
          <button class="action-row" (click)="exportData()">
            <span>📥 Export Data (JSON)</span>
            <span class="row-arrow">›</span>
          </button>
          <div class="row-divider"></div>
          <button class="action-row" (click)="triggerImport()">
            <span>📤 Import Data (JSON)</span>
            <span class="row-arrow">›</span>
          </button>
          <input type="file" accept=".json" #fileInput style="display:none" (change)="importData($event)">
        </div>
        @if (importStatus) {
          <p class="import-status" [class.success]="importStatus === 'Success!'" [class.error]="importStatus !== 'Success!'">
            {{ importStatus === 'Success!' ? '✅' : '❌' }} {{ importStatus }}
          </p>
        }
      </div>

      <!-- Notifications -->
      <div class="settings-group">
        <div class="group-header">Notifications</div>
        <div class="settings-card">
          <div class="settings-row">
            <span class="row-label">Status</span>
            <div class="status-row">
              <span class="status-dot" [class.active]="notificationStatus === 'granted'"></span>
              <span class="status-text">{{ notificationStatus | titlecase }}</span>
            </div>
          </div>
          <div class="row-divider"></div>
          <button class="action-row" (click)="requestPermission()">
            <span>🔔 Enable Notifications</span>
            <span class="row-arrow">›</span>
          </button>
        </div>
      </div>

      <!-- Integrations -->
      <div class="settings-group">
        <div class="group-header">Integrations</div>
        
        <!-- Health Integration Card -->
        <div class="settings-card integration-card">
          <div class="integration-header">
            <div class="integration-icon health">
              <ion-icon name="heart-outline"></ion-icon>
            </div>
            <div class="integration-info">
              <h4 class="integration-title">Health Integration</h4>
              <p class="integration-subtitle">{{ healthConnectionStatus().platform === 'web' ? 'Demo Mode' : 'Apple Health / Google Fit' }}</p>
            </div>
            <div class="integration-status">
              <ion-icon 
                [name]="healthConnectionStatus().connected ? 'checkmark-circle-outline' : 'close-circle-outline'"
                [style.color]="healthConnectionStatus().connected ? '#4ADE80' : 'var(--text-muted)'"
              ></ion-icon>
            </div>
          </div>
          <p class="integration-desc">
            Auto-complete fitness habits when health data matches your goals. 
            {{ healthConnectionStatus().connected ? 'Connected and syncing.' : 'Connect to get started.' }}
          </p>
          @if (healthConnectionStatus().connected) {
            <div class="health-metrics">
              <div class="metric">
                <span class="metric-icon">👟</span>
                <span class="metric-value">{{ healthData().steps || 0 }}</span>
                <span class="metric-label">steps</span>
              </div>
              <div class="metric">
                <span class="metric-icon">🔥</span>
                <span class="metric-value">{{ healthData().caloriesBurned || 0 }}</span>
                <span class="metric-label">calories</span>
              </div>
              <div class="metric">
                <span class="metric-icon">⏱️</span>
                <span class="metric-value">{{ healthData().activeMinutes || 0 }}</span>
                <span class="metric-label">active min</span>
              </div>
            </div>
          }
          <div class="integration-actions">
            @if (!healthConnectionStatus().connected) {
              <button class="integration-btn primary" (click)="connectHealth()">
                Connect Health
              </button>
            } @else {
              <button class="integration-btn secondary" (click)="disconnectHealth()">
                Disconnect
              </button>
              <button class="integration-btn secondary" (click)="syncHealth()">
                Sync Now
              </button>
            }
          </div>
        </div>

        <!-- Spotify Integration Card -->
        <div class="settings-card integration-card">
          <div class="integration-header">
            <div class="integration-icon spotify">
              <ion-icon name="musical-notes-outline"></ion-icon>
            </div>
            <div class="integration-info">
              <h4 class="integration-title">Spotify Integration</h4>
              <p class="integration-subtitle">Add playlists to your habits</p>
            </div>
          </div>
          <p class="integration-desc">
            Attach Spotify playlists to habits for motivation. Play music while completing your daily goals.
          </p>
          <div class="integration-actions">
            <button class="integration-btn secondary" (click)="openSpotifyHelp()">
              <ion-icon name="link-outline"></ion-icon>
              How to use
            </button>
          </div>
        </div>

        <!-- Calendar Integration Card -->
        <div class="settings-card integration-card">
          <div class="integration-header">
            <div class="integration-icon calendar">
              <ion-icon name="calendar-outline"></ion-icon>
            </div>
            <div class="integration-info">
              <h4 class="integration-title">Calendar Sync</h4>
              <p class="integration-subtitle">Export habits to your calendar</p>
            </div>
          </div>
          <p class="integration-desc">
            Export your habits as calendar events. Supports Google Calendar, Apple Calendar, and iCal format.
          </p>
          <div class="integration-actions">
            <button class="integration-btn secondary" (click)="exportAllToCalendar()">
              <ion-icon name="download-outline"></ion-icon>
              Export All Habits
            </button>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="settings-footer">
        <p class="footer-text">Habit Tracker v1.0</p>
        <p class="footer-sub">Built with ❤️ and discipline</p>
      </div>

      <div style="height: 60px;"></div>
    </ion-content>
  `,
  styles: [`
    :host { display: block; }

    .settings-group {
      margin-bottom: 24px;
      animation: slide-up 0.4s ease-out both;
    }
    .group-header {
      font-family: 'Sora', sans-serif;
      font-size: 0.78rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--text-muted);
      margin-bottom: 8px;
      padding: 0 4px;
    }
    .settings-card {
      border-radius: 14px;
      background: var(--card-bg);
      overflow: hidden;
    }

    /* Profile Row */
    .profile-row {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 16px;
    }
    .profile-level-badge {
      width: 48px;
      height: 48px;
      border-radius: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: 'Sora', sans-serif;
      font-weight: 800;
      font-size: 1.2rem;
      color: #ffffff;
      background: #FF6B4A;
    }
    .profile-info {
      display: flex;
      flex-direction: column;
    }
    .profile-name {
      font-family: 'Sora', sans-serif;
      font-weight: 700;
      font-size: 1rem;
    }
    .profile-detail {
      font-size: 0.82rem;
      color: var(--text-muted);
      margin-top: 2px;
    }

    /* Settings Row */
    .settings-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 16px;
      min-height: 48px;
    }
    .row-label {
      font-size: 0.95rem;
      font-weight: 500;
    }

    /* Action Row */
    .action-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 16px;
      width: 100%;
      background: none;
      border: none;
      color: inherit;
      font-family: 'DM Sans', sans-serif;
      font-size: 0.95rem;
      font-weight: 500;
      cursor: pointer;
      min-height: 48px;
      text-align: left;
      transition: background 0.15s ease-out;
    }
    .action-row:active {
      background: rgba(255, 107, 74, 0.06);
    }
    .row-arrow {
      font-size: 1.2rem;
      color: var(--text-muted);
    }
    .row-divider {
      height: 1px;
      background: var(--ion-border-color);
      margin: 0 16px;
    }

    /* Status */
    .status-row {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--text-muted);
    }
    .status-dot.active {
      background: #4ADE80;
    }
    .status-text {
      font-size: 0.85rem;
      color: var(--text-secondary);
    }

    .import-status {
      font-size: 0.85rem;
      font-weight: 600;
      text-align: center;
      padding: 8px;
      border-radius: 10px;
      margin-top: 8px;
    }
    .import-status.success { color: #4ADE80; background: rgba(74, 222, 128, 0.1); }
    .import-status.error { color: #EF4444; background: rgba(239, 68, 68, 0.1); }

    /* Footer */
    .settings-footer {
      text-align: center;
      padding: 20px 0 8px;
    }
    .footer-text {
      font-family: 'Sora', sans-serif;
      font-size: 0.82rem;
      font-weight: 600;
      color: var(--text-muted);
    }
    .footer-sub {
      font-size: 0.75rem;
      color: var(--text-muted);
      margin-top: 2px;
    }

    /* Integrations */
    .integration-card {
      margin-bottom: 16px;
      padding: 0;
    }

    .integration-header {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 16px 16px 12px;
    }
    .integration-icon {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .integration-icon ion-icon {
      font-size: 24px;
      color: white;
    }
    .integration-icon.health {
      background: linear-gradient(135deg, #EF4444, #F87171);
    }
    .integration-icon.spotify {
      background: linear-gradient(135deg, #1DB954, #1ED760);
    }
    .integration-icon.calendar {
      background: linear-gradient(135deg, #3B82F6, #60A5FA);
    }
    .integration-info {
      flex: 1;
      min-width: 0;
    }
    .integration-title {
      font-family: 'Sora', sans-serif;
      font-size: 0.95rem;
      font-weight: 600;
      margin: 0;
      color: var(--ion-color-primary);
    }
    .integration-subtitle {
      font-size: 0.8rem;
      color: var(--text-muted);
      margin: 2px 0 0;
    }
    .integration-status {
      flex-shrink: 0;
    }
    .integration-status ion-icon {
      font-size: 24px;
    }

    .integration-desc {
      padding: 0 16px 12px;
      font-size: 0.85rem;
      color: var(--text-secondary);
      line-height: 1.4;
      margin: 0;
    }

    .health-metrics {
      display: flex;
      gap: 16px;
      padding: 0 16px 12px;
    }
    .metric {
      display: flex;
      flex-direction: column;
      align-items: center;
      flex: 1;
      padding: 8px;
      border-radius: 8px;
      background: rgba(255, 107, 74, 0.05);
    }
    .metric-icon {
      font-size: 1.2rem;
      margin-bottom: 2px;
    }
    .metric-value {
      font-family: 'Sora', sans-serif;
      font-size: 0.9rem;
      font-weight: 700;
      color: #FF6B4A;
    }
    .metric-label {
      font-size: 0.7rem;
      color: var(--text-muted);
      margin-top: 1px;
    }

    .integration-actions {
      display: flex;
      gap: 8px;
      padding: 0 16px 16px;
    }
    .integration-btn {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 16px;
      border-radius: 10px;
      font-family: 'DM Sans', sans-serif;
      font-size: 0.85rem;
      font-weight: 600;
      border: none;
      cursor: pointer;
      transition: all 0.2s ease-out;
      flex: 1;
      justify-content: center;
    }
    .integration-btn ion-icon {
      font-size: 16px;
    }
    .integration-btn.primary {
      background: #FF6B4A;
      color: white;
    }
    .integration-btn.primary:active {
      transform: scale(0.98);
      background: #E55A3B;
    }
    .integration-btn.secondary {
      background: var(--card-bg);
      color: var(--text-secondary);
      border: 1px solid var(--ion-border-color);
    }
    .integration-btn.secondary:active {
      transform: scale(0.98);
      background: rgba(255, 107, 74, 0.05);
    }
  `],
})
export class SettingsPage {
  profile = computed(() => this.habitService.profile());
  isDarkMode = computed(() => this.habitService.preferences()['darkMode'] === true);
  importStatus = '';
  
  // Integration status
  healthConnectionStatus = computed(() => this.healthService.connectionStatus());
  healthData = computed(() => this.healthService.todaysHealthData());

  get notificationStatus(): string {
    if (!('Notification' in window)) return 'Not supported';
    return Notification.permission;
  }

  constructor(
    private habitService: HabitService,
    private healthService: HealthIntegrationService,
    private spotifyService: SpotifyIntegrationService,
    private calendarService: CalendarIntegrationService
  ) {
    addIcons({ 
      moonOutline, downloadOutline, cloudUploadOutline, heartOutline,
      musicalNotesOutline, calendarOutline, linkOutline, checkmarkCircleOutline,
      closeCircleOutline, playOutline 
    });
    this.applyTheme();
  }

  toggleDarkMode(event: any): void {
    const dark = event.detail.checked;
    this.habitService.setPreference('darkMode', dark);
    this.applyTheme();
  }

  private applyTheme(): void {
    document.body.classList.toggle('dark', this.isDarkMode());
  }

  exportData(): void {
    const json = this.habitService.exportData();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `habit-tracker-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  triggerImport(): void {
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    input?.click();
  }

  importData(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const success = this.habitService.importData(reader.result as string);
      this.importStatus = success ? 'Success!' : 'Invalid file format';
    };
    reader.readAsText(file);
  }

  requestPermission(): void {
    this.habitService.requestNotificationPermission();
  }

  // ─── Health Integration ─────────────────────────────────────
  async connectHealth(): Promise<void> {
    try {
      await this.healthService.connect();
    } catch (error) {
      console.error('Failed to connect health integration:', error);
    }
  }

  async disconnectHealth(): Promise<void> {
    await this.healthService.disconnect();
  }

  async syncHealth(): Promise<void> {
    await this.healthService.syncHealthData();
  }

  // ─── Spotify Integration ────────────────────────────────────
  openSpotifyHelp(): void {
    const message = `
How to add Spotify to your habits:

1. Go to Spotify and find a playlist, album, or track
2. Click "Share" and copy the link
3. When creating or editing a habit, paste the Spotify URL
4. You'll see a play button on your Today page for habits with music!

Supported formats:
• Playlists: Perfect for workout routines
• Albums: Great for focus sessions  
• Tracks: Quick motivation boosts
    `.trim();

    alert(message);
  }

  // ─── Calendar Integration ───────────────────────────────────
  exportAllToCalendar(): void {
    const habits = this.habitService.habits();
    if (habits.length === 0) {
      alert('No habits to export. Create some habits first!');
      return;
    }

    // Show options for different calendar services
    this.showCalendarExportOptions();
  }

  private showCalendarExportOptions(): void {
    const message = `
Choose your calendar service:

• Google Calendar - Opens web page to add events
• Apple Calendar - Downloads .ics file for Calendar app
• Other Calendars - Downloads .ics file (Outlook, etc.)

What would you like to do?
    `.trim();

    if (confirm(message + '\n\nClick OK for Google Calendar, Cancel for .ics download')) {
      this.exportToGoogleCalendar();
    } else {
      this.exportToICS();
    }
  }

  private exportToGoogleCalendar(): void {
    const habits = this.habitService.habits();
    // For multiple habits, we'll create multiple Google Calendar links
    // In a real app, you might want to batch this differently
    
    if (habits.length === 0) return;

    const firstHabit = habits[0];
    const url = this.calendarService.generateGoogleCalendarUrl(firstHabit);
    
    if (habits.length === 1) {
      window.open(url, '_blank');
    } else {
      alert(`Opening Google Calendar for your first habit: "${firstHabit.name}"\n\nFor multiple habits, consider downloading the .ics file instead.`);
      window.open(url, '_blank');
    }
  }

  private exportToICS(): void {
    const habits = this.habitService.habits();
    this.calendarService.downloadICS(habits, 'my-habits.ics');
  }
}
