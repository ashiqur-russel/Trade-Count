import { percentToRate, rateToPercentText } from './tax-rate-setting';

describe('percentToRate / rateToPercentText', () => {
  it.each([
    ['26,375', '0.26375'],
    ['26.375 %', '0.26375'],
    ['0', '0'],
    ['100', '1'],
    ['27,995', '0.27995'],
  ])('reads %s %% as the fraction %s', (input, rate) => {
    expect(percentToRate(input)).toBe(rate);
  });

  it.each(['', 'abc', '-5', '100,1', '1.234,5'])('rejects %s', (input) => {
    expect(percentToRate(input)).toBeNull();
  });

  it('shows a stored fraction back as a German percentage', () => {
    expect(rateToPercentText('0.26375')).toBe('26,375');
  });
});
