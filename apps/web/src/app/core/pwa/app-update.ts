import { DOCUMENT, DestroyRef, Injectable, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SwUpdate, type VersionReadyEvent } from '@angular/service-worker';
import { filter } from 'rxjs';

/** Tells the shell when a newly deployed version has been downloaded and is waiting for a reload. */
@Injectable({ providedIn: 'root' })
export class AppUpdate {
  private readonly swUpdate = inject(SwUpdate);
  private readonly document = inject(DOCUMENT);

  readonly ready = signal(false);

  constructor() {
    if (!this.swUpdate.isEnabled) return;

    this.swUpdate.versionUpdates
      .pipe(
        filter((event): event is VersionReadyEvent => event.type === 'VERSION_READY'),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.ready.set(true));
    // The cached version can no longer load safely; only a reload fixes it.
    this.swUpdate.unrecoverable.pipe(takeUntilDestroyed()).subscribe(() => this.ready.set(true));

    const checkOnReturn = () => {
      if (this.document.visibilityState === 'visible')
        this.swUpdate.checkForUpdate().catch(() => undefined);
    };
    this.document.addEventListener('visibilitychange', checkOnReturn);
    inject(DestroyRef).onDestroy(() =>
      this.document.removeEventListener('visibilitychange', checkOnReturn),
    );
  }

  reload(): void {
    this.document.location.reload();
  }
}
