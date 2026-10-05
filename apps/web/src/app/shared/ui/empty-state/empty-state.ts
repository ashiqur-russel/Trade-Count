import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'tc-empty-state',
  template: `
    <strong>{{ heading() }}</strong>
    <span><ng-content /></span>
  `,
  styles: `
    :host {
      display: grid;
      gap: var(--tc-space-2);
      justify-items: center;
      padding: var(--tc-space-6) var(--tc-space-3);
      color: var(--tc-color-text-muted);
      text-align: center;
    }

    strong {
      color: var(--tc-color-text);
      font-weight: var(--tc-weight-semibold);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmptyState {
  readonly heading = input.required<string>();
}
