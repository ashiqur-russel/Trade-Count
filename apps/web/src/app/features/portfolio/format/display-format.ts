import { Big } from '@trade-count/ledger';

type Decimal = Big | string | number;

const LOCALE = 'de-DE';
const euro = new Intl.NumberFormat(LOCALE, { style: 'currency', currency: 'EUR' });
const quantity = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 6 });
const percent = new Intl.NumberFormat(LOCALE, {
  style: 'percent',
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
  signDisplay: 'exceptZero',
});

// `|| 0` turns -0 (e.g. a zero tax negated for display) into 0, so it never shows as "-0,00 €".
const toNumber = (value: Decimal): number => new Big(value).toNumber() || 0;

export type ProfitTone = 'gain' | 'loss' | 'flat';

export function formatEuro(value: Decimal): string {
  return euro.format(toNumber(value));
}

export function formatSignedEuro(value: Decimal): string {
  const amount = new Big(value);
  return (amount.gt(0) ? '+' : '') + euro.format(amount.toNumber());
}

export function formatQuantity(value: Decimal): string {
  return quantity.format(toNumber(value));
}

export function formatPercent(ratio: Decimal): string {
  return percent.format(toNumber(ratio));
}

export function profitTone(value: Decimal): ProfitTone {
  const amount = new Big(value);
  return amount.gt(0) ? 'gain' : amount.lt(0) ? 'loss' : 'flat';
}
