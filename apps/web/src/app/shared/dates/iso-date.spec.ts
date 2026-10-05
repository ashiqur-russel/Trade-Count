import { addDays, addMonths, formatIsoDate, isoDate, todayIsoDate } from './iso-date';

describe('iso-date', () => {
  it('isoDate rolls overflowing days into the next month', () => {
    expect(isoDate(2026, 0, 32)).toBe('2026-02-01');
  });

  it('addDays crosses month and year boundaries', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('addMonths clamps to the last day of shorter months', () => {
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28');
    expect(addMonths('2028-01-31', 1)).toBe('2028-02-29');
    expect(addMonths('2026-01-15', -1)).toBe('2025-12-15');
  });

  it('todayIsoDate uses the local calendar date', () => {
    expect(todayIsoDate(new Date(2026, 9, 5, 23, 30))).toBe('2026-10-05');
  });

  it('formatIsoDate writes German dd.mm.yyyy', () => {
    expect(formatIsoDate('2026-10-05')).toBe('05.10.2026');
  });
});
