import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { monthRealizedProfit } from '@trade-count/ledger';
import { todayIsoDate } from '../../../../shared/dates/iso-date';
import { PortfolioStore } from '../../data/portfolio-store';
import { EuroPipe, QuantityPipe } from '../../format/display-pipes';
import { ProfitAmount } from '../profit-amount/profit-amount';

@Component({
  selector: 'tc-portfolio-summary',
  imports: [RouterLink, EuroPipe, QuantityPipe, ProfitAmount],
  templateUrl: './portfolio-summary.html',
  styleUrl: './portfolio-summary.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PortfolioSummary {
  protected readonly store = inject(PortfolioStore);

  private readonly now = new Date();
  protected readonly monthName = new Intl.DateTimeFormat('en-GB', { month: 'long' }).format(
    this.now,
  );
  protected readonly monthProfit = computed(() =>
    monthRealizedProfit(this.store.ledger(), todayIsoDate(this.now).slice(0, 7)),
  );
}
