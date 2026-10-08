import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { ReportFigures, ReportSale } from '@trade-count/ledger';
import {
  DisplayDatePipe,
  EuroPipe,
  QuantityPipe,
  SignedEuroPipe,
} from '../../format/display-pipes';

/** Every sale of the year, one line per lot it used, with profit and estimated tax per share. */
@Component({
  selector: 'tc-sale-tax-table',
  imports: [DisplayDatePipe, EuroPipe, QuantityPipe, SignedEuroPipe],
  template: `
    <div class="table-scroll">
      <table>
        <thead>
          <tr>
            <th>Sold</th>
            <th>Stock</th>
            <th class="end">Shares</th>
            <th class="end">Sale price</th>
            <th class="end">Bought at</th>
            <th class="end">Profit / share</th>
            <th class="end">Tax / share</th>
            <th class="end">Profit</th>
            <th class="end">Tax</th>
            <th class="end">After tax</th>
            <th>Kept / tax</th>
            @if (showPot()) {
              <th class="end">Pot after</th>
            }
          </tr>
        </thead>
        <tbody>
          @for (sale of sales(); track sale.sell.id) {
            @for (lot of sale.lots; track lot.buy.id; let first = $first; let count = $count) {
              <tr [class.sale-start]="first">
                @if (first) {
                  <td class="num" [attr.rowspan]="count">{{ sale.sell.tradedOn | displayDate }}</td>
                  <td class="name" [attr.rowspan]="count">{{ sale.stock.name }}</td>
                }
                <td class="end num">{{ lot.quantity | quantity }}</td>
                @if (first) {
                  <td class="end num" [attr.rowspan]="count">{{ sale.salePrice | euro }}</td>
                }
                <td class="end num">
                  {{ lot.buyPrice | euro }}
                  <span class="muted">{{ lot.buy.tradedOn | displayDate }}</span>
                </td>
                <td class="end num" [attr.data-tone]="tone(lot.profitPerShare)">
                  {{ lot.profitPerShare | signedEuro }}
                </td>
                <td class="end num tax">{{ lot.taxPerShare ? (lot.taxPerShare | euro) : '–' }}</td>
                @if (first) {
                  <td class="end num" [attr.rowspan]="count" [attr.data-tone]="tone(sale.profit)">
                    {{ sale.profit | signedEuro }}
                  </td>
                  <td class="end num tax" [attr.rowspan]="count">
                    @if (sale.covered.gt(0) && sale.tax.eq(0)) {
                      <span class="pot-word">covered</span>
                    } @else if (showPot() && sale.profit.lt(0)) {
                      <span class="pot-word muted">added</span>
                    } @else {
                      {{ sale.tax.times(-1) | euro }}
                      @if (sale.covered.gt(0)) {
                        <span class="covered">{{ sale.covered | euro }} covered</span>
                      }
                    }
                  </td>
                  <td
                    class="end num strong"
                    [attr.rowspan]="count"
                    [attr.data-tone]="tone(sale.afterTax)"
                  >
                    {{ sale.afterTax | signedEuro }}
                  </td>
                  <td [attr.rowspan]="count">
                    @if (sale.profit.gt(0)) {
                      <div class="split" role="img" [attr.aria-label]="splitLabel(sale)">
                        <span class="kept" [style.flex-grow]="sale.afterTax.toNumber()"></span>
                        <span class="taxed" [style.flex-grow]="sale.tax.toNumber()"></span>
                      </div>
                    } @else {
                      <span class="loss-note">{{
                        sale.profit.lt(0) ? 'loss, no tax' : 'no profit'
                      }}</span>
                    }
                  </td>
                  @if (showPot()) {
                    <td class="end num" [attr.rowspan]="count">{{ sale.potAfter | euro }}</td>
                  }
                }
              </tr>
            }
          } @empty {
            <tr>
              <td [attr.colspan]="showPot() ? 12 : 11" class="muted">No sales in this year.</td>
            </tr>
          }
        </tbody>
        @if (sales().length) {
          <tfoot>
            <tr>
              <td colspan="2">Year</td>
              <td class="end num">{{ totals().sharesSold | quantity }}</td>
              <td colspan="4"></td>
              <td class="end num" [attr.data-tone]="tone(totals().profit.plus(totals().loss))">
                {{ totals().profit.plus(totals().loss) | signedEuro }}
              </td>
              <td class="end num tax">{{ totals().tax.times(-1) | euro }}</td>
              <td class="end num" [attr.data-tone]="tone(totals().afterTax)">
                {{ totals().afterTax | signedEuro }}
              </td>
              <td [attr.colspan]="showPot() ? 2 : 1"></td>
            </tr>
          </tfoot>
        }
      </table>
    </div>
  `,
  styles: `
    :host {
      display: block;
      min-width: 0;
    }

    .table-scroll {
      overflow-x: auto;
    }

    table {
      width: 100%;
      min-width: 68rem;
      border-collapse: collapse;
      font-size: var(--tc-text-sm);
    }

    th {
      padding: var(--tc-space-2) var(--tc-space-3);
      border-bottom: var(--tc-rule-width) solid var(--tc-color-rule);
      color: var(--tc-color-text-muted);
      font-family: var(--tc-font-numeric);
      font-size: var(--tc-text-xs);
      font-weight: var(--tc-weight-semibold);
      letter-spacing: var(--tc-tracking-label);
      text-align: left;
      text-transform: uppercase;
      white-space: nowrap;
    }

    td {
      padding: var(--tc-space-2) var(--tc-space-3);
      border-bottom: 1px solid var(--tc-color-border);
      vertical-align: middle;
      white-space: nowrap;
    }

    tr.sale-start td {
      border-top: var(--tc-rule-width) solid var(--tc-color-rule);
    }

    tfoot td {
      border-top: var(--tc-rule-width) solid var(--tc-color-rule);
      border-bottom: 0;
      font-weight: var(--tc-weight-bold);
    }

    .end {
      text-align: right;
    }

    .num {
      font-family: var(--tc-font-numeric);
      font-variant-numeric: tabular-nums;
    }

    .name,
    .strong {
      font-weight: var(--tc-weight-semibold);
    }

    .muted {
      color: var(--tc-color-text-muted);
      font-size: var(--tc-text-xs);
    }

    [data-tone='gain'] {
      color: var(--tc-color-gain);
    }

    [data-tone='loss'] {
      color: var(--tc-color-loss);
    }

    .tax {
      color: var(--tc-color-warn);
    }

    .split {
      display: flex;
      width: 7.5rem;
      height: 0.75rem;
    }

    .kept {
      background: var(--tc-color-gain);
    }

    .taxed {
      background: var(--tc-color-warn);
    }

    .pot-word {
      color: var(--tc-color-accent);
      font-size: var(--tc-text-sm);
    }

    .pot-word.muted {
      color: var(--tc-color-text-muted);
    }

    .covered {
      display: block;
      color: var(--tc-color-text-muted);
      font-size: var(--tc-text-xs);
    }

    .loss-note {
      color: var(--tc-color-loss);
      font-size: var(--tc-text-xs);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SaleTaxTable {
  readonly sales = input.required<ReportSale[]>();
  readonly totals = input.required<ReportFigures>();
  readonly showPot = input(false);

  protected tone(value: {
    gt(n: number): boolean;
    lt(n: number): boolean;
  }): 'gain' | 'loss' | null {
    return value.gt(0) ? 'gain' : value.lt(0) ? 'loss' : null;
  }

  protected splitLabel(sale: ReportSale): string {
    const keptShare = Math.round(sale.afterTax.div(sale.profit).toNumber() * 100);
    return `${keptShare} % kept, ${100 - keptShare} % tax`;
  }
}
