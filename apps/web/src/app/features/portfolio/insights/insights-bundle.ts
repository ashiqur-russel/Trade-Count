/**
 * One edition of the private market notes. USD prices inside text are written as `$123` or
 * `$123–130`, so the page can show them in euros.
 */
export interface InsightsBundle {
  version: 1;
  /** Close the notes are based on, `YYYY-MM-DD`. */
  asOf: string;
  /** Dollars per euro on `asOf`. */
  usdPerEur: number;
  sharedRisk: string;
  sources: InsightSource[];
  stocks: InsightStock[];
}

export interface InsightSource {
  label: string;
  url: string;
}

export type InsightTone = 'gain' | 'loss' | 'warn' | 'neutral';

export interface InsightStock {
  ticker: string;
  name: string;
  /** Symbols and names a stock in the ledger may carry, matched case-insensitively. */
  aliases: string[];
  /** 1 = best risk/reward of this edition. */
  rank: number;
  closeUsd: number;
  dayChangePct: number;
  impliedVolPct: number;
  verdict: InsightVerdict;
  /** What the last session changed, as written; shown first. */
  latest?: string[];
  /** Daily `[date, close, 20-day, 50-day]` in USD, oldest first. */
  series: [string, number, number, number][];
  chartLevels: { resistance: number[]; support: number[] };
  snapshot: [string, string][];
  movingAverages: { label: string; usd: number; vsPricePct: number }[];
  keyPoint: string;
  technicals: string[];
  nextMove: [string, string][];
  ranges: { horizon: string; likely: string; wide: string }[];
  touchOdds: { level: string; touch: string; close: string }[];
  earnings: string;
  resistance: InsightLevel[];
  support: InsightLevel[];
  breaks: string[];
  setups: {
    name: string;
    entry: string;
    stop: string;
    targets: string;
    rewardRisk: string;
    kind: string;
  }[];
  setupNote: string;
  scenarios: { name: string; trigger: string; target: string; time: string; probability: string }[];
  horizonRanges: { horizon: string; range: string; note: string }[];
  catalysts: { impact: 'HIGH' | 'MED' | 'LOW' | 'RUMOR'; text: string }[];
  options: [string, string][];
  optionsRead: string;
  changeMind: string[];
  /** Only for stocks the notes were written for as a holding; text may use plan tokens. */
  position?: InsightPosition;
}

export interface InsightVerdict {
  direction: string;
  tone: InsightTone;
  action: string;
  entry: string;
  stop: string;
  target: string;
  riskReward: string;
  probability: string;
  nextMove: string;
  timeframe: string;
  waitHeadline: string;
  waitDetail: string;
}

export interface InsightLevel {
  label: string;
  price: string;
  why: string;
}

export interface InsightPosition {
  /** Shown on the stock's card while the user holds it, e.g. `HOLD with the stop`. */
  heldAction: string;
  levels: { name: string; usd: number }[];
  plan: string[];
}

export class InsightsBundleError extends Error {
  constructor() {
    super("These notes can't be read: the file isn't an Insights edition this app understands.");
    this.name = 'InsightsBundleError';
  }
}

/** Checks the decrypted edition's outer shape; the content itself was written by the key holder. */
export function parseInsightsBundle(json: string): InsightsBundle {
  const value = JSON.parse(json) as Partial<InsightsBundle> | null;
  const valid =
    typeof value === 'object' &&
    value !== null &&
    value.version === 1 &&
    typeof value.asOf === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(value.asOf) &&
    typeof value.usdPerEur === 'number' &&
    value.usdPerEur > 0 &&
    Array.isArray(value.stocks) &&
    value.stocks.every(isStockShape);
  if (!valid) throw new InsightsBundleError();
  return value as InsightsBundle;
}

function isStockShape(stock: Partial<InsightStock> | null): boolean {
  return (
    typeof stock === 'object' &&
    stock !== null &&
    typeof stock.ticker === 'string' &&
    typeof stock.name === 'string' &&
    Array.isArray(stock.aliases) &&
    typeof stock.closeUsd === 'number' &&
    Array.isArray(stock.series) &&
    typeof stock.verdict === 'object'
  );
}
