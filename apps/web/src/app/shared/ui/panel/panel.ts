import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** A bordered surface; content marked `panel-actions` sits beside the heading. */
@Component({
  selector: 'tc-panel',
  template: `
    @if (heading()) {
      <header class="head">
        <h2>{{ heading() }}</h2>
        <ng-content select="[panel-actions]" />
      </header>
    }
    <ng-content />
  `,
  styleUrl: './panel.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Panel {
  readonly heading = input<string>();
}
