import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { InsightStock } from './insights-bundle';
import { formatEuro } from '../format/display-format';
import type { InsightCurrency } from './insight-text';

const W = 1000;
const H = 320;
const M = { left: 8, right: 64, top: 14, bottom: 26 };
const FUTURE_DAYS = 21;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

interface Line {
  y: number;
  label: string;
}

/** Six months of closes with the 20/50-day averages, the edition's levels and a one-month range cone. */
@Component({
  selector: 'tc-insight-chart',
  template: `
    @let c = chart();
    <div class="scroll">
      <svg [attr.viewBox]="'0 0 ' + width + ' ' + height" role="img" [attr.aria-label]="c.label">
        @for (g of c.grid; track g.y) {
          <line class="grid" [attr.x1]="left" [attr.x2]="right" [attr.y1]="g.y" [attr.y2]="g.y" />
          <text class="axis" [attr.x]="right + 6" [attr.y]="g.y + 4">{{ g.label }}</text>
        }
        @for (m of c.months; track m.x) {
          <text class="axis" [attr.x]="m.x" [attr.y]="height - 9" text-anchor="middle">
            {{ m.label }}
          </text>
        }
        <path class="cone-wide" [attr.d]="c.coneWide" />
        <path class="cone" [attr.d]="c.cone" />
        @for (r of c.resistance; track r.y) {
          <line
            class="resistance"
            [attr.x1]="left"
            [attr.x2]="right"
            [attr.y1]="r.y"
            [attr.y2]="r.y"
          />
          <text class="resistance-label" [attr.x]="left + 4" [attr.y]="r.y - 4">{{ r.label }}</text>
        }
        @for (s of c.support; track s.y) {
          <line
            class="support"
            [attr.x1]="left"
            [attr.x2]="right"
            [attr.y1]="s.y"
            [attr.y2]="s.y"
          />
          <text class="support-label" [attr.x]="left + 4" [attr.y]="s.y + 13">{{ s.label }}</text>
        }
        <path class="ma50" [attr.d]="c.ma50" />
        <path class="ma20" [attr.d]="c.ma20" />
        <path class="close" [attr.d]="c.close" />
        <line
          class="today"
          [attr.x1]="c.todayX"
          [attr.x2]="c.todayX"
          [attr.y1]="top"
          [attr.y2]="bottom"
        />
        <circle class="dot" [attr.cx]="c.todayX" [attr.cy]="c.todayY" r="4" />
        <text class="cone-label" [attr.x]="right - 4" [attr.y]="c.coneLabelY" text-anchor="end">
          {{ c.coneLabel }}
        </text>
      </svg>
    </div>
    <div class="legend">
      <span><i class="k-close"></i>Close</span>
      <span><i class="k-ma20"></i>20-day</span>
      <span><i class="k-ma50"></i>50-day</span>
      <span><i class="k-resistance"></i>Resistance</span>
      <span><i class="k-support"></i>Support</span>
      <span
        ><i class="k-cone"></i>1-month 68 % / 90 % range (IV {{ stock().impliedVolPct }} %)</span
      >
    </div>
  `,
  styleUrl: './insight-chart.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InsightChart {
  readonly stock = input.required<InsightStock>();
  readonly currency = input.required<InsightCurrency>();
  readonly usdPerEur = input.required<number>();

  protected readonly width = W;
  protected readonly height = H;
  protected readonly left = M.left;
  protected readonly right = W - M.right;
  protected readonly top = M.top;
  protected readonly bottom = H - M.bottom;

  protected readonly chart = computed(() => {
    const stock = this.stock();
    const toShown = (usd: number) => (this.currency() === 'USD' ? usd : usd / this.usdPerEur());
    const usd = this.currency() === 'USD';
    const rows = stock.series.map(([date, close, ma20, ma50]) => ({
      date,
      close: toShown(close),
      ma20: toShown(ma20),
      ma50: toShown(ma50),
    }));
    const now = toShown(stock.closeUsd);
    const sigma = (days: number) => (stock.impliedVolPct / 100) * Math.sqrt(days / 252);
    const cone = Array.from({ length: FUTURE_DAYS + 1 }, (_, k) => [
      now * Math.exp(-1.645 * sigma(k)),
      now * Math.exp(-sigma(k)),
      now * Math.exp(sigma(k)),
      now * Math.exp(1.645 * sigma(k)),
    ]);
    const resistance = stock.chartLevels.resistance.map(toShown);
    const support = stock.chartLevels.support.map(toShown);
    const lastCone = cone[FUTURE_DAYS]!;

    let lo = Math.min(
      ...rows.map((r) => Math.min(r.close, r.ma50)),
      ...support,
      ...resistance,
      lastCone[0]!,
    );
    let hi = Math.max(...rows.map((r) => r.close), ...support, ...resistance, lastCone[3]!);
    const pad = (hi - lo) * 0.05;
    lo -= pad;
    hi += pad;

    const count = rows.length + FUTURE_DAYS;
    const x = (i: number) => M.left + ((W - M.left - M.right) * i) / (count - 1);
    const y = (v: number) => M.top + (H - M.top - M.bottom) * (1 - (v - lo) / (hi - lo));
    const path = (values: number[]) =>
      'M' + values.map((v, i) => `${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' L');
    const today = rows.length - 1;
    const band = (low: number, high: number) =>
      'M' +
      cone.map((c, q) => `${x(today + q).toFixed(1)} ${y(c[high]!).toFixed(1)}`).join(' L') +
      ' L' +
      [...cone]
        .reverse()
        .map((c, q) => `${x(today + FUTURE_DAYS - q).toFixed(1)} ${y(c[low]!).toFixed(1)}`)
        .join(' L') +
      'Z';
    const label = (v: number) => (usd ? `$${v.toFixed(2)}` : formatEuro(v));
    const whole = (v: number) => (usd ? `$${Math.round(v)}` : `${Math.round(v)} €`);
    const line = (v: number): Line => ({ y: y(v), label: label(v) });

    return {
      label: `${stock.name}: six months of daily closes in ${this.currency()}, 20 and 50 day averages, key levels and a one-month range`,
      grid: gridSteps(lo, hi).map((v) => ({ y: y(v), label: whole(v) })),
      months: monthLabels(rows.map((r) => r.date)).map(({ index, month }) => ({
        x: x(index),
        label: MONTHS[month - 1]!,
      })),
      close: path(rows.map((r) => r.close)),
      ma20: path(rows.map((r) => r.ma20)),
      ma50: path(rows.map((r) => r.ma50)),
      resistance: resistance.map(line),
      support: support.map(line),
      cone: band(1, 2),
      coneWide: band(0, 3),
      coneLabel: `68 % ${whole(lastCone[1]!)} – ${whole(lastCone[2]!)}`,
      coneLabelY: y(lastCone[2]!) - 6,
      todayX: x(today),
      todayY: y(now),
    };
  });
}

function gridSteps(lo: number, hi: number): number[] {
  const magnitude = Math.pow(10, Math.floor(Math.log10((hi - lo) / 4)));
  const step = [1, 2, 2.5, 5, 10].map((s) => s * magnitude).find((s) => (hi - lo) / s <= 6)!;
  const steps: number[] = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) steps.push(v);
  return steps;
}

function monthLabels(dates: string[]): { index: number; month: number }[] {
  return dates.flatMap((date, index) => {
    const month = Number(date.slice(5, 7));
    const isFirst = index === 0 || Number(dates[index - 1]!.slice(5, 7)) !== month;
    return isFirst && index > 3 ? [{ index, month }] : [];
  });
}
