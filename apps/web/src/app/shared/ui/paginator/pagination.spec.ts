import { clampPage, pageLinks, pageSlice } from './pagination';

describe('pagination', () => {
  it('pageSlice returns the items of the requested page and clamps pages past the end', () => {
    const items = Array.from({ length: 23 }, (_, i) => i + 1);

    expect(pageSlice(items, 3, 10)).toEqual([21, 22, 23]);
    expect(pageSlice(items, 9, 10)).toEqual([21, 22, 23]);
    expect(pageSlice([], 1, 10)).toEqual([]);
  });

  it('clampPage keeps the page within 1 and the last page', () => {
    expect(clampPage(0, 50, 10)).toBe(1);
    expect(clampPage(7, 50, 10)).toBe(5);
    expect(clampPage(2, 0, 10)).toBe(1);
  });

  it('pageLinks shows first, last and neighbours with gaps for skipped ranges', () => {
    expect(pageLinks(1, 1)).toEqual([1]);
    expect(pageLinks(2, 4)).toEqual([1, 2, 3, 4]);
    expect(pageLinks(5, 12)).toEqual([1, 'gap', 4, 5, 6, 'gap', 12]);
    expect(pageLinks(1, 12)).toEqual([1, 2, 'gap', 12]);
  });
});
