/** Round price steps for a chart axis, about four to six of them between `lo` and `hi`. */
export function gridSteps(lo: number, hi: number): number[] {
  const magnitude = Math.pow(10, Math.floor(Math.log10((hi - lo) / 4)));
  const step = [1, 2, 2.5, 5, 10].map((s) => s * magnitude).find((s) => (hi - lo) / s <= 6)!;
  const steps: number[] = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) steps.push(v);
  return steps;
}

export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** `2026-10-05` → `5 Oct` */
export function dayLabel(date: string): string {
  return `${Number(date.slice(8, 10))} ${MONTHS[Number(date.slice(5, 7)) - 1]}`;
}
