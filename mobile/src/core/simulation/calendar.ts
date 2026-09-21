import { TEMPORAL_CONFIG } from './temporal-config';

export interface CalendarDate {
  year: number;
  month: number;
  day: number;
  dayOfYear: number;
}

export function getCalendarDate(tick: number): CalendarDate {
  // Tick 0 is Year 1, Month 1, Day 1
  const dpy = TEMPORAL_CONFIG.DAYS_PER_YEAR;
  const dpm = TEMPORAL_CONFIG.DAYS_PER_MONTH;

  const year = Math.floor(tick / dpy) + 1;
  const remainder = tick % dpy;
  
  const month = Math.floor(remainder / dpm) + 1;
  const day = (remainder % dpm) + 1;
  const dayOfYear = remainder + 1;

  return { year, month, day, dayOfYear };
}

export function isStartOfMonth(tick: number): boolean {
  return (tick % TEMPORAL_CONFIG.DAYS_PER_MONTH) === 0;
}

export function isStartOfYear(tick: number): boolean {
  return (tick % TEMPORAL_CONFIG.DAYS_PER_YEAR) === 0;
}
