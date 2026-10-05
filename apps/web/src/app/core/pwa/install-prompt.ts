import { DOCUMENT, Injectable, computed, inject, signal } from '@angular/core';

/** Chromium's install event; not in the DOM typings because it isn't a web standard yet. */
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
}

/** Whether and how this browser can install the app (Chromium prompt, or manual steps on iOS Safari). */
@Injectable({ providedIn: 'root' })
export class InstallPrompt {
  private readonly window = inject(DOCUMENT).defaultView!;
  private deferredPrompt: BeforeInstallPromptEvent | null = null;

  readonly installed = signal(this.isStandalone());
  readonly canPrompt = signal(false);
  /** iOS has no install prompt; Share → Add to Home Screen is the only way. */
  readonly needsManualSteps = computed(() => !this.installed() && this.isIos());

  constructor() {
    this.window.addEventListener('beforeinstallprompt', (event) => {
      event.preventDefault();
      this.deferredPrompt = event as BeforeInstallPromptEvent;
      this.canPrompt.set(true);
    });
    this.window.addEventListener('appinstalled', () => {
      this.installed.set(true);
      this.canPrompt.set(false);
    });
  }

  async install(): Promise<void> {
    const prompt = this.deferredPrompt;
    if (!prompt) return;
    this.deferredPrompt = null;
    this.canPrompt.set(false);
    await prompt.prompt();
  }

  private isStandalone(): boolean {
    const iosStandalone = (this.window.navigator as Navigator & { standalone?: boolean })
      .standalone;
    return (
      this.window.matchMedia?.('(display-mode: standalone)').matches === true ||
      iosStandalone === true
    );
  }

  private isIos(): boolean {
    const { userAgent, platform, maxTouchPoints } = this.window.navigator;
    // iPadOS reports itself as a Mac; touch support gives it away.
    return /iPad|iPhone|iPod/.test(userAgent) || (platform === 'MacIntel' && maxTouchPoints > 1);
  }
}
