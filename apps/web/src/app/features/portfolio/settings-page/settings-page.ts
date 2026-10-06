import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import type { ThemePreference } from '../../../core/theme/theme';
import { ThemeService } from '../../../core/theme/theme.service';
import { Button, Field, Panel, SegmentedControl, type SegmentOption } from '../../../shared/ui';
import { DataPanel } from '../components/data-panel/data-panel';
import { TaxRateSetting, rateToPercentText } from '../data/tax-rate-setting';

@Component({
  selector: 'tc-settings-page',
  imports: [RouterLink, ReactiveFormsModule, DataPanel, Panel, SegmentedControl, Button, Field],
  template: `
    <header class="head">
      <a class="back" routerLink="/">← Back to your portfolio</a>
      <h1>Settings</h1>
    </header>
    <tc-data-panel />
    <tc-panel heading="Tax estimate">
      <form class="option" (submit)="saveTaxRate($event)">
        <p class="explain">
          Reports estimates tax on each profitable sale at this rate. The default, 26,375 %, is
          Abgeltungsteuer plus Solidaritätszuschlag; add church tax if you pay it.
        </p>
        <div class="rate">
          <tc-field label="Tax rate (%)" controlId="tax-rate" [error]="taxRateError()">
            <input
              id="tax-rate"
              [formControl]="taxRateInput"
              inputmode="decimal"
              autocomplete="off"
            />
          </tc-field>
          <button tc-button type="submit">Save</button>
          <button tc-button variant="quiet" type="button" (click)="resetTaxRate()">Default</button>
        </div>
        @if (taxRateSaved()) {
          <p class="saved" role="status">Saved.</p>
        }
      </form>
    </tc-panel>
    <tc-panel heading="Appearance">
      <div class="option">
        <p class="explain">Auto follows your device's light or dark mode.</p>
        <tc-segmented-control
          label="Colour theme"
          [options]="themeOptions"
          [(value)]="theme.preference"
        />
      </div>
    </tc-panel>
  `,
  styles: `
    :host {
      display: grid;
      gap: var(--tc-space-6);
      width: min(100%, 72ch);
      margin-inline: auto;
    }

    .head {
      display: grid;
      gap: var(--tc-space-2);
    }

    .back {
      width: fit-content;
      color: var(--tc-color-text-muted);
      font-size: var(--tc-text-sm);
      text-decoration: none;
    }

    .back:hover {
      color: var(--tc-color-text);
    }

    h1 {
      font-size: var(--tc-text-xl);
      line-height: 1.1;
    }

    .option {
      display: flex;
      flex-wrap: wrap;
      gap: var(--tc-space-3);
      align-items: center;
      justify-content: space-between;
    }

    .explain {
      color: var(--tc-color-text-muted);
      font-size: var(--tc-text-sm);
    }

    .rate {
      display: flex;
      flex-wrap: wrap;
      gap: var(--tc-space-2);
      align-items: end;
    }

    .rate tc-field {
      width: 9rem;
    }

    .saved {
      color: var(--tc-color-gain);
      font-size: var(--tc-text-sm);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsPage {
  protected readonly theme = inject(ThemeService);
  private readonly taxRate = inject(TaxRateSetting);
  protected readonly taxRateInput = new FormControl(rateToPercentText(this.taxRate.rate()), {
    nonNullable: true,
  });
  protected readonly taxRateError = signal<string | null>(null);
  protected readonly taxRateSaved = signal(false);

  protected saveTaxRate(event: Event): void {
    event.preventDefault();
    const saved = this.taxRate.setPercent(this.taxRateInput.value);
    this.taxRateError.set(saved ? null : 'Enter a percentage between 0 and 100, e.g. 26,375.');
    this.taxRateSaved.set(saved);
  }

  protected resetTaxRate(): void {
    this.taxRate.reset();
    this.taxRateInput.setValue(rateToPercentText(this.taxRate.rate()));
    this.taxRateError.set(null);
    this.taxRateSaved.set(true);
  }
  protected readonly themeOptions: readonly SegmentOption<ThemePreference>[] = [
    { value: 'system', label: 'Auto' },
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
  ];
}
