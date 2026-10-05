import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

export type AlertTone = 'loss' | 'warn' | 'accent';

@Component({
  selector: 'tc-alert',
  template: `
    <p><ng-content /></p>
    <button type="button" aria-label="Dismiss" (click)="dismissed.emit()">✕</button>
  `,
  styles: `
    :host {
      display: flex;
      gap: var(--tc-space-3);
      align-items: start;
      justify-content: space-between;
      padding: var(--tc-space-3) var(--tc-space-4);
      border-radius: var(--tc-radius-md);
      background: var(--tc-color-loss-subtle);
      color: var(--tc-color-loss);
    }

    :host([data-tone='warn']) {
      background: var(--tc-color-warn-subtle);
      color: var(--tc-color-warn);
    }

    :host([data-tone='accent']) {
      background: var(--tc-color-accent-subtle);
      color: var(--tc-color-accent);
    }

    button {
      border: 0;
      background: none;
      color: inherit;
      font: inherit;
      cursor: pointer;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { role: 'alert', '[attr.data-tone]': 'tone()' },
})
export class Alert {
  readonly tone = input<AlertTone>('loss');
  readonly dismissed = output();
}
