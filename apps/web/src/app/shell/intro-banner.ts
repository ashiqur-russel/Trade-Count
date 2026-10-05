import { ChangeDetectionStrategy, Component } from '@angular/core';

/** The portfolio page's introduction: what the app does, and the privacy promise. */
@Component({
  selector: 'tc-intro-banner',
  template: `
    <div class="pitch">
      <h1 class="headline">
        Every sale is matched against your oldest open buys first
        <span class="accent">(FIFO)</span> to work out your profit and loss.
      </h1>
      <ul class="traits" aria-label="Highlights">
        <li>FIFO matching</li>
        <li>Works offline</li>
        <li>End-to-end encrypted sync</li>
      </ul>
    </div>
    <aside class="promise" aria-labelledby="privacy-promise">
      <span class="icon" aria-hidden="true">
        <svg viewBox="0 0 24 24">
          <rect x="4.5" y="10.5" width="15" height="10" rx="2" />
          <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
        </svg>
      </span>
      <h2 id="privacy-promise">Private by design</h2>
      <p>
        Your trades are saved in this browser on this device. Nothing leaves it unless you turn on
        sync, and then only an encrypted copy does. No one else, including the people who run this
        site, can read it.
      </p>
    </aside>
  `,
  styles: `
    :host {
      display: grid;
      gap: var(--tc-space-6);
      align-items: center;
      width: var(--tc-page-width);
      margin: 0 auto;
      padding-block: var(--tc-space-8);
      border-bottom: var(--tc-rule-width) solid var(--tc-color-rule);
    }

    @media (width > 880px) {
      :host {
        grid-template-columns: minmax(0, 1fr) minmax(0, 24rem);
        gap: var(--tc-space-12);
      }
    }

    .pitch {
      display: grid;
      gap: var(--tc-space-5);
    }

    .headline {
      max-width: 26ch;
      font-size: var(--tc-text-xl);
      font-weight: var(--tc-weight-bold);
      line-height: 1.12;
      letter-spacing: -0.025em;
      text-wrap: balance;
    }

    .accent {
      color: var(--tc-color-accent);
    }

    .traits {
      display: flex;
      flex-wrap: wrap;
      gap: var(--tc-space-2);
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .traits li {
      padding: var(--tc-space-1) var(--tc-space-3);
      border: var(--tc-rule-width) solid var(--tc-color-rule);
      border-radius: var(--tc-radius-pill);
      font-family: var(--tc-font-numeric);
      font-size: var(--tc-text-xs);
      font-weight: var(--tc-weight-semibold);
      letter-spacing: var(--tc-tracking-label);
      text-transform: uppercase;
    }

    .traits li::before {
      content: '✓ ';
      color: var(--tc-color-gain);
    }

    .promise {
      display: grid;
      gap: var(--tc-space-2);
      padding: var(--tc-space-5);
      border: var(--tc-rule-width) solid var(--tc-color-rule);
      border-left: 3px solid var(--tc-color-accent);
      background: var(--tc-color-surface);
      font-size: var(--tc-text-sm);
    }

    .icon {
      display: inline-grid;
      place-items: center;
      width: 2.25rem;
      height: 2.25rem;
      border-radius: var(--tc-radius-pill);
      background: var(--tc-color-accent-subtle);
      color: var(--tc-color-accent);
    }

    .icon svg {
      width: 1.2rem;
      height: 1.2rem;
      fill: none;
      stroke: currentColor;
      stroke-width: 1.8;
      stroke-linecap: round;
    }

    h2 {
      font-size: var(--tc-text-md);
    }

    .promise p {
      color: var(--tc-color-text-muted);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IntroBanner {}
