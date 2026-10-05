import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { Stock } from '@trade-count/ledger';

@Component({
  selector: 'tc-stock-label',
  template: `
    @if (stock(); as stock) {
      <span class="name">{{ stock.name }}</span>
      @if (stock.symbol) {
        <span class="symbol">{{ stock.symbol }}</span>
      }
    } @else {
      <span class="missing">Deleted stock</span>
    }
  `,
  styles: `
    .name {
      font-weight: var(--tc-weight-semibold);
    }

    .symbol {
      margin-left: var(--tc-space-2);
      color: var(--tc-color-text-muted);
      font-family: var(--tc-font-numeric);
      font-size: var(--tc-text-xs);
    }

    .missing {
      color: var(--tc-color-text-muted);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StockLabel {
  readonly stock = input.required<Stock | undefined>();
}
