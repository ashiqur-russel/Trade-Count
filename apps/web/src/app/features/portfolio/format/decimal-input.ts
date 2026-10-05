import { canonicalDecimal, type DecimalLimits } from '@trade-count/local-store';

/**
 * Reads what a person types ("560,50", "1.234,5", "€ 560.5") into the stored decimal string,
 * or null when it is not a positive number within the limits.
 */
export function parseDecimalInput(raw: string, limits: DecimalLimits): string | null {
  let text = raw.replace(/[\s€]/g, '');
  if (text.includes(',')) text = text.replace(/\./g, '').replace(',', '.');
  return canonicalDecimal(text, limits);
}
