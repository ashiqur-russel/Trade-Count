import { ChangeDetectionStrategy, Component } from '@angular/core';

/** Oversized outline lettering behind the page, like a type specimen sheet. */
@Component({
  selector: 'tc-backdrop',
  template: `
    <svg viewBox="0 0 1000 700" preserveAspectRatio="xMaxYMax slice" focusable="false">
      <text x="1040" y="660" text-anchor="end">FIFO</text>
      <circle cx="160" cy="120" r="260" />
    </svg>
  `,
  styles: `
    :host {
      position: fixed;
      inset: 0;
      z-index: -1;
      pointer-events: none;
      opacity: var(--tc-backdrop-opacity);
    }

    svg {
      width: 100%;
      height: 100%;
    }

    text,
    circle {
      fill: none;
      stroke: var(--tc-color-text);
      stroke-width: 1;
      vector-effect: non-scaling-stroke;
    }

    text {
      font-family: var(--tc-font-display);
      font-size: 520px;
      font-weight: var(--tc-weight-black);
      letter-spacing: -0.06em;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'aria-hidden': 'true' },
})
export class Backdrop {}
