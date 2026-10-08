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
  compareTrades,
  computeLedger,
  lossPotTimeline,
  openSharesBefore,
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
import { LossPotSetting } from '../../data/loss-pot-setting';
import { PortfolioStore } from '../../data/portfolio-store';
import { TaxRateSetting } from '../../data/tax-rate-setting';
import { todayIsoDate } from '../../../../shared/dates/iso-date';
import { DisplayDatePipe, EuroPipe, QuantityPipe } from '../../format/display-pipes';
import { PRICE_LIMITS, QUANTITY_LIMITS } from '@trade-count/local-store';
import { parseDecimalInput } from '../../format/decimal-input';
import { ProfitAmount } from '../profit-amount/profit-amount';
import { WinBack } from '../win-back/win-back';

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
    WinBack,
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
  private readonly lossPot = inject(LossPotSetting);
  protected readonly taxRate = inject(TaxRateSetting).rate;

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
    const quantity = parseDecimalInput(values.quantity, QUANTITY_LIMITS);
    const price = parseDecimalInput(values.price, PRICE_LIMITS);
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

  /** Shares of the chosen stock open on the chosen date, shown while recording a sale. */
  protected readonly openShares = computed(() => {
    const { stockId, tradedOn } = { ...this.form.getRawValue(), ...this.values() };
    if (this.side() !== 'sell' || !stockId || !tradedOn) return null;
    const editing = this.editing();
    return openSharesBefore(this.store.trades(), {
      id: editing?.id ?? PREVIEW_ID,
      stockId,
      side: 'sell',
      quantity: '0',
      price: '0',
      tradedOn,
      createdAt: editing?.createdAt ?? new Date().toISOString(),
    });
  });

  /** Why the sale as typed can't be saved (too many shares, or it would break a later sale). */
  protected readonly oversellMessage = computed(() => {
    const draft = this.draft();
    if (draft?.side !== 'sell') return null;
    const change = this.editing()
      ? ({ type: 'update', trade: draft } as const)
      : ({ type: 'add', trade: draft } as const);
    return this.store.findOversellMessage(change, draft.id);
  });

  /**
   * The sale as FIFO would book it, so the user sees which lots it uses before saving, plus the
   * stock right after it and what the loss pot does with it.
   */
  protected readonly salePreview = computed(() => {
    const draft = this.draft();
    if (draft?.side !== 'sell') return null;
    const change = this.editing()
      ? ({ type: 'update', trade: draft } as const)
      : ({ type: 'add', trade: draft } as const);
    const trades = applyTradeChange(this.store.trades(), change);
    const ledger = computeLedger(this.store.stocks(), trades);
    const sale = ledger.get(draft.stockId)?.sales.find((s) => s.sell.id === draft.id);
    const afterSale = computeLedger(
      this.store.stocks(),
      trades.filter((t) => compareTrades(t, draft) <= 0),
    ).get(draft.stockId);
    if (!sale || !afterSale) return null;
    const tax = lossPotTimeline(ledger, this.taxRate(), this.lossPot.start()).sales.get(draft.id)!;
    const earlierRealized = afterSale.realizedProfit.minus(sale.profit);
    return {
      sale,
      afterSale,
      tax,
      overallAfter: sale.profit.gt(0) && earlierRealized.lt(0) ? afterSale.realizedProfit : null,
    };
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

  protected sellAllOpenShares(): void {
    const open = this.openShares();
    if (open) this.form.controls.quantity.setValue(open.toString().replace('.', ','));
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
    if (!parseDecimalInput(quantity, QUANTITY_LIMITS)) {
      errors.quantity = 'Enter a quantity above 0, with up to 6 decimals.';
    }
    if (!parseDecimalInput(price, PRICE_LIMITS)) {
      errors.price = 'Enter a price like 560 or 560,50 (up to 4 decimals).';
    }
    return errors;
  }

  private reset(): void {
    this.form.patchValue({ quantity: '', price: '' });
    this.clearMessages();
  }
}
