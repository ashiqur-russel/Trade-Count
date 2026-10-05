import { Big } from '@trade-count/ledger';

export interface DecimalFormat {
  integerDigits: number;
  decimals: number;
}

// Mirror the API's numeric(18,6) quantity and numeric(14,4) price columns.
export const QUANTITY_FORMAT: DecimalFormat = { integerDigits: 12, decimals: 6 };
export const PRICE_FORMAT: DecimalFormat = { integerDigits: 10, decimals: 4 };

/**
 * Reads what a person types ("560,50", "1.234,5", "€ 560.5") into the API's decimal string,
 * or null when it is not a positive number that fits the format.
 */
export function parseDecimalInput(raw: string, format: DecimalFormat): string | null {
  let text = raw.replace(/[\s€]/g, '');
  if (text.includes(',')) text = text.replace(/\./g, '').replace(',', '.');
  if (!/^\d+(\.\d+)?$/.test(text)) return null;

  const value = new Big(text);
  const [integerPart, decimalPart = ''] = value.toFixed().split('.');
  if (integerPart.length > format.integerDigits || decimalPart.length > format.decimals)
    return null;
  return value.gt(0) ? value.toFixed() : null;
}
