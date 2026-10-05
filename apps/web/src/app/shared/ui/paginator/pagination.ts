export type PageLink = number | 'gap';

export function pageCount(total: number, pageSize: number): number {
  return Math.max(1, Math.ceil(total / pageSize));
}

/** Keeps a page number inside 1…pageCount after the data shrinks. */
export function clampPage(page: number, total: number, pageSize: number): number {
  return Math.min(Math.max(1, page), pageCount(total, pageSize));
}

export function pageSlice<T>(items: readonly T[], page: number, pageSize: number): T[] {
  const start = (clampPage(page, items.length, pageSize) - 1) * pageSize;
  return items.slice(start, start + pageSize);
}

/** First, last, and `siblings` pages either side of the current one, with gaps between: 1 … 4 5 6 … 12 */
export function pageLinks(current: number, count: number, siblings = 1): PageLink[] {
  const pages = new Set([1, count]);
  for (let p = current - siblings; p <= current + siblings; p++) {
    if (p >= 1 && p <= count) pages.add(p);
  }
  const sorted = [...pages].sort((a, b) => a - b);
  return sorted.flatMap((page, i) =>
    i > 0 && page - sorted[i - 1] > 1 ? ['gap' as const, page] : [page],
  );
}
