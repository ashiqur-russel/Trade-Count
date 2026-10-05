import { ChangeDetectionStrategy, Component } from '@angular/core';

/** The Trade Count mark: three stacked lots, the oldest leaving first. Same shape as brand/mark.svg. */
@Component({
  selector: 'tc-brand-mark',
  template: `
    <svg viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <rect class="tile" width="32" height="32" rx="8" />
      <rect class="lot newest" x="6" y="7.5" width="15" height="4.5" rx="2.25" />
      <rect class="lot" x="6" y="13.75" width="15" height="4.5" rx="2.25" />
      <rect class="oldest" x="11" y="20" width="15" height="4.5" rx="2.25" />
    </svg>
  `,
  styles: `
    :host {
      display: inline-flex;
      width: 1em;
      height: 1em;
    }

    svg {
      width: 100%;
      height: 100%;
    }

    .tile {
      fill: var(--tc-color-brand);
    }

    .lot {
      fill: var(--tc-color-brand-contrast);
      fill-opacity: 0.8;
    }

    .newest {
      fill-opacity: 0.55;
    }

    .oldest {
      fill: var(--tc-color-brand-highlight);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BrandMark {}
