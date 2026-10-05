import { ChangeDetectionStrategy, Component, model } from '@angular/core';

/** A checkbox with its explanation beside it; the projected content is the label. */
@Component({
  selector: 'tc-check-row',
  template: `
    <label>
      <input type="checkbox" [checked]="checked()" (change)="toggle($event)" />
      <span><ng-content /></span>
    </label>
  `,
  styles: `
    label {
      display: flex;
      gap: var(--tc-space-3);
      align-items: flex-start;
      font-size: var(--tc-text-sm);
      cursor: pointer;
    }

    input {
      flex-shrink: 0;
      margin-top: 0.2em;
      accent-color: var(--tc-color-accent);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CheckRow {
  readonly checked = model(false);

  protected toggle(event: Event): void {
    this.checked.set((event.target as HTMLInputElement).checked);
  }
}
