import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Button, DatePicker, Field, Panel } from '../../../../shared/ui';
import { LossPotSetting } from '../../data/loss-pot-setting';
import { TaxRateSetting, rateToPercentText } from '../../data/tax-rate-setting';
import { parseDecimalInput } from '../../format/decimal-input';
import { formatEuro } from '../../format/display-format';

const POT_LIMITS = { integerDigits: 9, decimals: 2 };

/** The tax rate and the loss pot carried over from before, which Reports and the sell preview use. */
@Component({
  selector: 'tc-tax-settings',
  imports: [ReactiveFormsModule, Panel, Field, Button, DatePicker],
  template: `
    <tc-panel heading="Tax estimate">
      <form class="block" (submit)="saveRate($event)">
        <p class="explain">
          Reports estimates tax on each profitable sale at this rate. The default, 26,375 %, is
          Abgeltungsteuer plus Solidaritätszuschlag; add church tax if you pay it.
        </p>
        <div class="row">
          <tc-field label="Tax rate (%)" controlId="tax-rate" [error]="rateError()">
            <input id="tax-rate" [formControl]="rateInput" inputmode="decimal" autocomplete="off" />
          </tc-field>
          <button tc-button type="submit">Save</button>
          <button tc-button variant="quiet" type="button" (click)="resetRate()">Default</button>
        </div>
        @if (rateSaved()) {
          <p class="saved" role="status">Saved.</p>
        }
      </form>

      <form class="block pot" (submit)="savePot($event)">
        <h3>Loss pot from before Trade Count</h3>
        <p class="explain">
          Share losses your broker already carried forward (Verlustverrechnungstopf Aktien, on your
          last annual tax statement). Later gains use it up before tax is estimated, and losses you
          record after its date are added to it.
        </p>
        <div class="row">
          <tc-field label="Loss (€)" controlId="loss-pot" [error]="potError()">
            <input
              id="loss-pot"
              [formControl]="potInput"
              inputmode="decimal"
              autocomplete="off"
              placeholder="21.000,00"
            />
          </tc-field>
          <tc-field label="Valid up to" controlId="loss-pot-date">
            <tc-date-picker
              inputId="loss-pot-date"
              ariaLabel="Loss pot valid up to"
              [(value)]="potDate"
            />
          </tc-field>
          <button tc-button type="submit">Save</button>
          @if (lossPot.start()) {
            <button tc-button variant="quiet" type="button" (click)="removePot()">Remove</button>
          }
        </div>
        @if (potStatus(); as status) {
          <p class="saved" role="status">{{ status }}</p>
        }
      </form>
    </tc-panel>
  `,
  styles: `
    .block {
      display: grid;
      gap: var(--tc-space-3);
    }

    .pot {
      padding-top: var(--tc-space-4);
      border-top: var(--tc-rule-width) solid var(--tc-color-border);
    }

    h3 {
      font-size: var(--tc-text-md);
    }

    .explain {
      color: var(--tc-color-text-muted);
      font-size: var(--tc-text-sm);
    }

    .row {
      display: flex;
      flex-wrap: wrap;
      gap: var(--tc-space-2);
      align-items: end;
    }

    .row tc-field {
      width: 10rem;
    }

    .saved {
      color: var(--tc-color-gain);
      font-size: var(--tc-text-sm);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaxSettings {
  private readonly taxRate = inject(TaxRateSetting);
  protected readonly lossPot = inject(LossPotSetting);

  protected readonly rateInput = new FormControl(rateToPercentText(this.taxRate.rate()), {
    nonNullable: true,
  });
  protected readonly rateError = signal<string | null>(null);
  protected readonly rateSaved = signal(false);

  protected readonly potInput = new FormControl(
    this.lossPot.start()?.amount.replace('.', ',') ?? '',
    {
      nonNullable: true,
    },
  );
  protected readonly potDate = signal<string | null>(
    this.lossPot.start()?.validUpTo ?? lastDayOfLastYear(),
  );
  protected readonly potError = signal<string | null>(null);
  protected readonly potStatus = signal<string | null>(null);

  protected saveRate(event: Event): void {
    event.preventDefault();
    const saved = this.taxRate.setPercent(this.rateInput.value);
    this.rateError.set(saved ? null : 'Enter a percentage between 0 and 100, e.g. 26,375.');
    this.rateSaved.set(saved);
  }

  protected resetRate(): void {
    this.taxRate.reset();
    this.rateInput.setValue(rateToPercentText(this.taxRate.rate()));
    this.rateError.set(null);
    this.rateSaved.set(true);
  }

  protected savePot(event: Event): void {
    event.preventDefault();
    const amount = parseDecimalInput(withoutThousandsDots(this.potInput.value), POT_LIMITS);
    const validUpTo = this.potDate();
    if (!amount || !validUpTo) {
      this.potError.set('Enter the loss as an amount above 0, e.g. 21.000,00, and pick its date.');
      this.potStatus.set(null);
      return;
    }
    this.lossPot.save({ amount, validUpTo });
    this.potError.set(null);
    this.potStatus.set(
      `Saved: ${formatEuro(amount)} of losses up to ${validUpTo.split('-').reverse().join('.')}.`,
    );
  }

  protected removePot(): void {
    this.lossPot.clear();
    this.potInput.setValue('');
    this.potError.set(null);
    this.potStatus.set('Loss pot removed.');
  }
}

/** An amount with at most 2 decimals can't mean 21.000 as 21, so those dots group thousands. */
function withoutThousandsDots(raw: string): string {
  const text = raw.trim();
  return /^\d{1,3}(\.\d{3})+$/.test(text) ? text.replaceAll('.', '') : text;
}

function lastDayOfLastYear(): string {
  return `${new Date().getFullYear() - 1}-12-31`;
}
