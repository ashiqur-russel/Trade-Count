import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Label, control and message for one form input; the control is projected. */
@Component({
  selector: 'tc-field',
  template: `
    <label [for]="controlId()">{{ label() }}</label>
    <ng-content />
    @if (error()) {
      <p class="error" role="alert">{{ error() }}</p>
    } @else if (hint()) {
      <p class="hint">{{ hint() }}</p>
    }
  `,
  styles: `
    :host {
      display: grid;
      gap: var(--tc-space-1);
      min-width: 0;
    }

    label {
      font-size: var(--tc-text-sm);
      font-weight: var(--tc-weight-semibold);
    }

    .error,
    .hint {
      font-size: var(--tc-text-sm);
    }

    .error {
      color: var(--tc-color-loss);
    }

    .hint {
      color: var(--tc-color-text-muted);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Field {
  readonly label = input.required<string>();
  readonly controlId = input.required<string>();
  readonly error = input<string | null>(null);
  readonly hint = input<string | null>(null);
}
