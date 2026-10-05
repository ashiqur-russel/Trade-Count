import { clockWarningMessage } from './clock-warning';

describe('clockWarningMessage', () => {
  it('says nothing when the clock is unknown or within normal drift', () => {
    expect(clockWarningMessage(null)).toBeNull();
    expect(clockWarningMessage(0)).toBeNull();
    expect(clockWarningMessage(-90_000)).toBeNull();
  });

  it('says how far and in which direction the clock is off, in minutes, hours or days', () => {
    expect(clockWarningMessage(10 * 60_000)).toContain('about 10 minutes behind the correct time');
    expect(clockWarningMessage(-3 * 3600_000)).toContain('about 3 hours ahead of the correct time');
    expect(clockWarningMessage(-4 * 86_400_000)).toContain(
      'about 4 days ahead of the correct time',
    );
  });

  it('tells the user what to do about it', () => {
    expect(clockWarningMessage(3600_000)).toContain('date and time in your device settings');
  });
});
