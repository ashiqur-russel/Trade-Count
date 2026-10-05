import { TestBed } from '@angular/core/testing';
import { SwUpdate, type VersionEvent } from '@angular/service-worker';
import { Subject } from 'rxjs';
import { AppUpdate } from './app-update';

describe('AppUpdate', () => {
  function setup(isEnabled = true) {
    const versionUpdates = new Subject<VersionEvent>();
    const unrecoverable = new Subject<unknown>();
    TestBed.configureTestingModule({
      providers: [
        {
          provide: SwUpdate,
          useValue: {
            isEnabled,
            versionUpdates,
            unrecoverable,
            checkForUpdate: vi.fn().mockResolvedValue(false),
          },
        },
      ],
    });
    return { update: TestBed.inject(AppUpdate), versionUpdates, unrecoverable };
  }

  it('is ready only once a new version has finished downloading', () => {
    const { update, versionUpdates } = setup();

    versionUpdates.next({ type: 'VERSION_DETECTED', version: { hash: 'b' } });
    expect(update.ready()).toBe(false);

    versionUpdates.next({
      type: 'VERSION_READY',
      currentVersion: { hash: 'a' },
      latestVersion: { hash: 'b' },
    });
    expect(update.ready()).toBe(true);
  });

  it('asks for a reload when the cached version can no longer run', () => {
    const { update, unrecoverable } = setup();

    unrecoverable.next({ type: 'UNRECOVERABLE_STATE', reason: 'missing file' });

    expect(update.ready()).toBe(true);
  });

  it('stays quiet when service workers are disabled (development, unsupported browsers)', () => {
    const { update, versionUpdates } = setup(false);

    versionUpdates.next({
      type: 'VERSION_READY',
      currentVersion: { hash: 'a' },
      latestVersion: { hash: 'b' },
    });

    expect(update.ready()).toBe(false);
  });
});
