import { formatSignedEuro, profitTone } from './display-format';

describe('display-format', () => {
  it('formats signed euro amounts the German way with an explicit plus for gains', () => {
    expect(formatSignedEuro('1234.5')).toBe('+1.234,50 €');
    expect(formatSignedEuro('-20')).toBe('-20,00 €');
    expect(formatSignedEuro('0')).toBe('0,00 €');
  });

  it('classifies profit as gain, loss or flat', () => {
    expect([profitTone('0.01'), profitTone('-1'), profitTone('0')]).toEqual([
      'gain',
      'loss',
      'flat',
    ]);
  });
});
