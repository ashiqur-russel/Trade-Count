import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Pill } from '../../../../shared/ui';
import type { SaleRow } from '../../data/ledger-views';
import { DISPLAY_PIPES } from '../../format/display-pipes';
import { ProfitAmount } from '../profit-amount/profit-amount';
import { StockLabel } from '../stock-label/stock-label';

/** Each sale with the buy lots FIFO matched it against. */
@Component({
  selector: 'tc-sales-table',
  imports: [DISPLAY_PIPES, Pill, ProfitAmount, StockLabel],
  templateUrl: './sales-table.html',
  styleUrl: './sales-table.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SalesTable {
  readonly rows = input.required<SaleRow[]>();
}
