import { TestBed } from '@angular/core/testing';
import { InstallPrompt } from './install-prompt';

describe('InstallPrompt', () => {
  it('offers the browser install prompt once Chromium announces it, and uses it only once', async () => {
    const service = TestBed.inject(InstallPrompt);
    const prompt = vi.fn().mockResolvedValue(undefined);
    const event = Object.assign(new Event('beforeinstallprompt', { cancelable: true }), { prompt });

    window.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    expect(service.canPrompt()).toBe(true);

    await service.install();
    await service.install();

    expect(prompt).toHaveBeenCalledTimes(1);
    expect(service.canPrompt()).toBe(false);
  });

  it('counts as installed after the browser reports the install', () => {
    const service = TestBed.inject(InstallPrompt);

    window.dispatchEvent(new Event('appinstalled'));

    expect(service.installed()).toBe(true);
    expect(service.needsManualSteps()).toBe(false);
  });
});
