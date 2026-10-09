import { Big } from '@trade-count/ledger';
import { insightText, portionShares, type TextOptions } from './insight-text';

const euros: TextOptions = { currency: 'EUR', usdPerEur: 1.1206 };
const nvda: TextOptions = {
  ...euros,
  position: { shares: new Big(39), average: new Big('212.45'), priceNowEur: new Big('204.60') },
};
const plain = (options: TextOptions, text: string) =>
  insightText(text, options)
    .map((s) => s.text)
    .join('');

describe('insightText', () => {
  it('shows USD prices in euros, or as written in USD mode', () => {
    expect(plain(euros, 'Stop at $227')).toBe('Stop at 202,57 €');
    expect(plain(euros, 'zone $233–236.5')).toBe('zone 207,92–211,05 €');
    expect(plain({ ...euros, currency: 'USD' }, 'zone $233–236.5')).toBe('zone $233–236.5');
  });

  it('leaves numbers that are not marked as prices alone', () => {
    expect(plain(euros, 'n = 125 since 2016, RSI 64')).toBe('n = 125 since 2016, RSI 64');
  });

  it('works plan tokens out from the shares and average the user holds', () => {
    expect(plain(nvda, 'risk {risk:227}, P/L {pl:227}, now {now}')).toBe(
      'risk 385 €, P/L -385,32 €, now -306,15 €',
    );
    expect(plain(nvda, 'sell {shares:third} at {price:250}: {pl:250:third}')).toBe(
      'sell 13 at 223,09 €: +138,38 €',
    );
    expect(plain(nvda, '{ratio:227:250}')).toBe('1 : 1.1');
    expect(plain(nvda, 'move the stop to {avg}')).toBe('move the stop to 212,45\u00a0€');
  });

  it('marks bold parts and colours gains and losses', () => {
    const segments = insightText('**Stop:** {pl:227}', nvda);
    expect(segments[0]).toEqual({ text: 'Stop:', strong: true, tone: null });
    expect(segments.at(-1)).toEqual({ text: '-385,32 €', strong: false, tone: 'loss' });
  });

  it('shows a dash for personal tokens when the user does not hold the stock', () => {
    expect(plain(euros, 'about {pl:227}')).toBe('about –');
  });
});

describe('portionShares', () => {
  it('splits a holding into thirds and halves of at least one share', () => {
    expect(portionShares(new Big(50), 'half').toString()).toBe('25');
    expect(portionShares(new Big(50), 'rest').toString()).toBe('25');
    expect(portionShares(new Big(39), 'third').toString()).toBe('13');
    expect(portionShares(new Big(1), 'third').toString()).toBe('1');
  });
});
