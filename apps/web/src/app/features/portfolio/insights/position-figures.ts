import { Big, type StockLedger } from '@trade-count/ledger';
import type { InsightPosition } from './insights-bundle';
import type { PositionContext } from './insight-text';

export interface LevelRow {
  name: string;
  priceEur: Big;
  priceUsd: Big | null;
  profit: Big;
  change: Big | null;
  mine: boolean;
}

export interface PositionFigures extends PositionContext {
  cost: Big;
  value: Big;
  result: Big;
  resultRatio: Big;
}

export function positionFigures(entry: StockLedger, priceNowEur: Big): PositionFigures | null {
  if (entry.held.lte(0) || !entry.averageOpenPrice) return null;
  const value = entry.held.times(priceNowEur);
  const result = value.minus(entry.openCost);
  return {
    shares: entry.held,
    average: entry.averageOpenPrice,
    priceNowEur,
    cost: entry.openCost,
    value,
    result,
    resultRatio: result.div(entry.openCost),
  };
}

/** The edition's levels plus the user's average and today's price, highest first, with the user's P/L at each. */
export function levelRows(
  position: InsightPosition,
  figures: PositionFigures,
  usdPerEur: number,
): LevelRow[] {
  const row = (name: string, priceEur: Big, priceUsd: Big | null, mine: boolean): LevelRow => ({
    name,
    priceEur,
    priceUsd,
    profit: figures.shares.times(priceEur.minus(figures.average)),
    change: mine && name === 'Your average buy' ? null : priceEur.div(figures.average).minus(1),
    mine,
  });
  return [
    ...position.levels.map((level) =>
      row(level.name, new Big(level.usd).div(usdPerEur), new Big(level.usd), false),
    ),
    row('Your average buy', figures.average, null, true),
    row('Now', figures.priceNowEur, null, true),
  ].sort((a, b) => b.priceEur.cmp(a.priceEur));
}
