import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Alert } from '../../../../shared/ui';
import { PortfolioSync } from '../../data/portfolio-sync';

/** Sync lives on the settings page; this brings anything that needs the user's attention to the portfolio page. */
@Component({
  selector: 'tc-sync-attention',
  imports: [Alert, RouterLink],
  template: `
    @if (visibleMessage(); as text) {
      <tc-alert tone="warn" (dismissed)="dismiss(text)">
        {{ text }} <a routerLink="/settings">Open settings</a>
      </tc-alert>
    }
  `,
  styles: `
    :host {
      display: contents;
    }

    a {
      color: inherit;
      font-weight: var(--tc-weight-semibold);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SyncAttention {
  private readonly sync = inject(PortfolioSync);
  /** A dismissed message stays hidden until sync reports something different. */
  private readonly dismissedText = signal<string | null>(null);

  private readonly message = computed(() => {
    const notice = this.sync.notice();
    if (notice) return notice;
    switch (this.sync.status()) {
      case 'conflict':
        return "Sync needs your decision: your devices made changes that can't be combined.";
      case 'locked':
        return 'Enter your sync key to continue syncing on this device.';
      case 'error':
        return `Sync has a problem. ${this.sync.message() ?? ''}`.trim();
      default:
        return null;
    }
  });

  protected readonly visibleMessage = computed(() => {
    const text = this.message();
    return text && text !== this.dismissedText() ? text : null;
  });

  protected dismiss(text: string): void {
    this.dismissedText.set(text);
    if (text === this.sync.notice()) this.sync.notice.set(null);
  }
}
