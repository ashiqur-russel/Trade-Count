import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { PortfolioStore } from '../../data/portfolio-store';
import { EuroPipe, QuantityPipe } from '../../format/display-pipes';
import { ProfitAmount } from '../profit-amount/profit-amount';

@Component({
  selector: 'tc-portfolio-summary',
  imports: [EuroPipe, QuantityPipe, ProfitAmount],
  templateUrl: './portfolio-summary.html',
  styleUrl: './portfolio-summary.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PortfolioSummary {
  protected readonly store = inject(PortfolioStore);
}
