import { Big } from '@trade-count/ledger';

export interface DecimalLimits {
  integerDigits: number;
  decimals: number;
}

export const QUANTITY_LIMITS: DecimalLimits = { integerDigits: 12, decimals: 6 };
export const PRICE_LIMITS: DecimalLimits = { integerDigits: 10, decimals: 4 };

/** Canonical form ("560.5") of a positive decimal string within the limits, or null. */
export function canonicalDecimal(value: unknown, limits: DecimalLimits): string | null {
  if (typeof value !== 'string' || !/^\d+(\.\d+)?$/.test(value)) return null;
  const decimal = new Big(value);
  const [integerPart = '', decimalPart = ''] = decimal.toFixed().split('.');
  if (integerPart.length > limits.integerDigits || decimalPart.length > limits.decimals) return null;
  return decimal.gt(0) ? decimal.toFixed() : null;
}
