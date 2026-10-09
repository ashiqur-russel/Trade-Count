import { deriveCredentials, encryptVault, generateSyncKey } from '@trade-count/sync-crypto';

const stock = (ticker: string, name: string, aliases: string[], rank: number, closeUsd: number) => ({
  ticker,
  name,
  aliases,
  rank,
  closeUsd,
  dayChangePct: 1,
  impliedVolPct: 40,
  verdict: {
    direction: 'Neutral',
    tone: 'neutral',
    action: 'WAIT',
    entry: `$${closeUsd}`,
    stop: '$300',
    target: '$420',
    riskReward: '3 : 1',
    probability: '50%',
    nextMove: 'Range',
    timeframe: '2 weeks',
    waitHeadline: 'WAIT',
    waitDetail: 'Test notes.',
  },
  series: [
    ['2026-09-01', closeUsd - 10, closeUsd - 5, closeUsd - 8],
    ['2026-09-02', closeUsd, closeUsd - 4, closeUsd - 7],
  ],
  chartLevels: { resistance: [closeUsd + 10], support: [closeUsd - 10] },
  snapshot: [],
  movingAverages: [],
  keyPoint: '',
  technicals: [],
  nextMove: [],
  ranges: [],
  touchOdds: [],
  earnings: '',
  resistance: [],
  support: [],
  breaks: [],
  setups: [],
  setupNote: '',
  scenarios: [],
  horizonRanges: [],
  catalysts: [],
  options: [],
  optionsRead: '',
  changeMind: [],
});

const edition = {
  version: 1,
  asOf: new Date().toISOString().slice(0, 10),
  usdPerEur: 1.1206,
  sharedRisk: 'Test edition.',
  sources: [],
  stocks: [
    stock('NVDA', 'NVIDIA', ['NVIDIA Corporation'], 1, 229.28),
    {
      ...stock('TSLA', 'Tesla', ['Tesla Inc.'], 2, 382.7),
      position: {
        heldAction: 'WAIT · limit {shares:half}',
        levels: [{ name: 'S3 · stop', usd: 345.88 }],
        plan: ['**Before earnings:** limit sell {shares:half} shares around {price:391.13}, stop {pl:345.88}.'],
      },
    },
  ],
};

/** A small edition encrypted with a fresh key, served in place of the real `/insights.vault`. */
export async function testEdition(): Promise<{ key: string; vault: string }> {
  const key = await generateSyncKey();
  const envelope = await encryptVault(JSON.stringify(edition), await deriveCredentials(key));
  return { key, vault: JSON.stringify(envelope) };
}
