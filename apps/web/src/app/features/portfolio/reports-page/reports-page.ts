import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { reportYears, yearReport, type ReportMonth } from '@trade-count/ledger';
import { saveTextFile } from '../../../core/files/save-text-file';
import {
  Button,
  EmptyState,
  Panel,
  SegmentedControl,
  Select,
  type SegmentOption,
  type SelectOption,
} from '../../../shared/ui';
import { MonthCharts } from '../components/month-charts/month-charts';
import { ProfitWaterfall } from '../components/profit-waterfall/profit-waterfall';
import { SaleTaxTable } from '../components/sale-tax-table/sale-tax-table';
import { PortfolioStore } from '../data/portfolio-store';
import { TaxRateSetting, rateToPercentText } from '../data/tax-rate-setting';
import { yearReportCsv, yearReportFileName } from '../data/year-report-csv';
import { DISPLAY_PIPES } from '../format/display-pipes';

type ReportView = 'monthly' | 'stocks';

const MONTH_NAMES = Array.from({ length: 12 }, (_, i) =>
  new Intl.DateTimeFormat('en-GB', { month: 'long', timeZone: 'UTC' }).format(
    new Date(Date.UTC(2026, i, 1)),
  ),
);

@Component({
  selector: 'tc-reports-page',
  imports: [
    RouterLink,
    Button,
    Panel,
    EmptyState,
    SegmentedControl,
    Select,
    ProfitWaterfall,
    MonthCharts,
    SaleTaxTable,
    ...DISPLAY_PIPES,
  ],
  templateUrl: './reports-page.html',
  styleUrl: './reports-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportsPage {
  private readonly store = inject(PortfolioStore);
  private readonly taxRate = inject(TaxRateSetting);

  protected readonly viewOptions: readonly SegmentOption<ReportView>[] = [
    { value: 'monthly', label: 'Monthly' },
    { value: 'stocks', label: 'By stock' },
  ];
  protected readonly view = signal<ReportView>('monthly');

  private readonly years = computed(() => reportYears(this.store.trades()));
  protected readonly yearOptions = computed<SelectOption<number>[]>(() =>
    this.years().map((year) => ({ value: year, label: String(year) })),
  );
  private readonly chosenYear = signal<number | null>(null);
  protected readonly year = computed(() => {
    const chosen = this.chosenYear();
    return chosen !== null && this.years().includes(chosen) ? chosen : (this.years()[0] ?? null);
  });

  protected readonly ratePercent = computed(() => rateToPercentText(this.taxRate.rate()));
  protected readonly report = computed(() => {
    const year = this.year();
    return year === null
      ? null
      : yearReport(this.store.stocks(), this.store.trades(), year, this.taxRate.rate());
  });
  protected readonly activeMonths = computed(
    () => this.report()?.months.filter((m) => m.hasTrades) ?? [],
  );

  protected chooseYear(year: number | null): void {
    this.chosenYear.set(year);
  }

  protected monthName(month: ReportMonth): string {
    return MONTH_NAMES[month.month - 1]!;
  }

  protected exportCsv(): void {
    const report = this.report();
    if (report) saveTextFile(yearReportFileName(report.year), yearReportCsv(report), 'text/csv');
  }
}
