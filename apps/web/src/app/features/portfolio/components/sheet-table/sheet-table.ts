import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Big } from '@trade-count/ledger';
import { Pill } from '../../../../shared/ui';
import type { SheetLine, SheetTotals } from '../../data/ledger-views';
import { DISPLAY_PIPES } from '../../format/display-pipes';
import { ProfitAmount } from '../profit-amount/profit-amount';
import { StockLabel } from '../stock-label/stock-label';

/** One row per share, like a spreadsheet, with a subtotal per stock. */
@Component({
  selector: 'tc-sheet-table',
  imports: [DISPLAY_PIPES, Pill, ProfitAmount, StockLabel],
  templateUrl: './sheet-table.html',
  styleUrl: './sheet-table.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SheetTable {
  readonly lines = input.required<SheetLine[]>();
  /** Shown as a footer when the ledger covers more than one stock. */
  readonly grandTotal = input<SheetTotals | null>(null);

  protected changeRatio(buyPrice: string, salePrice: string): Big {
    return new Big(salePrice).minus(buyPrice).div(buyPrice);
  }
}
