import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Big, type ReportFigures } from '@trade-count/ledger';
import { formatEuro, formatPercent, formatSignedEuro } from '../../format/display-format';

interface Step {
  label: string;
  amount: string;
  tone: 'gain' | 'loss' | 'tax' | 'keep';
  x: number;
  y: number;
  height: number;
  labelY: number;
}

const TOP = 40;
const BOTTOM = 220;
const BAR_WIDTH = 140;
const SLOT = 250;
const STEP_X = [0, 1, 2, 3].map((i) => i * SLOT + (SLOT - BAR_WIDTH) / 2);

/** Profit, minus losses, minus estimated tax: what the year leaves you with. */
@Component({
  selector: 'tc-profit-waterfall',
  template: `
    <div class="chart-scroll">
      <svg viewBox="0 0 1000 270" role="img" [attr.aria-label]="summary()">
        <line x1="0" x2="1000" [attr.y1]="zeroY()" [attr.y2]="zeroY()" class="axis" />
        @for (step of steps(); track step.label; let last = $last) {
          @if (step.height > 0) {
            <rect
              [attr.x]="step.x"
              [attr.y]="step.y"
              [attr.width]="barWidth"
              [attr.height]="step.height"
              [attr.class]="step.tone"
            />
          }
          @if (!last) {
            <line
              [attr.x1]="step.x + barWidth"
              [attr.x2]="step.x + slot"
              [attr.y1]="connectorY($index)"
              [attr.y2]="connectorY($index)"
              class="connector"
            />
          }
          <text
            [attr.x]="step.x + barWidth / 2"
            [attr.y]="step.labelY"
            class="amount"
            [attr.data-tone]="step.tone"
          >
            {{ step.amount }}
          </text>
          <text [attr.x]="step.x + barWidth / 2" y="250" class="label">{{ step.label }}</text>
        }
      </svg>
    </div>
    <p>{{ sentence() }}</p>
  `,
  styles: `
    :host {
      display: grid;
      gap: var(--tc-space-2);
      min-width: 0;
    }

    /* Below this width the labels get too small to read, so the chart scrolls instead of shrinking. */
    .chart-scroll {
      overflow-x: auto;
    }

    svg {
      display: block;
      width: 100%;
      min-width: 36rem;
      height: auto;
    }

    .axis {
      stroke: var(--tc-color-rule);
      stroke-width: 1.5;
    }

    .connector {
      stroke: var(--tc-color-rule);
      stroke-dasharray: 4 4;
    }

    .gain {
      fill: var(--tc-color-gain);
    }

    .loss {
      fill: var(--tc-color-loss);
    }

    .tax {
      fill: var(--tc-color-warn);
    }

    .keep {
      fill: var(--tc-color-text);
    }

    .amount {
      font-family: var(--tc-font-numeric);
      font-size: 18px;
      font-weight: 700;
      text-anchor: middle;
      fill: var(--tc-color-text);
    }

    .amount[data-tone='gain'] {
      fill: var(--tc-color-gain);
    }

    .amount[data-tone='loss'] {
      fill: var(--tc-color-loss);
    }

    .amount[data-tone='tax'] {
      fill: var(--tc-color-warn);
    }

    .label {
      font-family: var(--tc-font-body);
      font-size: 16px;
      font-weight: 600;
      text-anchor: middle;
      fill: var(--tc-color-text);
    }

    p {
      color: var(--tc-color-text-muted);
      font-size: var(--tc-text-sm);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfitWaterfall {
  readonly figures = input.required<ReportFigures>();
  protected readonly barWidth = BAR_WIDTH;
  protected readonly slot = SLOT;

  /** Running level after each step: profit, then minus losses, then minus tax. */
  private readonly levels = computed(() => {
    const { profit, loss, tax } = this.figures();
    const afterLosses = profit.plus(loss);
    return [profit, afterLosses, afterLosses.minus(tax)];
  });

  private readonly scale = computed(() => {
    const values = [new Big(0), ...this.levels()];
    const max = values.reduce((a, b) => (b.gt(a) ? b : a)).toNumber();
    const min = values.reduce((a, b) => (b.lt(a) ? b : a)).toNumber();
    const span = max - min || 1;
    return (value: number) => BOTTOM - ((value - min) / span) * (BOTTOM - TOP);
  });

  protected readonly zeroY = computed(() => this.scale()(0));

  protected readonly steps = computed<Step[]>(() => {
    const { profit, loss, tax, afterTax } = this.figures();
    const [afterProfit, afterLosses, kept] = this.levels().map((level) => level.toNumber());
    const bar = (from: number, to: number) => {
      const y1 = this.scale()(from);
      const y2 = this.scale()(to);
      // A step that changes nothing draws no bar; a tiny non-zero one stays visible.
      return { y: Math.min(y1, y2), height: from === to ? 0 : Math.max(Math.abs(y2 - y1), 1) };
    };
    const steps: Omit<Step, 'labelY'>[] = [
      {
        label: 'Profit',
        amount: formatSignedEuro(profit),
        tone: 'gain',
        x: STEP_X[0]!,
        ...bar(0, afterProfit!),
      },
      {
        label: 'Losses',
        amount: formatSignedEuro(loss),
        tone: 'loss',
        x: STEP_X[1]!,
        ...bar(afterProfit!, afterLosses!),
      },
      {
        label: 'Tax (est.)',
        amount: formatSignedEuro(tax.times(-1)),
        tone: 'tax',
        x: STEP_X[2]!,
        ...bar(afterLosses!, kept!),
      },
      {
        label: 'You keep',
        amount: formatEuro(afterTax),
        tone: 'keep',
        x: STEP_X[3]!,
        ...bar(0, kept!),
      },
    ];
    return steps.map((step) => ({ ...step, labelY: Math.max(step.y - 10, 18) }));
  });

  protected connectorY(index: number): number {
    return this.scale()(this.levels()[Math.min(index, 2)]!.toNumber());
  }

  protected readonly summary = computed(() => {
    const { profit, loss, tax, afterTax } = this.figures();
    return `Profit ${formatEuro(profit)}, losses ${formatEuro(loss)}, estimated tax ${formatEuro(tax)}, you keep ${formatEuro(afterTax)}.`;
  });

  protected readonly sentence = computed(() => {
    const { profit, tax, afterTax } = this.figures();
    if (profit.eq(0)) return 'No profitable sales this year, so no tax is estimated.';
    const taxShare = formatPercent(tax.div(profit)).replace('+', '');
    const keptShare = formatPercent(afterTax.div(profit)).replace('+', '');
    return `Tax takes ${taxShare} of this year's profit. You keep ${keptShare} of it.`;
  });
}
