import { PRICE_LIMITS, QUANTITY_LIMITS } from '@trade-count/local-store';
import { parseDecimalInput } from './decimal-input';

describe('parseDecimalInput', () => {
  it.each([
    ['560', '560'],
    ['560,50', '560.5'],
    ['560.50', '560.5'],
    ['1.234,5', '1234.5'],
    ['€ 560', '560'],
    ['0,0001', '0.0001'],
  ])('reads %s as %s', (raw, expected) => {
    expect(parseDecimalInput(raw, PRICE_LIMITS)).toBe(expected);
  });

  it.each(['', '0', '0,00', '-5', 'abc', '1,2,3', '560,12345'])('rejects %s as a price', (raw) => {
    expect(parseDecimalInput(raw, PRICE_LIMITS)).toBeNull();
  });

  it('allows six decimals for quantities but not seven', () => {
    expect(parseDecimalInput('0,000001', QUANTITY_LIMITS)).toBe('0.000001');
    expect(parseDecimalInput('0,0000001', QUANTITY_LIMITS)).toBeNull();
  });

  it('rejects numbers too large for the database column', () => {
    expect(parseDecimalInput('12345678901', PRICE_LIMITS)).toBeNull();
  });
});
