import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Big, type YearReport } from '@trade-count/ledger';
import { WholeEuroPipe } from '../../format/display-pipes';

/** How the year's sales used up and refilled the loss pot, and how much gain it still keeps tax-free. */
@Component({
  selector: 'tc-loss-pot-summary',
  imports: [WholeEuroPipe],
  template: `
    @let pot = figures();
    @if (pot.capacity.gt(0)) {
      <div class="bar" role="img" [attr.aria-label]="barLabel()">
        <span class="left" [style.flex-grow]="pot.left.toNumber()"></span>
        <span class="used" [style.flex-grow]="pot.used.toNumber()"></span>
      </div>
    }
    <div class="legend">
      <span>{{ pot.left | wholeEuro }} left</span>
      <span class="moves">
        {{ pot.covered | wholeEuro }} of gains covered, {{ pot.added | wholeEuro }} of loss added
      </span>
    </div>
    <p class="muted">
      @if (pot.left.gt(0)) {
        With this pot you can still make about {{ pot.left | wholeEuro }} of share gains before any
        tax is due.
      } @else {
        The pot is used up: from here on every share gain is taxed until a loss refills it.
      }
    </p>
    <p class="muted small">
      Once the pot is used up, a sale is taxed on the part of its gain the pot no longer covers.
      Losses always go into the pot. An estimate, not tax advice.
    </p>
  `,
  styles: `
    :host {
      display: grid;
      gap: var(--tc-space-2);
    }

    .bar {
      display: flex;
      height: 1.125rem;
      border: 1px solid var(--tc-color-border);
    }

    .left {
      background: var(--tc-color-accent);
    }

    .used {
      background: var(--tc-color-gain);
    }

    .legend {
      display: flex;
      flex-wrap: wrap;
      gap: var(--tc-space-1) var(--tc-space-3);
      justify-content: space-between;
      font-family: var(--tc-font-numeric);
      font-size: var(--tc-text-sm);
      font-variant-numeric: tabular-nums;
    }

    .moves {
      color: var(--tc-color-gain);
    }

    .muted {
      color: var(--tc-color-text-muted);
      font-size: var(--tc-text-sm);
    }

    .small {
      font-size: var(--tc-text-xs);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LossPotSummary {
  readonly report = input.required<YearReport>();

  protected readonly figures = computed(() => {
    const report = this.report();
    const covered = report.sales.reduce((sum, sale) => sum.plus(sale.covered), new Big(0));
    const added = report.potAtEnd.minus(report.potAtStart).plus(covered);
    const capacity = report.potAtStart.plus(added);
    return {
      left: report.potAtEnd,
      used: capacity.minus(report.potAtEnd),
      covered,
      added,
      capacity,
    };
  });

  protected barLabel(): string {
    const { left, capacity } = this.figures();
    return `${Math.round(left.div(capacity).toNumber() * 100)} % of the loss pot is left`;
  }
}
