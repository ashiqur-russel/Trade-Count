import { Big } from '@trade-count/ledger';
import { formatEuro, formatSignedEuro, formatWholeEuro } from '../format/display-format';

export type InsightCurrency = 'EUR' | 'USD';

export interface TextSegment {
  text: string;
  strong: boolean;
  tone: 'gain' | 'loss' | null;
}

/** The user's own holding, so plan text can speak in their shares and euros. */
export interface PositionContext {
  shares: Big;
  average: Big;
  priceNowEur: Big;
}

export interface TextOptions {
  currency: InsightCurrency;
  usdPerEur: number;
  position?: PositionContext | null;
}

type Portion = 'all' | 'half' | 'third' | 'rest';

const TOKEN = /\$(\d+(?:\.\d+)?)(?:–(\d+(?:\.\d+)?))?|\{(\w+)((?::[\w.]+)*)\}/g;
const missing = '–';

/**
 * Renders note text: `**bold**`, USD prices `$227` / `$227–233` in the chosen currency, and plan
 * tokens: `{price:227}`, `{avg}`, `{shares:third}`, `{pl:227}` or `{pl:227:half}`, `{now}`, `{risk:227}`,
 * `{gain:250}`, `{ratio:227:250}`.
 */
export function insightText(text: string, options: TextOptions): TextSegment[] {
  return text.split('**').flatMap((part, i) => tokens(part, i % 2 === 1, options));
}

function tokens(text: string, strong: boolean, options: TextOptions): TextSegment[] {
  const segments: TextSegment[] = [];
  let last = 0;
  for (const match of text.matchAll(TOKEN)) {
    if (match.index > last)
      segments.push({ text: text.slice(last, match.index), strong, tone: null });
    const [, low, high, name, rawArgs] = match;
    segments.push(
      low !== undefined
        ? { text: priceRange(low, high, options), strong, tone: null }
        : { ...planToken(name!, rawArgs!.split(':').slice(1), options), strong },
    );
    last = match.index + match[0].length;
  }
  if (last < text.length) segments.push({ text: text.slice(last), strong, tone: null });
  return segments;
}

function priceRange(
  low: string,
  high: string | undefined,
  { currency, usdPerEur }: TextOptions,
): string {
  if (currency === 'USD') return `$${low}${high ? `–${high}` : ''}`;
  const euros = (usd: string) => new Big(usd).div(usdPerEur);
  return high
    ? `${formatEuro(euros(low)).replace(/\s€$/, '')}–${formatEuro(euros(high))}`
    : formatEuro(euros(low));
}

function planToken(
  name: string,
  args: string[],
  options: TextOptions,
): Omit<TextSegment, 'strong'> {
  const plain = (text: string) => ({ text, tone: null });
  if (name === 'price' && args[0]) return plain(priceRange(args[0], undefined, options));

  const position = options.position;
  if (!position) return plain(missing);
  const euros = (usd: string) => new Big(usd).div(options.usdPerEur);
  const signed = (amount: Big) => ({ text: formatSignedEuro(amount), tone: tone(amount) });

  switch (name) {
    case 'avg':
      return plain(formatEuro(position.average));
    case 'shares':
      return plain(portionShares(position.shares, (args[0] as Portion) ?? 'all').toString());
    case 'pl': {
      const shares = portionShares(position.shares, (args[1] as Portion) ?? 'all');
      return signed(shares.times(euros(args[0]!).minus(position.average)));
    }
    case 'now':
      return signed(position.shares.times(position.priceNowEur.minus(position.average)));
    case 'risk':
      return plain(formatWholeEuro(position.shares.times(position.average.minus(euros(args[0]!)))));
    case 'gain':
      return plain(formatWholeEuro(position.shares.times(euros(args[0]!).minus(position.average))));
    case 'ratio': {
      const risk = position.average.minus(euros(args[0]!));
      const gain = euros(args[1]!).minus(position.average);
      return plain(risk.gt(0) ? `1 : ${gain.div(risk).toFixed(1)}` : missing);
    }
    default:
      return plain(missing);
  }
}

/** A third or half of the holding, at least one share; `rest` is what a half sale leaves. */
export function portionShares(shares: Big, portion: Portion): Big {
  const atLeastOne = (value: Big) => (value.lt(1) ? new Big(1) : value);
  switch (portion) {
    case 'third':
      return atLeastOne(shares.div(3).round(0));
    case 'half':
      return atLeastOne(shares.div(2).round(0));
    case 'rest':
      return shares.minus(atLeastOne(shares.div(2).round(0)));
    default:
      return shares;
  }
}

function tone(amount: Big): 'gain' | 'loss' | null {
  return amount.gt(0) ? 'gain' : amount.lt(0) ? 'loss' : null;
}
