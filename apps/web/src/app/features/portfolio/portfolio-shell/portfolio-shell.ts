import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Button, EmptyState, Panel } from '../../../shared/ui';
import { PortfolioDb } from '../data/portfolio-db';
import { PortfolioStore } from '../data/portfolio-store';
import { PortfolioSync } from '../data/portfolio-sync';

/** Opens the on-device database once for the portfolio and settings pages, and shows its loading state. */
@Component({
  selector: 'tc-portfolio-shell',
  imports: [RouterOutlet, Panel, EmptyState, Button],
  template: `
    @switch (store.loadStatus()) {
      @case ('loading') {
        <tc-panel>
          @if (db.waitingForOtherTab()) {
            <tc-empty-state heading="Trade Count is open in another tab"
              >Close the other tab or window and this one continues by itself. Your data is
              safe.</tc-empty-state
            >
          } @else {
            <tc-empty-state heading="Loading your portfolio"
              >Fetching stocks and trades.</tc-empty-state
            >
          }
        </tc-panel>
      }
      @case ('error') {
        <tc-panel>
          <tc-empty-state heading="Couldn't load your portfolio">{{
            store.loadError()
          }}</tc-empty-state>
          <button tc-button type="button" (click)="store.load()">Try again</button>
        </tc-panel>
      }
      @case ('ready') {
        <router-outlet />
      }
    }
  `,
  styles: `
    :host {
      display: grid;
      min-width: 0;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PortfolioShell {
  protected readonly store = inject(PortfolioStore);
  protected readonly db = inject(PortfolioDb);
  private readonly sync = inject(PortfolioSync);

  constructor() {
    void this.store.load().then(() => this.sync.start());
  }
}
