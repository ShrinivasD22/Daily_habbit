import { Injectable } from '@angular/core';
import { Habit } from '../models/habit.model';

export interface CalendarEvent {
  title: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  isAllDay: boolean;
  recurrenceRule?: string;
  categories?: string[];
}

@Injectable({ providedIn: 'root' })
export class CalendarIntegrationService {
  
  constructor() {}

  // ─── ICS Generation ─────────────────────────────────────────
  generateICS(habits: Habit[]): string {
    const events = this.convertHabitsToEvents(habits);
    return this.generateICSFromEvents(events);
  }

  generateHabitICS(habit: Habit): string {
    const events = this.convertHabitsToEvents([habit]);
    return this.generateICSFromEvents(events);
  }

  private generateICSFromEvents(events: CalendarEvent[]): string {
    const now = new Date();
    const icsLines: string[] = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Habit Tracker//Habit Tracker App//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH'
    ];

    events.forEach((event, index) => {
      icsLines.push('BEGIN:VEVENT');
      icsLines.push(`UID:habit-${index}-${now.getTime()}@habittracker.app`);
      icsLines.push(`DTSTAMP:${this.formatICSDate(now)}`);
      icsLines.push(`DTSTART:${this.formatICSDate(event.startDate)}`);
      icsLines.push(`DTEND:${this.formatICSDate(event.endDate)}`);
      icsLines.push(`SUMMARY:${this.escapeICSText(event.title)}`);
      
      if (event.description) {
        icsLines.push(`DESCRIPTION:${this.escapeICSText(event.description)}`);
      }
      
      if (event.recurrenceRule) {
        icsLines.push(`RRULE:${event.recurrenceRule}`);
      }
      
      if (event.categories && event.categories.length > 0) {
        icsLines.push(`CATEGORIES:${event.categories.join(',')}`);
      }
      
      icsLines.push('BEGIN:VALARM');
      icsLines.push('TRIGGER:-PT15M');
      icsLines.push('ACTION:DISPLAY');
      icsLines.push(`DESCRIPTION:Reminder: ${this.escapeICSText(event.title)}`);
      icsLines.push('END:VALARM');
      
      icsLines.push('END:VEVENT');
    });

    icsLines.push('END:VCALENDAR');
    
    return icsLines.join('\r\n');
  }

  private convertHabitsToEvents(habits: Habit[]): CalendarEvent[] {
    const events: CalendarEvent[] = [];
    const now = new Date();
    
    habits.forEach(habit => {
      const baseEvent: Partial<CalendarEvent> = {
        title: habit.name,
        description: habit.description || `Complete your ${habit.name} habit`,
        categories: [habit.category],
        isAllDay: false
      };

      // Set event time
      if (habit.reminderTime) {
        const [hours, minutes] = habit.reminderTime.split(':').map(Number);
        const eventStart = new Date(now);
        eventStart.setHours(hours, minutes, 0, 0);
        const eventEnd = new Date(eventStart);
        eventEnd.setMinutes(eventStart.getMinutes() + 30); // 30-minute slot
        
        baseEvent.startDate = eventStart;
        baseEvent.endDate = eventEnd;
      } else {
        // Default to 9:00 AM if no time set
        const eventStart = new Date(now);
        eventStart.setHours(9, 0, 0, 0);
        const eventEnd = new Date(eventStart);
        eventEnd.setMinutes(eventStart.getMinutes() + 30);
        
        baseEvent.startDate = eventStart;
        baseEvent.endDate = eventEnd;
      }

      // Generate recurrence rule based on habit schedule
      const recurrenceRule = this.generateRecurrenceRule(habit);
      if (recurrenceRule) {
        baseEvent.recurrenceRule = recurrenceRule;
      }

      events.push(baseEvent as CalendarEvent);
    });

    return events;
  }

  private generateRecurrenceRule(habit: Habit): string | undefined {
    const schedule = habit.schedule;
    
    if (!schedule) {
      // Legacy frequency
      return habit.frequency === 'daily' ? 'FREQ=DAILY' : 'FREQ=WEEKLY';
    }

    switch (schedule.type) {
      case 'daily':
        return 'FREQ=DAILY';
        
      case 'weekly':
        return 'FREQ=WEEKLY';
        
      case 'specific_days':
        if (schedule.daysOfWeek && schedule.daysOfWeek.length > 0) {
          // Convert to RFC format: SU,MO,TU,WE,TH,FR,SA
          const dayMap = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
          const days = schedule.daysOfWeek.map(d => dayMap[d]).join(',');
          return `FREQ=WEEKLY;BYDAY=${days}`;
        }
        return 'FREQ=WEEKLY';
        
      case 'x_per_month':
        // Monthly frequency - let user choose specific days
        return 'FREQ=MONTHLY';
        
      case 'interval':
        if (schedule.intervalDays && schedule.intervalDays > 1) {
          return `FREQ=DAILY;INTERVAL=${schedule.intervalDays}`;
        }
        return 'FREQ=DAILY';
        
      default:
        return 'FREQ=DAILY';
    }
  }

  // ─── Calendar URL Generation ────────────────────────────────
  generateGoogleCalendarUrl(habit: Habit): string {
    const event = this.convertHabitsToEvents([habit])[0];
    if (!event) return '';

    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: event.title,
      details: event.description || '',
      dates: `${this.formatGoogleDate(event.startDate)}/${this.formatGoogleDate(event.endDate)}`,
    });

    // Add recurrence for Google Calendar
    if (event.recurrenceRule) {
      params.set('recur', `RRULE:${event.recurrenceRule}`);
    }

    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  }

  generateOutlookCalendarUrl(habit: Habit): string {
    const event = this.convertHabitsToEvents([habit])[0];
    if (!event) return '';

    const params = new URLSearchParams({
      subject: event.title,
      body: event.description || '',
      startdt: event.startDate.toISOString(),
      enddt: event.endDate.toISOString(),
      allday: event.isAllDay ? 'true' : 'false',
    });

    return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
  }

  generateYahooCalendarUrl(habit: Habit): string {
    const event = this.convertHabitsToEvents([habit])[0];
    if (!event) return '';

    const duration = Math.floor((event.endDate.getTime() - event.startDate.getTime()) / (1000 * 60));
    
    const params = new URLSearchParams({
      v: '60',
      title: event.title,
      st: this.formatYahooDate(event.startDate),
      dur: duration.toString().padStart(4, '0'),
      desc: event.description || '',
    });

    return `https://calendar.yahoo.com/?${params.toString()}`;
  }

  // ─── Export Functions ───────────────────────────────────────
  downloadICS(habits: Habit[], filename?: string): void {
    const icsContent = this.generateICS(habits);
    this.downloadFile(icsContent, filename || 'habits.ics', 'text/calendar');
  }

  downloadHabitICS(habit: Habit): void {
    const icsContent = this.generateHabitICS(habit);
    const filename = `${habit.name.toLowerCase().replace(/\s+/g, '-')}.ics`;
    this.downloadFile(icsContent, filename, 'text/calendar');
  }

  private downloadFile(content: string, filename: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // ─── Bulk Export Options ────────────────────────────────────
  exportAllHabits(habits: Habit[]): void {
    this.downloadICS(habits, 'all-habits.ics');
  }

  exportHabitsByCategory(habits: Habit[], category: string): void {
    const categoryHabits = habits.filter(h => h.category === category);
    const filename = `${category.toLowerCase()}-habits.ics`;
    this.downloadICS(categoryHabits, filename);
  }

  exportActiveHabits(habits: Habit[]): void {
    // Export habits that are scheduled for today or in the future
    const today = new Date();
    const activeHabits = habits.filter(habit => {
      // For simplicity, consider all habits as active
      // In a real implementation, you might check last completion date
      return true;
    });
    this.downloadICS(activeHabits, 'active-habits.ics');
  }

  // ─── Utility Functions ──────────────────────────────────────
  private formatICSDate(date: Date): string {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  }

  private formatGoogleDate(date: Date): string {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  }

  private formatYahooDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}${month}${day}T${hours}${minutes}00`;
  }

  private escapeICSText(text: string): string {
    return text
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '');
  }

  // ─── Calendar Integration Status ────────────────────────────
  isCalendarSupported(): boolean {
    // Check if the device/browser supports calendar integration
    return typeof document !== 'undefined' && 'createElement' in document;
  }

  getAvailableCalendarServices(): string[] {
    return ['Google Calendar', 'Apple Calendar', 'Outlook', 'Yahoo Calendar'];
  }

  // ─── Preview Generation ─────────────────────────────────────
  generateEventPreview(habit: Habit): {
    title: string;
    schedule: string;
    time: string;
    description: string;
  } {
    const event = this.convertHabitsToEvents([habit])[0];
    
    return {
      title: event.title,
      schedule: this.getScheduleDescription(habit),
      time: this.formatTime(event.startDate),
      description: event.description || 'No description'
    };
  }

  private getScheduleDescription(habit: Habit): string {
    const schedule = habit.schedule;
    
    if (!schedule) {
      return habit.frequency === 'daily' ? 'Daily' : 'Weekly';
    }

    switch (schedule.type) {
      case 'daily':
        return 'Every day';
      case 'weekly':
        return 'Weekly';
      case 'specific_days':
        if (schedule.daysOfWeek && schedule.daysOfWeek.length > 0) {
          const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
          const days = schedule.daysOfWeek.map(d => dayNames[d]).join(', ');
          return `Every ${days}`;
        }
        return 'Specific days';
      case 'x_per_month':
        return `${schedule.timesPerMonth} times per month`;
      case 'interval':
        return `Every ${schedule.intervalDays} days`;
      default:
        return 'Custom schedule';
    }
  }

  private formatTime(date: Date): string {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  }
}