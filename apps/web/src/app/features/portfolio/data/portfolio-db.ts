import { Injectable, signal, type OnDestroy } from '@angular/core';
import type {
  DbFailure,
  DbNotice,
  DbRequest,
  DbResponse,
  PortfolioDbMethod,
  PortfolioDbMethods,
} from './portfolio-db-protocol';

export class PortfolioDbError extends Error {
  constructor(readonly failure: DbFailure) {
    super(failure.message);
    this.name = 'PortfolioDbError';
  }
}

const WORKER_FAILED: DbFailure = {
  code: 'UNAVAILABLE',
  message:
    "Couldn't start the on-device database. Reload the page; if it keeps happening, this browser may not support it.",
};

interface Pending {
  resolve: (value: unknown) => void;
  reject: (reason: PortfolioDbError) => void;
}

/** The page's handle on the on-device database, which runs in a worker so the UI never blocks. */
@Injectable()
export class PortfolioDb implements OnDestroy {
  private readonly worker = new Worker(new URL('./portfolio-db.worker', import.meta.url), {
    type: 'module',
  });
  private readonly pending = new Map<number, Pending>();
  private nextRequestId = 0;
  /** True while another tab of this app holds the database and this tab waits for it. */
  readonly waitingForOtherTab = signal(false);
  /** Set once the worker itself failed to load; every call fails fast from then on. */
  private failure: DbFailure | null = null;

  constructor() {
    this.worker.addEventListener('error', (event) => {
      event.preventDefault();
      this.failAll(WORKER_FAILED);
    });
    this.worker.addEventListener('message', ({ data }: MessageEvent<DbResponse | DbNotice>) => {
      if ('notice' in data) {
        this.waitingForOtherTab.set(data.notice === 'waiting-for-other-tab');
        return;
      }
      this.waitingForOtherTab.set(false);
      const pending = this.pending.get(data.id);
      if (!pending) return;
      this.pending.delete(data.id);
      if (data.ok) pending.resolve(data.result);
      else pending.reject(new PortfolioDbError(data.failure));
    });
  }

  call<M extends PortfolioDbMethod>(
    method: M,
    ...args: Parameters<PortfolioDbMethods[M]>
  ): Promise<ReturnType<PortfolioDbMethods[M]>> {
    if (this.failure) return Promise.reject(new PortfolioDbError(this.failure));
    const request: DbRequest<M> = { id: this.nextRequestId++, method, args };
    return new Promise((resolve, reject) => {
      this.pending.set(request.id, { resolve: resolve as (value: unknown) => void, reject });
      this.worker.postMessage(request);
    });
  }

  private failAll(failure: DbFailure): void {
    this.failure = failure;
    for (const pending of this.pending.values()) pending.reject(new PortfolioDbError(failure));
    this.pending.clear();
  }

  ngOnDestroy(): void {
    this.worker.terminate();
  }
}
