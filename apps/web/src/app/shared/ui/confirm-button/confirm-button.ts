import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  input,
  output,
  signal,
} from '@angular/core';

const ARMED_FOR_MS = 3000;

/** First click arms it, a second click within 3 s confirms; avoids a modal for destructive actions. Projected content is the idle label. */
@Component({
  selector: 'button[tc-confirm-button]',
  template: `@if (armed()) {
      {{ confirmLabel() }}
    } @else {
      <ng-content />
    }`,
  styles: `
    :host {
      padding: var(--tc-space-1) var(--tc-space-2);
      border: 0;
      border-radius: var(--tc-radius-sm);
      background: transparent;
      color: var(--tc-color-text-muted);
      font: inherit;
      font-size: var(--tc-text-sm);
      cursor: pointer;
    }

    :host(:hover) {
      color: var(--tc-color-loss);
    }

    :host([data-armed='true']) {
      background: var(--tc-color-loss);
      color: var(--tc-color-on-accent);
    }

    :host(:disabled) {
      opacity: 0.45;
      cursor: not-allowed;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    type: 'button',
    '[attr.data-armed]': 'armed()',
    '(click)': 'press()',
  },
})
export class ConfirmButton {
  readonly confirmLabel = input('Confirm');
  readonly confirmed = output();

  protected readonly armed = signal(false);
  private disarmTimer?: ReturnType<typeof setTimeout>;

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.disarmTimer));
  }

  protected press(): void {
    clearTimeout(this.disarmTimer);
    if (this.armed()) {
      this.armed.set(false);
      this.confirmed.emit();
      return;
    }
    this.armed.set(true);
    this.disarmTimer = setTimeout(() => this.armed.set(false), ARMED_FOR_MS);
  }
}
