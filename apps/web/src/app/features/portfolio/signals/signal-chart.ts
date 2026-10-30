import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { dayLabel, gridSteps } from '../insights/chart-grid';
import type { Signal, SignalStatus, SignalStock } from './signal-record';
import { SIGNAL_STATUS_LABEL } from './signal-status';

const W = 1000;
const H = 300;
const M = { left: 8, right: 64, top: 18, bottom: 26 };

interface SignalMark {
  id: string;
  status: SignalStatus;
  x1: number;
  x2: number;
  y: number;
  /** Where the price reached the signal; `null` while it hasn't. */
  hit: { x: number; y: number } | null;
}

/** Daily closes in euros with each signal's level, from when it was given until it was reached or ended. */
@Component({
  selector: 'tc-signal-chart',
  template: `
    @let c = chart();
    <div class="scroll">
      <svg [attr.viewBox]="'0 0 ' + width + ' ' + height" role="img" [attr.aria-label]="c.label">
        @for (g of c.grid; track g.y) {
          <line class="grid" [attr.x1]="left" [attr.x2]="right" [attr.y1]="g.y" [attr.y2]="g.y" />
          <text class="axis" [attr.x]="right + 6" [attr.y]="g.y + 4">{{ g.label }}</text>
        }
        @for (d of c.days; track d.x) {
          <text class="axis" [attr.x]="d.x" [attr.y]="height - 9" [attr.text-anchor]="d.anchor">
            {{ d.label }}
          </text>
        }
        <path class="band" [attr.d]="c.band" />
        <path class="close" [attr.d]="c.close" />
        @for (m of c.marks; track m.id) {
          <line
            [class]="'level ' + m.status"
            [attr.x1]="m.x1"
            [attr.x2]="m.x2"
            [attr.y1]="m.y"
            [attr.y2]="m.y"
          />
          @if (m.hit; as h) {
            <circle [class]="'hit ' + m.status" [attr.cx]="h.x" [attr.cy]="h.y" r="6" />
            <text
              [class]="'tag ' + m.status"
              [attr.x]="h.x"
              [attr.y]="h.y - 11"
              text-anchor="middle"
            >
              {{ m.id }}
            </text>
          } @else {
            <text
              [class]="'tag ' + m.status"
              [attr.x]="m.x2 - 2"
              [attr.y]="m.y - 5"
              text-anchor="end"
            >
              {{ m.id }}
            </text>
          }
        }
        <circle class="dot" [attr.cx]="c.lastX" [attr.cy]="c.lastY" r="4" />
      </svg>
    </div>
  `,
  styleUrl: './signal-chart.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SignalChart {
  readonly stock = input.required<SignalStock>();
  readonly signals = input.required<Signal[]>();

  protected readonly width = W;
  protected readonly height = H;
  protected readonly left = M.left;
  protected readonly right = W - M.right;

  protected readonly chart = computed(() => {
    const series = this.stock().series;
    const signals = this.signals();
    const dates = series.map(([date]) => date);
    const values = [
      ...series.flatMap(([, , high, low]) => [high, low]),
      ...signals.map((s) => s.levelEur),
      ...signals.flatMap((s) => (s.priceEur === null ? [] : [s.priceEur])),
    ];
    let lo = Math.min(...values);
    let hi = Math.max(...values);
    const pad = (hi - lo) * 0.06;
    lo -= pad;
    hi += pad;

    const last = series.length - 1;
    const x = (i: number) => M.left + ((W - M.left - M.right) * i) / last;
    const y = (v: number) => M.top + (H - M.top - M.bottom) * (1 - (v - lo) / (hi - lo));
    const dayIndex = (date: string) => {
      const i = dates.findIndex((d) => d >= date);
      return i < 0 ? last : i;
    };
    const point = (i: number, v: number) => `${x(i).toFixed(1)} ${y(v).toFixed(1)}`;

    const marks: SignalMark[] = signals.map((s) => {
      const from = dayIndex(s.activeFrom);
      const to = Math.max(from, dayIndex(s.reachedOn ?? s.activeTo ?? dates[last]!));
      return {
        id: s.id,
        status: s.status,
        x1: x(from),
        x2: to === from ? x(from) + 12 : x(to),
        y: y(s.levelEur),
        hit: s.reachedOn ? { x: x(dayIndex(s.reachedOn)), y: y(s.priceEur ?? s.levelEur) } : null,
      };
    });

    return {
      label: `${this.stock().name}: daily closes in euros with ${signals.length} signals marked as ${Object.values(SIGNAL_STATUS_LABEL).join(', ').toLowerCase()}`,
      grid: gridSteps(lo, hi).map((v) => ({ y: y(v), label: `${Math.round(v)} €` })),
      days: dates.flatMap((date, i) =>
        i % 4 === 0 || i === last
          ? [
              {
                x: x(i),
                label: dayLabel(date),
                anchor: i === 0 ? 'start' : i === last ? 'end' : 'middle',
              },
            ]
          : [],
      ),
      band:
        'M' +
        series.map(([, , high], i) => point(i, high)).join(' L') +
        ' L' +
        [...series]
          .reverse()
          .map(([, , , low], k) => point(last - k, low))
          .join(' L') +
        'Z',
      close: 'M' + series.map(([, close], i) => point(i, close)).join(' L'),
      marks,
      lastX: x(last),
      lastY: y(series[last]![1]),
    };
  });
}
