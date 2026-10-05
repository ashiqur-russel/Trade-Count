/** Differences smaller than this are normal between healthy devices and not worth mentioning. */
export const CLOCK_WARNING_MS = 2 * 60_000;

/** What to tell the user when their device's clock is off, or null when it is close enough. */
export function clockWarningMessage(offsetMs: number | null): string | null {
  if (offsetMs === null || Math.abs(offsetMs) < CLOCK_WARNING_MS) return null;
  const direction = offsetMs < 0 ? 'ahead of' : 'behind';
  return (
    `This device's clock is about ${describeDuration(Math.abs(offsetMs))} ${direction} the correct time. ` +
    'Check the date and time in your device settings; until then, changes made here may be ordered wrongly ' +
    'against your other devices.'
  );
}

function describeDuration(ms: number): string {
  const minutes = Math.round(ms / 60_000);
  if (minutes < 120) return `${minutes} minutes`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours} hours`;
  return `${Math.round(hours / 24)} days`;
}
