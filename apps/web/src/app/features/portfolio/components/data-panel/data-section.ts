import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** One part of the "Your data" panel; content marked `section-status` sits beside the heading. */
@Component({
  selector: 'tc-data-section',
  template: `
    <header class="head">
      <h3>{{ heading() }}</h3>
      <ng-content select="[section-status]" />
    </header>
    <ng-content />
  `,
  styles: `
    :host {
      display: grid;
      gap: var(--tc-space-3);
      min-width: 0;
      padding-top: var(--tc-space-5);
      border-top: var(--tc-rule-width) solid var(--tc-color-rule);
    }

    .head {
      display: flex;
      flex-wrap: wrap;
      gap: var(--tc-space-3);
      align-items: center;
      justify-content: space-between;
    }

    h3 {
      font-size: var(--tc-text-md);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DataSection {
  readonly heading = input.required<string>();
}
