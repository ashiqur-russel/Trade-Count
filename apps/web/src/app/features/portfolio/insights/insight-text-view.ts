import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { insightText, type TextOptions } from './insight-text';

/** Note text with prices in the chosen currency and plan figures from the user's holding. */
@Component({
  selector: 'tc-insight-text',
  template: `
    @for (segment of segments(); track $index) {
      <span [class.strong]="segment.strong" [attr.data-tone]="segment.tone">{{
        segment.text
      }}</span>
    }
  `,
  styles: `
    [data-tone='gain'] {
      color: var(--tc-color-gain);
    }

    [data-tone='loss'] {
      color: var(--tc-color-loss);
    }

    .strong {
      font-weight: var(--tc-weight-semibold);
    }

    span {
      white-space: pre-wrap;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InsightTextView {
  readonly text = input.required<string>();
  readonly options = input.required<TextOptions>();

  protected readonly segments = computed(() => insightText(this.text(), this.options()));
}
