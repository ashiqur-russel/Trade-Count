import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { dayLabel, gridSteps } from '../insights/chart-grid';
import type { PaperDay } from './paper-record';

const W = 1000;
const H = 260;
const M = { left: 8, right: 72, top: 18, bottom: 26 };

/** End-of-day value of the paper portfolio against holding the start positions. */
@Component({
  selector: 'tc-paper-value-chart',
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
        <path class="hold" [attr.d]="c.hold" />
        <path class="value" [attr.d]="c.value" />
      </svg>
    </div>
  `,
  styleUrl: './paper-value-chart.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaperValueChart {
  readonly days = input.required<PaperDay[]>();

  protected readonly width = W;
  protected readonly height = H;
  protected readonly left = M.left;
  protected readonly right = W - M.right;

  protected readonly chart = computed(() => {
    const days = this.days();
    const values = days.flatMap((d) => [d.value, d.hold]);
    let lo = Math.min(...values);
    let hi = Math.max(...values);
    const pad = Math.max((hi - lo) * 0.08, hi * 0.005);
    lo -= pad;
    hi += pad;

    const last = days.length - 1;
    const x = (i: number) => M.left + ((W - M.left - M.right) * i) / last;
    const y = (v: number) => M.top + (H - M.top - M.bottom) * (1 - (v - lo) / (hi - lo));
    const line = (pick: (d: PaperDay) => number) =>
      'M' + days.map((d, i) => `${x(i).toFixed(1)} ${y(pick(d)).toFixed(1)}`).join(' L');
    const every = Math.max(1, Math.ceil(days.length / 8));

    return {
      label: `Paper portfolio value against holding, ${days.length} trading days`,
      grid: gridSteps(lo, hi).map((v) => ({ y: y(v), label: `${Math.round(v).toLocaleString('de-DE')} €` })),
      days: days.flatMap((d, i) =>
        i % every === 0 || i === last
          ? [{ x: x(i), label: dayLabel(d.date), anchor: i === 0 ? 'start' : i === last ? 'end' : 'middle' }]
          : [],
      ),
      value: line((d) => d.value),
      hold: line((d) => d.hold),
    };
  });
}
