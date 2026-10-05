import { isoDate } from '../../dates/iso-date';

export interface CalendarDay {
  iso: string;
  day: number;
  inMonth: boolean;
}

/** The weeks shown for a month, Monday first, padded with days from the neighbouring months. */
export function monthWeeks(year: number, monthIndex: number): CalendarDay[][] {
  const first = new Date(Date.UTC(year, monthIndex, 1));
  const mondayOffset = (first.getUTCDay() + 6) % 7;
  const daysInMonth = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  const cellCount = Math.ceil((mondayOffset + daysInMonth) / 7) * 7;

  const weeks: CalendarDay[][] = [];
  for (let cell = 0; cell < cellCount; cell++) {
    const date = new Date(Date.UTC(year, monthIndex, 1 - mondayOffset + cell));
    if (cell % 7 === 0) weeks.push([]);
    weeks[weeks.length - 1].push({
      iso: isoDate(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
      day: date.getUTCDate(),
      inMonth: date.getUTCMonth() === ((monthIndex % 12) + 12) % 12,
    });
  }
  return weeks;
}

const monthFormat = new Intl.DateTimeFormat('en-GB', {
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});

export function monthLabel(year: number, monthIndex: number): string {
  return monthFormat.format(new Date(Date.UTC(year, monthIndex, 1)));
}

export const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'] as const;
