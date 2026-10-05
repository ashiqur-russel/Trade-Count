import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type PillTone = 'neutral' | 'accent' | 'gain' | 'loss' | 'warn';

@Component({
  selector: 'tc-pill',
  template: '<ng-content />',
  styleUrl: './pill.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[attr.data-tone]': 'tone()' },
})
export class Pill {
  readonly tone = input<PillTone>('neutral');
}
