import type { Ledger, StockLedger } from '@trade-count/ledger';
import type { InsightStock, InsightsBundle } from './insights-bundle';

export interface MatchedInsight {
  insight: InsightStock;
  /** The user's stock the notes are about. */
  entry: StockLedger;
  held: boolean;
}

/** Notes for the stocks the user has traded: held ones first, then by the edition's ranking. */
export function matchInsights(bundle: InsightsBundle, ledger: Ledger): MatchedInsight[] {
  const traded = [...ledger.values()].filter((entry) => entry.held.gt(0) || entry.sold.gt(0));
  return bundle.stocks
    .flatMap((insight) => {
      const names = new Set([insight.ticker, ...insight.aliases].map(normalize));
      const matches = traded.filter(
        (entry) =>
          names.has(normalize(entry.stock.name)) ||
          (entry.stock.symbol !== null && names.has(normalize(entry.stock.symbol))),
      );
      const entry = matches.find((m) => m.held.gt(0)) ?? matches[0];
      return entry ? [{ insight, entry, held: entry.held.gt(0) }] : [];
    })
    .sort((a, b) => Number(b.held) - Number(a.held) || a.insight.rank - b.insight.rank);
}

function normalize(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]/g, '');
}
