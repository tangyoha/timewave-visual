
import { format, subMinutes, subHours, subDays, parse, isValid } from 'date-fns';

export type TimeRange = {
  label: string;
  value: string;
  duration: number; // in milliseconds
};

export const TIME_RANGES: TimeRange[] = [
  { label: '5m', value: '5m', duration: 5 * 60 * 1000 },
  { label: '15m', value: '15m', duration: 15 * 60 * 1000 },
  { label: '30m', value: '30m', duration: 30 * 60 * 1000 },
  { label: '1h', value: '1h', duration: 60 * 60 * 1000 },
  { label: '3h', value: '3h', duration: 3 * 60 * 60 * 1000 },
  { label: '6h', value: '6h', duration: 6 * 60 * 60 * 1000 },
  { label: '12h', value: '12h', duration: 12 * 60 * 60 * 1000 },
  { label: '1d', value: '1d', duration: 24 * 60 * 60 * 1000 },
  { label: '3d', value: '3d', duration: 3 * 24 * 60 * 60 * 1000 },
  { label: '7d', value: '7d', duration: 7 * 24 * 60 * 60 * 1000 },
  { label: '30d', value: '30d', duration: 30 * 24 * 60 * 60 * 1000 },
];

export const REFRESH_INTERVALS = [
  { label: 'Off', value: 0 },
  { label: '5s', value: 5 },
  { label: '10s', value: 10 },
  { label: '30s', value: 30 },
  { label: '1m', value: 60 },
  { label: '5m', value: 300 },
  { label: '15m', value: 900 },
  { label: '30m', value: 1800 },
  { label: '1h', value: 3600 },
];

export const TIME_PRECISION = [
  { label: 'Second', value: 'second' },
  { label: 'Minute', value: 'minute' },
  { label: 'Hour', value: 'hour' },
  { label: 'Day', value: 'day' },
];

export function getTimeRangeFromValue(value: string): [Date, Date] {
  const now = new Date();
  let start: Date;

  if (value.endsWith('m')) {
    const minutes = parseInt(value.replace('m', ''));
    start = subMinutes(now, minutes);
  } else if (value.endsWith('h')) {
    const hours = parseInt(value.replace('h', ''));
    start = subHours(now, hours);
  } else if (value.endsWith('d')) {
    const days = parseInt(value.replace('d', ''));
    start = subDays(now, days);
  } else {
    // Default to 1h if invalid
    start = subHours(now, 1);
  }

  return [start, now];
}

export function formatTimeForDisplay(date: Date, precision: string = 'second'): string {
  switch (precision) {
    case 'second':
      return format(date, 'HH:mm:ss');
    case 'minute':
      return format(date, 'HH:mm');
    case 'hour':
      return format(date, 'HH:00');
    case 'day':
      return format(date, 'MMM dd');
    default:
      return format(date, 'HH:mm:ss');
  }
}

export function formatDateTimeForInput(date: Date): string {
  return format(date, "yyyy-MM-dd'T'HH:mm");
}

export function parseInputDateTime(input: string): Date | null {
  const parsedDate = parse(input, "yyyy-MM-dd'T'HH:mm", new Date());
  return isValid(parsedDate) ? parsedDate : null;
}

export function formatAbsoluteTime(date: Date): string {
  return format(date, 'yyyy-MM-dd HH:mm:ss');
}

export function formatDuration(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}d ${hours % 24}h`;
  } else if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}
