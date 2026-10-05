import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Pill } from '../../../../shared/ui';
import type { OpenLotRow } from '../../data/ledger-views';
import { DISPLAY_PIPES } from '../../format/display-pipes';
import { StockLabel } from '../stock-label/stock-label';

@Component({
  selector: 'tc-open-lots-table',
  imports: [DISPLAY_PIPES, Pill, StockLabel],
  template: `
    <div class="table-scroll">
      <table>
        <thead>
          <tr>
            <th>Stock</th>
            <th>Bought on</th>
            <th class="end">Left / bought</th>
            <th class="end">Buy price</th>
            <th class="end">Open cost</th>
            <th><span class="tc-visually-hidden">Order</span></th>
          </tr>
        </thead>
        <tbody>
          @for (row of rows(); track row.lot.buy.id) {
            <tr>
              <td class="cell-title"><tc-stock-label [stock]="row.stock" /></td>
              <td class="num" data-label="Bought on">{{ row.lot.buy.tradedOn | displayDate }}</td>
              <td class="end num" data-label="Left / bought">
                {{ row.lot.remaining | quantity }}
                <span class="muted">/ {{ row.lot.buy.quantity | quantity }}</span>
              </td>
              <td class="end num" data-label="Buy price">{{ row.lot.buy.price | euro }}</td>
              <td class="end num" data-label="Open cost">
                {{ row.lot.remaining.times(row.lot.buy.price) | euro }}
              </td>
              <td class="cell-badge">
                @if (row.soldNext) {
                  <tc-pill tone="warn">Sold next</tc-pill>
                }
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
  styles: `
    @use 'mixins/data-table';

    @include data-table.data-table;
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OpenLotsTable {
  readonly rows = input.required<OpenLotRow[]>();
}
