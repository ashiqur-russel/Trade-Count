import { ChangeDetectionStrategy, Component, computed, inject, model, signal } from '@angular/core';
import {
  FormControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { breakEvenWithPastLoss } from '@trade-count/ledger';
import { Button, ConfirmButton, EmptyState, Panel } from '../../../../shared/ui';
import { PortfolioStore } from '../../data/portfolio-store';
import { EuroPipe, QuantityPipe } from '../../format/display-pipes';
import { ProfitAmount } from '../profit-amount/profit-amount';

const SYMBOL_PATTERN = /^[A-Za-z0-9.-]{0,12}$/;

@Component({
  selector: 'tc-stocks-panel',
  imports: [
    ReactiveFormsModule,
    Panel,
    Button,
    ConfirmButton,
    EmptyState,
    EuroPipe,
    QuantityPipe,
    ProfitAmount,
  ],
  templateUrl: './stocks-panel.html',
  styleUrl: './stocks-panel.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StocksPanel {
  protected readonly store = inject(PortfolioStore);
  readonly selectedStockId = model<string | null>(null);

  protected readonly addForm = inject(NonNullableFormBuilder).group({
    name: ['', [Validators.required, Validators.maxLength(60)]],
    symbol: ['', [Validators.pattern(SYMBOL_PATTERN)]],
  });
  protected readonly addError = signal<string | null>(null);

  protected readonly renamingId = signal<string | null>(null);
  protected readonly renameControl = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required],
  });
  protected readonly renameError = signal<string | null>(null);

  protected readonly rows = computed(() => {
    const ledger = this.store.ledger();
    const stocksWithTrades = new Set(this.store.trades().map((t) => t.stockId));
    return this.store.stocks().map((stock) => {
      const entry = ledger.get(stock.id)!;
      return {
        stock,
        entry,
        breakEven: breakEvenWithPastLoss(entry),
        canDelete: !stocksWithTrades.has(stock.id),
      };
    });
  });

  protected toggleFilter(stockId: string): void {
    this.selectedStockId.update((current) => (current === stockId ? null : stockId));
  }

  protected async addStock(): Promise<void> {
    const { name, symbol } = this.addForm.getRawValue();
    if (!name.trim()) {
      this.addError.set("Enter the stock's name.");
      return;
    }
    if (this.addForm.invalid) {
      this.addError.set('Symbols use letters, digits, dots and dashes, up to 12 characters.');
      return;
    }
    this.addError.set(null);
    this.addForm.reset();
    const result = await this.store.addStock({ name, symbol: symbol || null });
    if (!result.ok) {
      this.addForm.setValue({ name, symbol });
      this.addError.set(result.message);
    }
  }

  protected startRename(stockId: string, currentName: string): void {
    this.renamingId.set(stockId);
    this.renameControl.setValue(currentName);
    this.renameError.set(null);
  }

  protected async saveRename(stockId: string): Promise<void> {
    const name = this.renameControl.value.trim();
    if (!name) {
      this.renameError.set("Enter the stock's name.");
      return;
    }
    this.renamingId.set(null);
    const result = await this.store.updateStock(stockId, { name });
    if (!result.ok) {
      this.startRename(stockId, name);
      this.renameError.set(result.message);
    }
  }

  protected async deleteStock(stockId: string): Promise<void> {
    if (this.selectedStockId() === stockId) this.selectedStockId.set(null);
    const result = await this.store.deleteStock(stockId);
    if (!result.ok) this.store.notice.set(result.message);
  }
}
