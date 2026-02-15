import { Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonList, IonItem,
  IonLabel, IonCheckbox, IonBadge, IonNote, IonIcon, IonChip,
  IonModal, IonButton, IonButtons, IonTextarea, IonBackButton,
} from '@ionic/angular/standalone';
import { HabitService } from '../../services/habit.service';
import { SpotifyIntegrationService } from '../../services/spotify-integration.service';
import { HabitCategory, ALL_CATEGORIES, CATEGORY_COLORS, MOOD_EMOJIS, MoodEmoji } from '../../models/habit.model';
import { addIcons } from 'ionicons';
import { flameOutline, trophyOutline, closeOutline, checkmarkOutline, playOutline, ellipsisHorizontalOutline, chevronBackOutline, chevronForwardOutline } from 'ionicons/icons';

@Component({
  selector: 'app-today',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    IonHeader, IonToolbar, IonTitle, IonContent,
    IonList, IonItem, IonLabel, IonCheckbox, IonBadge, IonNote, IonIcon,
    IonChip, IonModal, IonButton, IonButtons,
    IonTextarea, IonBackButton,
  ],
  template: `
    <ion-header translucent="true">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/today"></ion-back-button>
        </ion-buttons>
        <ion-title>Today</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="selectMode.set(!selectMode())" [class.active-select]="selectMode()">
            {{ selectMode() ? 'Done' : 'Select' }}
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content [fullscreen]="true" class="ion-padding">
      <!-- Activity Calendar -->
      <div class="calendar-section">
        <div class="calendar-header">
          <button class="cal-nav" (click)="prevMonth()">
            <ion-icon name="chevron-back-outline"></ion-icon>
          </button>
          <h2 class="cal-title">{{ calendarMonthLabel() }}</h2>
          <button class="cal-nav" (click)="nextMonth()">
            <ion-icon name="chevron-forward-outline"></ion-icon>
          </button>
        </div>
        <div class="calendar-weekdays">
          @for (d of weekdays; track d) {
            <span class="cal-weekday">{{ d }}</span>
          }
        </div>
        <div class="calendar-grid">
          @for (day of calendarDays(); track $index) {
            <div class="cal-cell" [class.today-cell]="day.isToday" [class.future]="day.isFuture" [class.other-month]="!day.inMonth">
              @if (day.inMonth) {
                <svg viewBox="0 0 36 36" class="ring-svg">
                  <circle cx="18" cy="18" r="14" fill="none" stroke="var(--card-border)" stroke-width="3" opacity="0.3"/>
                  @if (day.rate > 0) {
                    <circle cx="18" cy="18" r="14"
                      fill="none"
                      stroke="#FF6B4A"
                      stroke-width="3"
                      stroke-linecap="round"
                      [attr.stroke-dasharray]="getRingDash(day.rate)"
                      stroke-dashoffset="0"
                      transform="rotate(-90 18 18)"
                      [style.opacity]="day.isFuture ? 0.2 : 1"
                    />
                  }
                </svg>
                <span class="cal-day-num">{{ day.day }}</span>
              }
            </div>
          }
        </div>
      </div>

      <!-- Header -->
      <div class="today-header">
        <p class="greeting">{{ greeting }}</p>
        <h1 class="today-title">{{ todayFormatted }}</h1>
      </div>

      <!-- Progress Bar -->
      @if (totalCount() > 0) {
        <div class="progress-section">
          <div class="progress-info">
            <span class="progress-label">{{ completedCount() }}/{{ totalCount() }} completed</span>
            <span class="progress-pct">{{ completionPct() }}%</span>
          </div>
          <div class="progress-track">
            <div class="progress-fill" [style.width.%]="completionPct()"></div>
          </div>
        </div>
      }

      <!-- XP Bar -->
      <div class="xp-section">
        <div class="xp-info">
          <span class="xp-label">Level {{ profile().level }}</span>
          <span class="xp-value">{{ profile().xp }} XP</span>
        </div>
        <div class="xp-track">
          <div class="xp-fill" [style.width.%]="xpProgress()"></div>
        </div>
      </div>

      @if (completionPct() === 100 && totalCount() > 0) {
        <div class="perfect-day">
          ⭐ Perfect day — you crushed it!
        </div>
      }

      <!-- Category Filter (only if 3+ categories in use) -->
      @if (usedCategories().length >= 3) {
        <div class="filter-pills">
          <button (click)="selectedCategory.set(null)"
                  class="pill"
                  [class.active]="!selectedCategory()">
            All
          </button>
          @for (cat of usedCategories(); track cat) {
            <button (click)="selectedCategory.set(cat)"
                    class="pill"
                    [class.active]="selectedCategory() === cat">
              {{ cat }}
            </button>
          }
        </div>
      }

      @if (filteredHabits().length === 0) {
        <div class="empty-state">
          <div class="empty-icon">🌅</div>
          <p class="empty-text">
            No habits for today. Head to Habits to start!
          </p>
        </div>
      }

      <!-- Habit Cards -->
      <div class="habit-list">
        @for (habit of filteredHabits(); track habit.id; let i = $index) {
          <div class="habit-card"
               [class.completed]="isCompleted(habit.id)"
               [style.animation-delay]="(i * 0.04) + 's'">
            <div class="card-accent" [style.background]="getCatColor(habit.category)"></div>
            <div class="card-body">
              <!-- Select mode checkbox -->
              @if (selectMode() && !isCompleted(habit.id)) {
                <label class="batch-check" (click)="$event.stopPropagation()">
                  <input type="checkbox" [checked]="selectedIds().has(habit.id)" (change)="toggleSelect(habit.id)"/>
                  <span class="batch-box"></span>
                </label>
              }
              <div class="card-info" (click)="onCardTap(habit.id)">
                <h3 class="habit-name" [class.done]="isCompleted(habit.id)">{{ habit.name }}</h3>
                @if (habit.description) {
                  <p class="habit-desc">{{ habit.description }}</p>
                }
                @if (getCompletion(habit.id)?.mood) {
                  <span class="mood-display">{{ getCompletion(habit.id)?.mood }}</span>
                }
              </div>
              <div class="card-right">
                <!-- Detail button for mood/note -->
                <button class="detail-btn" (click)="openMoodModal(habit.id, $event)" title="Add mood & note">
                  <ion-icon name="ellipsis-horizontal-outline"></ion-icon>
                </button>
                @if (habit.spotifyPlaylistUrl) {
                  <button class="spotify-btn" (click)="playSpotify(habit.spotifyPlaylistUrl, $event)">
                    <ion-icon name="play-outline"></ion-icon>
                  </button>
                }
                @if (getStreak(habit.id) > 0) {
                  <div class="streak-badge">
                    <span>🔥</span>
                    <span>{{ getStreak(habit.id) }}</span>
                  </div>
                }
                <div class="habit-checkbox check-circle"
                     [class.checked]="isCompleted(habit.id)"
                     [style.border-color]="isCompleted(habit.id) ? getCatColor(habit.category) : ''"
                     [style.background]="isCompleted(habit.id) ? getCatColor(habit.category) : ''"
                     (click)="onCheckCircleTap(habit.id, $event)">
                  @if (isCompleted(habit.id)) {
                    <svg fill="none" stroke="#fff" stroke-width="3" viewBox="0 0 24 24" width="16" height="16">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
                    </svg>
                  }
                </div>
              </div>
            </div>
          </div>
        }
      </div>

      <!-- Batch complete FAB -->
      @if (selectMode() && selectedIds().size > 0) {
        <div class="batch-fab">
          <button class="batch-complete-btn" (click)="batchComplete()">
            Complete Selected ({{ selectedIds().size }})
          </button>
        </div>
      }

      <div style="height: 80px;"></div>

      <!-- Mood/Note Modal -->
      <ion-modal [isOpen]="showMoodModal()" (didDismiss)="showMoodModal.set(false)">
        <ng-template>
          <ion-header translucent="true">
            <ion-toolbar>
              <ion-buttons slot="start">
                <ion-button (click)="showMoodModal.set(false)">
                  <ion-icon name="close-outline"></ion-icon>
                </ion-button>
              </ion-buttons>
              <ion-title>How are you feeling?</ion-title>
              <ion-buttons slot="end">
                <ion-button (click)="saveMood()">
                  <ion-icon name="checkmark-outline"></ion-icon>
                </ion-button>
              </ion-buttons>
            </ion-toolbar>
          </ion-header>
          <ion-content class="ion-padding">
            <div class="mood-picker">
              @for (emoji of moodEmojis; track emoji) {
                <button class="mood-btn"
                        [class.selected]="selectedMood === emoji"
                        (click)="selectedMood = emoji">
                  {{ emoji }}
                </button>
              }
            </div>
            <ion-item>
              <ion-textarea
                label="Note (optional)"
                labelPlacement="stacked"
                placeholder="How did it go?"
                [(ngModel)]="completionNote"
                [rows]="3"
              ></ion-textarea>
            </ion-item>
          </ion-content>
        </ng-template>
      </ion-modal>
    </ion-content>
  `,
  styles: [`
    :host { display: block; }

    /* ─── Activity Calendar ─────────────────────────────── */
    .calendar-section {
      margin-bottom: 24px;
      padding: 16px;
      border-radius: 16px;
      background: var(--card-bg);
      animation: slide-up 0.4s ease-out;
    }
    .calendar-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 12px;
    }
    .cal-title {
      font-family: 'Sora', sans-serif;
      font-size: 1rem;
      font-weight: 700;
      margin: 0;
    }
    .cal-nav {
      background: none;
      border: none;
      color: #FF6B4A;
      font-size: 1.2rem;
      cursor: pointer;
      padding: 4px 8px;
      border-radius: 8px;
      display: flex;
      align-items: center;
    }
    .cal-nav:active { opacity: 0.6; }
    .calendar-weekdays {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      margin-bottom: 4px;
    }
    .cal-weekday {
      text-align: center;
      font-family: 'DM Sans', sans-serif;
      font-size: 0.65rem;
      font-weight: 600;
      color: var(--text-muted);
      text-transform: uppercase;
    }
    .calendar-grid {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      gap: 2px;
    }
    .cal-cell {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      aspect-ratio: 1;
      padding: 2px;
    }
    .cal-cell.other-month { visibility: hidden; }
    .cal-cell.future .cal-day-num { color: var(--text-muted); opacity: 0.4; }
    .cal-cell.today-cell .cal-day-num {
      font-weight: 800;
      color: #FF6B4A;
    }
    .ring-svg {
      position: absolute;
      width: 100%;
      height: 100%;
    }
    .cal-day-num {
      position: relative;
      font-family: 'DM Sans', sans-serif;
      font-size: 0.7rem;
      font-weight: 600;
      color: var(--text-secondary);
      z-index: 1;
    }

    /* ─── Header ────────────────────────────────────────── */
    .today-header {
      margin-bottom: 20px;
      animation: slide-up 0.4s ease-out;
    }
    .greeting {
      font-family: 'DM Sans', sans-serif;
      font-size: 0.9rem;
      font-weight: 500;
      color: var(--text-muted);
      margin-bottom: 4px;
    }
    .today-title {
      font-family: 'Sora', sans-serif;
      font-size: 1.6rem;
      font-weight: 700;
      letter-spacing: -0.02em;
    }

    /* Progress */
    .progress-section {
      margin-bottom: 16px;
      animation: slide-up 0.4s ease-out 0.05s both;
    }
    .progress-info {
      display: flex;
      justify-content: space-between;
      margin-bottom: 8px;
    }
    .progress-label {
      font-size: 0.85rem;
      font-weight: 500;
      color: var(--text-secondary);
    }
    .progress-pct {
      font-family: 'Sora', sans-serif;
      font-size: 0.85rem;
      font-weight: 700;
      color: #FF6B4A;
    }
    .progress-track {
      height: 8px;
      border-radius: 4px;
      background: var(--card-bg);
      overflow: hidden;
    }
    .progress-fill {
      height: 100%;
      border-radius: 4px;
      background: linear-gradient(90deg, #FF6B4A, #FF8F6B);
      transition: width 0.6s ease-out;
    }

    /* XP */
    .xp-section {
      margin-bottom: 20px;
      animation: slide-up 0.4s ease-out 0.1s both;
    }
    .xp-info {
      display: flex;
      justify-content: space-between;
      margin-bottom: 6px;
    }
    .xp-label {
      font-size: 0.8rem;
      font-weight: 500;
      color: var(--text-muted);
    }
    .xp-value {
      font-family: 'Sora', sans-serif;
      font-size: 0.8rem;
      font-weight: 600;
      color: var(--text-secondary);
    }
    .xp-track {
      height: 6px;
      border-radius: 3px;
      background: var(--card-bg);
      overflow: hidden;
    }
    .xp-fill {
      height: 100%;
      border-radius: 3px;
      background: #4ADE80;
      transition: width 0.6s ease-out;
    }

    .perfect-day {
      text-align: center;
      padding: 12px 16px;
      margin-bottom: 20px;
      border-radius: 12px;
      font-family: 'Sora', sans-serif;
      font-size: 0.85rem;
      font-weight: 600;
      background: rgba(255, 107, 74, 0.1);
      color: #FF6B4A;
      animation: fade-in 0.4s ease-out;
    }

    /* Filter Pills */
    .filter-pills {
      display: flex;
      gap: 8px;
      margin-bottom: 20px;
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
      scrollbar-width: none;
      animation: slide-up 0.4s ease-out 0.1s both;
    }
    .filter-pills::-webkit-scrollbar { display: none; }
    .pill {
      padding: 8px 16px;
      border-radius: 100px;
      font-family: 'DM Sans', sans-serif;
      font-size: 0.82rem;
      font-weight: 600;
      white-space: nowrap;
      background: var(--card-bg);
      color: var(--text-muted);
      border: 1px solid var(--card-border);
      transition: all 0.2s ease-out;
      cursor: pointer;
    }
    .pill.active {
      background: #FF6B4A;
      color: #ffffff;
      border-color: #FF6B4A;
    }

    /* Empty State */
    .empty-state {
      text-align: center;
      padding: 48px 16px;
      animation: fade-in 0.4s ease-out;
    }
    .empty-icon { font-size: 3rem; margin-bottom: 12px; }
    .empty-text {
      font-size: 0.95rem;
      color: var(--text-muted);
    }

    /* Habit List */
    .habit-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    /* Habit Card */
    .habit-card {
      display: flex;
      border-radius: 14px;
      background: var(--card-bg);
      overflow: hidden;
      transition: opacity 0.3s ease-out, transform 0.2s ease-out;
      animation: slide-up 0.4s ease-out both;
    }
    .habit-card.completed {
      opacity: 0.55;
    }
    .habit-card:active {
      transform: scale(0.99);
    }
    .card-accent {
      width: 4px;
      flex-shrink: 0;
    }
    .card-body {
      flex: 1;
      display: flex;
      align-items: center;
      padding: 14px 16px;
      gap: 12px;
      cursor: pointer;
      min-height: 56px;
    }
    .card-info {
      flex: 1;
      min-width: 0;
    }
    .habit-name {
      font-family: 'Sora', sans-serif;
      font-size: 0.95rem;
      font-weight: 600;
      letter-spacing: -0.01em;
      margin: 0;
      transition: color 0.2s ease-out;
    }
    .habit-name.done {
      text-decoration: line-through;
      color: var(--text-muted);
    }
    .habit-desc {
      font-size: 0.82rem;
      color: var(--text-muted);
      margin: 2px 0 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .mood-display {
      font-size: 1rem;
      margin-top: 2px;
      display: inline-block;
    }

    .card-right {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-shrink: 0;
    }

    /* Detail (ellipsis) button */
    .detail-btn {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: transparent;
      border: 1px solid var(--card-border);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s ease-out;
      flex-shrink: 0;
      color: var(--text-muted);
    }
    .detail-btn ion-icon { font-size: 14px; }
    .detail-btn:active { background: rgba(255,107,74,0.1); }

    /* Spotify Button */
    .spotify-btn {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: linear-gradient(135deg, #1DB954, #1ED760);
      border: none;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s ease-out;
      flex-shrink: 0;
    }
    .spotify-btn ion-icon {
      font-size: 16px;
      color: white;
      margin-left: 1px;
    }
    .spotify-btn:active {
      transform: scale(0.95);
    }

    /* Streak */
    .streak-badge {
      display: flex;
      align-items: center;
      gap: 3px;
      font-family: 'Sora', sans-serif;
      font-size: 0.78rem;
      font-weight: 700;
      color: #FF6B4A;
    }

    /* Check Circle */
    .check-circle {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      border: 2px solid var(--card-border);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease-out;
      flex-shrink: 0;
    }
    .check-circle.checked {
      border-color: transparent;
      transform: scale(1.05);
    }

    /* Batch select checkbox */
    .batch-check {
      display: flex;
      align-items: center;
      cursor: pointer;
      flex-shrink: 0;
    }
    .batch-check input { display: none; }
    .batch-box {
      width: 22px;
      height: 22px;
      border-radius: 6px;
      border: 2px solid var(--card-border);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
    }
    .batch-check input:checked + .batch-box {
      background: #FF6B4A;
      border-color: #FF6B4A;
    }
    .batch-check input:checked + .batch-box::after {
      content: '✓';
      color: white;
      font-size: 13px;
      font-weight: 700;
    }

    /* Batch complete floating button */
    .batch-fab {
      position: fixed;
      bottom: 80px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 100;
      animation: fade-in 0.2s ease-out;
    }
    .batch-complete-btn {
      padding: 14px 28px;
      border-radius: 100px;
      background: #FF6B4A;
      color: white;
      font-family: 'Sora', sans-serif;
      font-size: 0.9rem;
      font-weight: 700;
      border: none;
      cursor: pointer;
      box-shadow: 0 4px 20px rgba(255, 107, 74, 0.4);
      transition: all 0.2s;
    }
    .batch-complete-btn:active { transform: scale(0.97); }

    /* Select mode toolbar button */
    .active-select {
      color: #FF6B4A !important;
      font-weight: 700 !important;
    }

    /* Mood Picker */
    .mood-picker {
      display: flex;
      justify-content: center;
      gap: 12px;
      margin: 32px 0;
    }
    .mood-btn {
      font-size: 2.2rem;
      padding: 12px;
      border-radius: 16px;
      background: var(--card-bg);
      border: 2px solid transparent;
      transition: all 0.2s ease-out;
      cursor: pointer;
    }
    .mood-btn.selected {
      background: rgba(255, 107, 74, 0.1);
      border-color: #FF6B4A;
      transform: scale(1.08);
    }

    @keyframes fade-in {
      from { opacity: 0; } to { opacity: 1; }
    }
  `],
})
export class TodayPage {
  today = new Date();
  todayStr: string;
  todayFormatted: string;
  greeting: string;
  categories = ALL_CATEGORIES;
  moodEmojis = MOOD_EMOJIS;
  weekdays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  selectedCategory = signal<HabitCategory | null>(null);
  showMoodModal = signal(false);
  selectedMood: MoodEmoji | undefined;
  completionNote = '';
  private pendingHabitId = '';

  // Multi-select
  selectMode = signal(false);
  selectedIds = signal<Set<string>>(new Set());

  // Calendar
  calendarMonth = signal(new Date());

  profile = computed(() => this.habitService.profile());
  xpProgress = computed(() => (this.profile().xp % 100));

  dueHabits = computed(() => this.habitService.getHabitsForDate(this.today));
  usedCategories = computed(() => {
    const cats = new Set(this.dueHabits().map(h => h.category));
    return ALL_CATEGORIES.filter(c => cats.has(c));
  });
  filteredHabits = computed(() => {
    const cat = this.selectedCategory();
    const habits = this.dueHabits();
    return cat ? habits.filter(h => h.category === cat) : habits;
  });
  completedCount = computed(() =>
    this.dueHabits().filter(h => this.habitService.isCompleted(h.id, this.todayStr)).length
  );
  totalCount = computed(() => this.dueHabits().length);
  completionPct = computed(() => {
    const total = this.totalCount();
    return total === 0 ? 0 : Math.round((this.completedCount() / total) * 100);
  });

  calendarMonthLabel = computed(() => {
    const d = this.calendarMonth();
    return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  });

  calendarDays = computed(() => {
    // Force reactivity on completions
    this.habitService.completions();

    const m = this.calendarMonth();
    const year = m.getFullYear();
    const month = m.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const todayStr = this.habitService.getDateStr(this.today);
    const cells: { day: number; rate: number; isToday: boolean; isFuture: boolean; inMonth: boolean }[] = [];

    // Pad start
    for (let i = 0; i < firstDay; i++) {
      cells.push({ day: 0, rate: 0, isToday: false, isFuture: false, inMonth: false });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      const dateStr = this.habitService.getDateStr(date);
      const isToday = dateStr === todayStr;
      const isFuture = date > this.today && !isToday;
      const rate = isFuture ? 0 : this.habitService.getCompletionRateForDate(date);
      cells.push({ day: d, rate, isToday, isFuture, inMonth: true });
    }

    return cells;
  });

  constructor(
    private habitService: HabitService,
    private spotifyService: SpotifyIntegrationService
  ) {
    addIcons({ flameOutline, trophyOutline, closeOutline, checkmarkOutline, playOutline, ellipsisHorizontalOutline, chevronBackOutline, chevronForwardOutline });
    this.todayStr = habitService.getDateStr();
    this.todayFormatted = this.today.toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric',
    });
    habitService.requestNotificationPermission();

    const hour = this.today.getHours();
    if (hour < 6) this.greeting = 'Late night session 🌙';
    else if (hour < 12) this.greeting = 'Good morning ☀️';
    else if (hour < 17) this.greeting = 'Good afternoon 💪';
    else if (hour < 21) this.greeting = 'Good evening 🔥';
    else this.greeting = 'Wrapping up the day 🌙';
  }

  getCatColor(cat: HabitCategory): string { return CATEGORY_COLORS[cat]; }

  isCompleted(habitId: string): boolean {
    return this.habitService.isCompleted(habitId, this.todayStr);
  }

  getCompletion(habitId: string) {
    return this.habitService.getCompletion(habitId, this.todayStr);
  }

  // Quick complete: single tap on card body = instant complete (no modal)
  onCardTap(habitId: string): void {
    if (this.selectMode() && !this.isCompleted(habitId)) {
      this.toggleSelect(habitId);
      return;
    }
    if (!this.isCompleted(habitId)) {
      this.habitService.toggleCompletion(habitId, this.todayStr);
    }
  }

  // Check circle tap = uncomplete if completed
  onCheckCircleTap(habitId: string, event: Event): void {
    event.stopPropagation();
    if (this.isCompleted(habitId)) {
      this.habitService.toggleCompletion(habitId, this.todayStr);
    } else {
      // Also allow completing via check circle
      this.habitService.toggleCompletion(habitId, this.todayStr);
    }
  }

  // Detail button opens mood modal
  openMoodModal(habitId: string, event: Event): void {
    event.stopPropagation();
    this.pendingHabitId = habitId;
    const existing = this.getCompletion(habitId);
    this.selectedMood = existing?.mood;
    this.completionNote = existing?.note || '';
    this.showMoodModal.set(true);
  }

  saveMood(): void {
    const isAlreadyCompleted = this.isCompleted(this.pendingHabitId);
    if (isAlreadyCompleted) {
      // Update mood/note on existing completion
      this.habitService.updateCompletionMeta(this.pendingHabitId, this.todayStr, this.completionNote || undefined, this.selectedMood);
    } else {
      // Complete with mood/note
      this.habitService.toggleCompletion(this.pendingHabitId, this.todayStr, this.completionNote || undefined, this.selectedMood);
    }
    this.showMoodModal.set(false);
  }

  getStreak(habitId: string): number {
    return this.habitService.getStats(habitId).currentStreak;
  }

  // ─── Multi-Select ───────────────────────────────────────
  toggleSelect(habitId: string): void {
    this.selectedIds.update(set => {
      const next = new Set(set);
      if (next.has(habitId)) next.delete(habitId);
      else next.add(habitId);
      return next;
    });
  }

  batchComplete(): void {
    for (const id of this.selectedIds()) {
      if (!this.isCompleted(id)) {
        this.habitService.toggleCompletion(id, this.todayStr);
      }
    }
    this.selectedIds.set(new Set());
    this.selectMode.set(false);
  }

  // ─── Calendar Navigation ───────────────────────────────
  prevMonth(): void {
    this.calendarMonth.update(d => {
      const n = new Date(d);
      n.setMonth(n.getMonth() - 1);
      return n;
    });
  }

  nextMonth(): void {
    this.calendarMonth.update(d => {
      const n = new Date(d);
      n.setMonth(n.getMonth() + 1);
      return n;
    });
  }

  getRingDash(rate: number): string {
    const circumference = 2 * Math.PI * 14; // r=14
    const filled = circumference * rate;
    return `${filled} ${circumference}`;
  }

  // ─── Spotify Integration ────────────────────────────────
  playSpotify(spotifyUrl: string, event: Event): void {
    event.stopPropagation();
    this.spotifyService.openInSpotify(spotifyUrl);
  }
}
