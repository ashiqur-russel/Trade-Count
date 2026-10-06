import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { ReportMonth } from '@trade-count/ledger';
import { formatEuro } from '../../format/display-format';

const MONTH_LABELS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];
const LEFT = 60;
const COLUMN = (1000 - LEFT) / 12;
const BAR = 40;

const INVESTED = { top: 30, base: 100 };
const RESULT = { top: 160, bottom: 280 };
const RUNNING = { top: 320, bottom: 390 };

const compact = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 0 });

interface MonthColumn {
  label: string;
  centre: number;
  x: number;
  invested: { y: number; height: number; text: string } | null;
  kept: { y: number; height: number } | null;
  tax: { y: number; height: number } | null;
  loss: { y: number; height: number } | null;
  resultText: string | null;
  resultTextY: number;
  title: string;
}

/** Invested, result and year-so-far on one shared month axis; each row has its own scale. */
@Component({
  selector: 'tc-month-charts',
  template: `
    <svg viewBox="0 0 1000 430" role="img" [attr.aria-label]="summary()">
      <text x="60" y="18" class="row-title">Invested</text>
      <text x="60" y="148" class="row-title">Result</text>
      <text x="60" y="308" class="row-title">Year so far, after tax</text>

      <line
        [attr.x1]="left"
        x2="1000"
        [attr.y1]="investedBase"
        [attr.y2]="investedBase"
        class="axis"
      />
      <line
        [attr.x1]="left"
        x2="1000"
        [attr.y1]="resultZero()"
        [attr.y2]="resultZero()"
        class="axis"
      />
      <line
        [attr.x1]="left"
        x2="1000"
        [attr.y1]="runningZero()"
        [attr.y2]="runningZero()"
        class="axis"
      />

      @for (column of columns(); track column.label) {
        <g>
          <title>{{ column.title }}</title>
          @if (column.invested; as bar) {
            <rect
              [attr.x]="column.x"
              [attr.y]="bar.y"
              [attr.width]="barWidth"
              [attr.height]="bar.height"
              class="invested"
            />
            <text [attr.x]="column.centre" [attr.y]="investedBase + 16" class="value invested-text">
              {{ bar.text }}
            </text>
          }
          @if (column.kept; as bar) {
            <rect
              [attr.x]="column.x"
              [attr.y]="bar.y"
              [attr.width]="barWidth"
              [attr.height]="bar.height"
              class="kept"
            />
          }
          @if (column.tax; as bar) {
            <rect
              [attr.x]="column.x"
              [attr.y]="bar.y"
              [attr.width]="barWidth"
              [attr.height]="bar.height"
              class="tax"
            />
          }
          @if (column.loss; as bar) {
            <rect
              [attr.x]="column.x"
              [attr.y]="bar.y"
              [attr.width]="barWidth"
              [attr.height]="bar.height"
              class="loss"
            />
          }
          @if (column.resultText) {
            <text [attr.x]="column.centre" [attr.y]="column.resultTextY" class="value">
              {{ column.resultText }}
            </text>
          }
          <text [attr.x]="column.centre" y="418" class="month">{{ column.label }}</text>
        </g>
      }

      <path [attr.d]="runningArea()" class="running-area" />
      <path [attr.d]="runningLine()" class="running-line" />
      @if (runningEnd(); as end) {
        <text [attr.x]="end.x" [attr.y]="end.y" class="value running-text">{{ end.text }}</text>
      }
    </svg>
  `,
  styles: `
    /* Below this width the labels get too small to read, so the chart scrolls instead of shrinking. */
    :host {
      display: block;
      min-width: 0;
      overflow-x: auto;
    }

    svg {
      display: block;
      width: 100%;
      min-width: 48rem;
      height: auto;
    }

    .row-title {
      font-family: var(--tc-font-body);
      font-size: 14px;
      font-weight: 700;
      fill: var(--tc-color-text);
    }

    .axis {
      stroke: var(--tc-color-rule);
      stroke-width: 1;
    }

    .invested {
      fill: var(--tc-color-accent);
    }

    .kept {
      fill: var(--tc-color-gain);
    }

    .tax {
      fill: var(--tc-color-warn);
    }

    .loss {
      fill: var(--tc-color-loss);
    }

    .value {
      font-family: var(--tc-font-numeric);
      font-size: 12px;
      font-weight: 700;
      text-anchor: middle;
      fill: var(--tc-color-text);
    }

    .month {
      font-family: var(--tc-font-numeric);
      font-size: 12px;
      text-anchor: middle;
      fill: var(--tc-color-text-muted);
    }

    .running-area {
      fill: var(--tc-color-gain-subtle);
    }

    .running-line {
      fill: none;
      stroke: var(--tc-color-gain);
      stroke-width: 2.5;
    }

    .running-text {
      text-anchor: end;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MonthCharts {
  readonly months = input.required<ReportMonth[]>();
  protected readonly left = LEFT;
  protected readonly barWidth = BAR;
  protected readonly investedBase = INVESTED.base;

  private readonly resultScale = computed(() => {
    const up = Math.max(0, ...this.months().map((m) => m.profit.toNumber()));
    const down = Math.max(0, ...this.months().map((m) => -m.loss.toNumber()));
    const span = up + down || 1;
    const zero = RESULT.top + ((RESULT.bottom - RESULT.top) * up) / span;
    return { zero, pixelsPerEuro: (RESULT.bottom - RESULT.top) / span };
  });

  private readonly runningScale = computed(() => {
    const values = [0, ...this.months().map((m) => m.runningAfterTax.toNumber())];
    const max = Math.max(...values);
    const min = Math.min(...values);
    const span = max - min || 1;
    return (value: number) =>
      RUNNING.bottom - ((value - min) / span) * (RUNNING.bottom - RUNNING.top);
  });

  protected readonly resultZero = computed(() => this.resultScale().zero);
  protected readonly runningZero = computed(() => this.runningScale()(0));

  protected readonly columns = computed<MonthColumn[]>(() => {
    const maxInvested = Math.max(0, ...this.months().map((m) => m.invested.toNumber())) || 1;
    const { zero, pixelsPerEuro } = this.resultScale();
    return this.months().map((month, i) => {
      const x = LEFT + COLUMN * i + (COLUMN - BAR) / 2;
      const invested = month.invested.toNumber();
      const profit = month.profit.toNumber();
      const tax = month.tax.toNumber();
      const loss = -month.loss.toNumber();
      const investedHeight = (invested / maxInvested) * (INVESTED.base - INVESTED.top);
      const keptHeight = (profit - tax) * pixelsPerEuro;
      const taxHeight = tax * pixelsPerEuro;
      return {
        label: MONTH_LABELS[i]!,
        centre: x + BAR / 2,
        x,
        invested:
          invested > 0
            ? {
                y: INVESTED.base - investedHeight,
                height: investedHeight,
                text: compact.format(invested),
              }
            : null,
        kept: profit > 0 ? { y: zero - keptHeight, height: keptHeight } : null,
        tax: tax > 0 ? { y: zero - keptHeight - taxHeight, height: taxHeight } : null,
        loss: loss > 0 ? { y: zero, height: Math.max(loss * pixelsPerEuro, 2) } : null,
        resultText:
          month.profit.gt(0) || month.loss.lt(0) ? compact.format(month.afterTax.toNumber()) : null,
        resultTextY:
          profit > 0
            ? zero - profit * pixelsPerEuro - 6
            : zero + Math.max(loss * pixelsPerEuro, 2) + 14,
        title:
          `${MONTH_LABELS[i]}: invested ${formatEuro(month.invested)}, profit ${formatEuro(month.profit)}, ` +
          `loss ${formatEuro(month.loss)}, tax ${formatEuro(month.tax)}, after tax ${formatEuro(month.afterTax)}`,
      };
    });
  });

  private readonly runningPoints = computed(() =>
    this.months().map((month, i) => ({
      x: LEFT + COLUMN * i + COLUMN / 2,
      y: this.runningScale()(month.runningAfterTax.toNumber()),
    })),
  );

  protected readonly runningLine = computed(() => {
    const points = this.runningPoints();
    return points.map((p, i) => (i === 0 ? `M${p.x} ${p.y}` : `H${p.x} V${p.y}`)).join(' ');
  });

  protected readonly runningArea = computed(() => {
    const points = this.runningPoints();
    const zero = this.runningZero();
    return `${this.runningLine()} V${zero} H${points[0]!.x} Z`;
  });

  protected readonly runningEnd = computed(() => {
    const last = this.months().at(-1);
    const point = this.runningPoints().at(-1);
    if (!last || !point || last.runningAfterTax.eq(0)) return null;
    return {
      x: point.x + 20,
      y: point.y - 8,
      text: `${formatEuro(last.runningAfterTax)} after tax`,
    };
  });

  protected readonly summary = computed(
    () =>
      this.months()
        .filter((m) => m.hasTrades)
        .map(
          (m) =>
            `${MONTH_LABELS[m.month - 1]}: invested ${formatEuro(m.invested)}, after tax ${formatEuro(m.afterTax)}, ` +
            `year so far ${formatEuro(m.runningAfterTax)}`,
        )
        .join('. ') || 'No trades this year.',
  );
}
