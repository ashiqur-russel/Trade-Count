import { monthLabel, monthWeeks } from './month-grid';

describe('monthWeeks', () => {
  it('starts on the Monday on or before the 1st and ends on a Sunday', () => {
    const weeks = monthWeeks(2026, 9); // October 2026 starts on a Thursday

    expect(weeks[0].map((d) => d.iso)).toEqual([
      '2026-09-28',
      '2026-09-29',
      '2026-09-30',
      '2026-10-01',
      '2026-10-02',
      '2026-10-03',
      '2026-10-04',
    ]);
    expect(weeks.at(-1)!.at(-1)!.iso).toBe('2026-11-01');
    expect(weeks.flat().filter((d) => d.inMonth)).toHaveLength(31);
  });

  it('needs no padding when the month starts on a Monday', () => {
    expect(monthWeeks(2026, 5)[0][0].iso).toBe('2026-06-01');
  });

  it('labels the month in words', () => {
    expect(monthLabel(2026, 9)).toBe('October 2026');
  });
});
