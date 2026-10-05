/** Calendar dates as `YYYY-MM-DD` strings, computed in UTC so time zones never shift a day. */

export function isoDate(year: number, monthIndex: number, day: number): string {
  return new Date(Date.UTC(year, monthIndex, day)).toISOString().slice(0, 10);
}

export function parseIsoDate(iso: string): { year: number; monthIndex: number; day: number } {
  const [year, month, day] = iso.split('-').map(Number);
  return { year, monthIndex: month - 1, day };
}

export function addDays(iso: string, days: number): string {
  const { year, monthIndex, day } = parseIsoDate(iso);
  return isoDate(year, monthIndex, day + days);
}

/** Same day in another month, clamped to that month's last day (31 Jan + 1 month → 28/29 Feb). */
export function addMonths(iso: string, months: number): string {
  const { year, monthIndex, day } = parseIsoDate(iso);
  const lastDay = new Date(Date.UTC(year, monthIndex + months + 1, 0)).getUTCDate();
  return isoDate(year, monthIndex + months, Math.min(day, lastDay));
}

/** Today's date in the user's time zone. */
export function todayIsoDate(now = new Date()): string {
  return isoDate(now.getFullYear(), now.getMonth(), now.getDate());
}

/** `2026-10-05` → `05.10.2026` */
export function formatIsoDate(iso: string): string {
  const [year, month, day] = iso.split('-');
  return `${day}.${month}.${year}`;
}
