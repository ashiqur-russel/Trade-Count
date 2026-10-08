import { ChangeDetectionStrategy, Component, computed, input, linkedSignal } from '@angular/core';
import { Big, winBackPrice, type Sale, type StockLedger } from '@trade-count/ledger';
import { PRICE_LIMITS, QUANTITY_LIMITS } from '@trade-count/local-store';
import { parseDecimalInput } from '../../format/decimal-input';
import { formatQuantity } from '../../format/display-format';
import { DISPLAY_PIPES } from '../../format/display-pipes';

interface BuyBackRow {
  shares: Big;
  sameShares: boolean;
  moneyIn: Big;
  target: Big;
  rise: Big;
}

/** For a sale at a loss: the price the stock must reach to make the loss up, with or without buying back. */
@Component({
  selector: 'tc-win-back',
  imports: [...DISPLAY_PIPES],
  templateUrl: './win-back.html',
  styleUrl: './win-back.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WinBack {
  readonly stockName = input.required<string>();
  readonly sale = input.required<Sale>();
  /** The stock right after this sale, for the shares the user keeps. */
  readonly afterSale = input.required<StockLedger>();
  readonly taxRate = input.required<string>();

  protected readonly loss = computed(() => this.sale().profit.times(-1));
  protected readonly soldShares = computed(() => this.sale().matched);
  protected readonly salePrice = computed(() => new Big(this.sale().sell.price));
  protected readonly taxSaved = computed(() => this.loss().times(this.taxRate()));
  protected readonly ratePercent = computed(() =>
    new Big(this.taxRate()).times(100).toString().replace('.', ','),
  );

  /** Where the shares still held must climb to cover their own cost plus this loss. */
  protected readonly keptTarget = computed(() => {
    const kept = this.afterSale();
    return kept.held.gt(0) ? kept.openCost.plus(this.loss()).div(kept.held) : null;
  });

  protected readonly buyBackSharesText = linkedSignal(() => formatQuantity(this.soldShares()));
  protected readonly buyBackPriceText = linkedSignal(() =>
    this.sale().sell.price.replace('.', ','),
  );

  protected readonly rows = computed<BuyBackRow[]>(() => {
    const shares = parseDecimalInput(this.buyBackSharesText(), QUANTITY_LIMITS);
    const price = parseDecimalInput(this.buyBackPriceText(), PRICE_LIMITS);
    if (!shares || !price) return [];
    const base = new Big(shares);
    const multiples = this.keptTarget()
      ? [base]
      : [base, base.times(1.5).round(0, Big.roundDown), base.times(2)];
    return multiples
      .filter((count, i) => count.gt(0) && (i === 0 || count.gt(base)))
      .map((count) => this.buyBackRow(count, new Big(price)));
  });

  protected readonly headline = computed(() =>
    this.buyBackRow(this.soldShares(), this.salePrice()),
  );

  protected inputValue(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }

  protected riseFrom(target: Big): Big {
    return target.div(this.salePrice()).minus(1);
  }

  private buyBackRow(shares: Big, price: Big): BuyBackRow {
    const target = winBackPrice(this.loss(), shares, price);
    return {
      shares,
      sameShares: shares.eq(this.soldShares()),
      moneyIn: shares.times(price),
      target,
      rise: target.div(price).minus(1),
    };
  }
}
