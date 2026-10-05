import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { Big, type Trade } from '@trade-count/ledger';
import { Button, ConfirmButton, Pill } from '../../../../shared/ui';
import type { HistoryRow } from '../../data/ledger-views';
import { PortfolioStore } from '../../data/portfolio-store';
import { DISPLAY_PIPES } from '../../format/display-pipes';
import { StockLabel } from '../stock-label/stock-label';

@Component({
  selector: 'tc-trade-history-table',
  imports: [DISPLAY_PIPES, Button, ConfirmButton, Pill, StockLabel],
  templateUrl: './trade-history-table.html',
  styleUrl: './trade-history-table.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TradeHistoryTable {
  protected readonly store = inject(PortfolioStore);

  readonly rows = input.required<HistoryRow[]>();
  readonly editingId = input<string | null>(null);
  readonly edit = output<Trade>();

  protected async delete(trade: Trade): Promise<void> {
    const result = await this.store.deleteTrade(trade.id);
    if (!result.ok) this.store.notice.set(result.message);
  }

  protected total(trade: Trade): Big {
    return new Big(trade.quantity).times(trade.price);
  }
}
