import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import {
  Big,
  applyTradeChange,
  computeLedger,
  type Trade,
  type TradeSide,
} from '@trade-count/ledger';
import {
  Button,
  DatePicker,
  Field,
  SegmentedControl,
  Select,
  type SegmentOption,
  type SelectOption,
} from '../../../../shared/ui';
import { PortfolioStore } from '../../data/portfolio-store';
import { todayIsoDate } from '../../../../shared/dates/iso-date';
import { DisplayDatePipe, EuroPipe, QuantityPipe } from '../../format/display-pipes';
import { PRICE_FORMAT, QUANTITY_FORMAT, parseDecimalInput } from '../../format/decimal-input';
import { ProfitAmount } from '../profit-amount/profit-amount';

const PREVIEW_ID = 'preview';

interface FieldErrors {
  stockId?: string;
  quantity?: string;
  price?: string;
}

@Component({
  selector: 'tc-trade-form',
  imports: [
    ReactiveFormsModule,
    Button,
    Field,
    SegmentedControl,
    Select,
    DatePicker,
    ProfitAmount,
    EuroPipe,
    QuantityPipe,
    DisplayDatePipe,
  ],
  templateUrl: './trade-form.html',
  styleUrl: './trade-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TradeForm {
  private readonly store = inject(PortfolioStore);

  /** A trade to edit; null records a new one. */
  readonly editing = input<Trade | null>(null);
  readonly preferredStockId = input<string | null>(null);
  readonly finished = output();

  protected readonly stocks = this.store.stocks;
  protected readonly stockOptions = computed<SelectOption<string>[]>(() =>
    this.stocks().map((s) => ({
      value: s.id,
      label: s.symbol ? `${s.name} (${s.symbol})` : s.name,
    })),
  );
  protected readonly sideOptions: readonly SegmentOption<TradeSide>[] = [
    { value: 'buy', label: 'Buy' },
    { value: 'sell', label: 'Sell' },
  ];
  protected readonly side = signal<TradeSide>('buy');
  protected readonly form = inject(NonNullableFormBuilder).group({
    stockId: [''],
    quantity: [''],
    price: [''],
    tradedOn: [todayIsoDate()],
  });
  protected readonly fieldErrors = signal<FieldErrors>({});
  protected readonly formError = signal<string | null>(null);
  protected readonly saving = signal(false);

  private readonly values = toSignal(this.form.valueChanges, {
    initialValue: this.form.getRawValue(),
  });

  protected readonly draft = computed<Trade | null>(() => {
    const values = { ...this.form.getRawValue(), ...this.values() };
    const quantity = parseDecimalInput(values.quantity, QUANTITY_FORMAT);
    const price = parseDecimalInput(values.price, PRICE_FORMAT);
    if (!values.stockId || !quantity || !price || !values.tradedOn) return null;
    const editing = this.editing();
    return {
      id: editing?.id ?? PREVIEW_ID,
      stockId: values.stockId,
      side: this.side(),
      quantity,
      price,
      tradedOn: values.tradedOn,
      createdAt: editing?.createdAt ?? new Date().toISOString(),
    };
  });

  protected readonly buyTotal = computed(() => {
    const draft = this.draft();
    return draft?.side === 'buy' ? new Big(draft.quantity).times(draft.price) : null;
  });

  /** The sale as FIFO would book it, so the user sees which lots it uses before saving. */
  protected readonly salePreview = computed(() => {
    const draft = this.draft();
    if (draft?.side !== 'sell') return null;
    const change = this.editing()
      ? ({ type: 'update', trade: draft } as const)
      : ({ type: 'add', trade: draft } as const);
    const ledger = computeLedger(
      this.store.stocks(),
      applyTradeChange(this.store.trades(), change),
    );
    return ledger.get(draft.stockId)?.sales.find((s) => s.sell.id === draft.id) ?? null;
  });

  constructor() {
    effect(() => {
      const trade = this.editing();
      if (!trade) return;
      this.side.set(trade.side);
      this.form.setValue({
        stockId: trade.stockId,
        quantity: trade.quantity,
        price: trade.price,
        tradedOn: trade.tradedOn,
      });
      this.clearMessages();
    });

    effect(() => {
      const stocks = this.stocks();
      const current = this.form.controls.stockId.value;
      if (this.editing() || stocks.some((s) => s.id === current)) return;
      const preferred = this.preferredStockId();
      this.form.controls.stockId.setValue(
        stocks.find((s) => s.id === preferred)?.id ?? stocks[0]?.id ?? '',
      );
    });
  }

  protected clearMessages(): void {
    this.fieldErrors.set({});
    this.formError.set(null);
  }

  protected cancelEdit(): void {
    this.reset();
    this.finished.emit();
  }

  protected async submit(): Promise<void> {
    const errors = this.validate();
    this.fieldErrors.set(errors);
    this.formError.set(null);
    const draft = this.draft();
    if (Object.keys(errors).length || !draft) return;

    const { stockId, side, quantity, price, tradedOn } = draft;
    const editing = this.editing();
    this.saving.set(true);
    const result = editing
      ? await this.store.updateTrade(editing.id, { stockId, side, quantity, price, tradedOn })
      : await this.store.addTrade({ stockId, side, quantity, price, tradedOn });
    this.saving.set(false);

    if (!result.ok) {
      this.formError.set(result.message);
      return;
    }
    this.reset();
    if (editing) this.finished.emit();
  }

  private validate(): FieldErrors {
    const { stockId, quantity, price } = this.form.getRawValue();
    const errors: FieldErrors = {};
    if (!stockId) errors.stockId = 'Add a stock first.';
    if (!parseDecimalInput(quantity, QUANTITY_FORMAT)) {
      errors.quantity = 'Enter a quantity above 0, with up to 6 decimals.';
    }
    if (!parseDecimalInput(price, PRICE_FORMAT)) {
      errors.price = 'Enter a price like 560 or 560,50 (up to 4 decimals).';
    }
    return errors;
  }

  private reset(): void {
    this.form.patchValue({ quantity: '', price: '' });
    this.clearMessages();
  }
}
