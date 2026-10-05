import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { InstallPrompt } from '../core/pwa/install-prompt';
import { Button } from '../shared/ui/button/button';

const DISMISSED_KEY = 'tc-install-hint-dismissed';

@Component({
  selector: 'tc-install-hint',
  imports: [Button],
  template: `
    @if (visible()) {
      <div class="banner" role="note">
        <p>
          <strong>Install Trade Count.</strong>
          @if (install.needsManualSteps()) {
            Tap <strong>Share</strong>, then <strong>Add to Home Screen</strong>. Installed, it
            works offline and Safari keeps your data instead of clearing it after 7 days unused.
          } @else {
            It opens like an app, works offline and the browser keeps your data more reliably.
          }
        </p>
        <div class="actions">
          @if (install.canPrompt()) {
            <button tc-button size="sm" variant="primary" type="button" (click)="install.install()">
              Install
            </button>
          }
          <button
            tc-button
            size="sm"
            variant="quiet"
            type="button"
            aria-label="Dismiss install hint"
            (click)="dismiss()"
          >
            Not now
          </button>
        </div>
      </div>
    }
  `,
  styleUrl: './shell-banner.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InstallHint {
  protected readonly install = inject(InstallPrompt);
  private readonly dismissed = signal(readDismissed());

  protected readonly visible = computed(
    () =>
      !this.dismissed() &&
      !this.install.installed() &&
      (this.install.canPrompt() || this.install.needsManualSteps()),
  );

  protected dismiss(): void {
    this.dismissed.set(true);
    try {
      localStorage.setItem(DISMISSED_KEY, '1');
    } catch {
      // Storage blocked: the hint simply returns next visit.
    }
  }
}

function readDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISSED_KEY) === '1';
  } catch {
    return false;
  }
}
