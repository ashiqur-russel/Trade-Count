import { ChangeDetectionStrategy, Component, DOCUMENT, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
// Direct imports keep the rest of shared/ui (CDK overlays, forms) out of the initial bundle.
import { InsightsKeyStore } from './features/portfolio/insights/insights-key-store';
import { BrandMark } from './shared/ui/brand-mark/brand-mark';
import { Backdrop } from './shell/backdrop';
import { IntroBanner } from './shell/intro-banner';
import { SettingsLink } from './shell/settings-link';
import { SiteFooter } from './shell/site-footer';
import { InstallHint } from './shell/install-hint';
import { UpdateBanner } from './shell/update-banner';

@Component({
  selector: 'tc-root',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    Backdrop,
    BrandMark,
    UpdateBanner,
    InstallHint,
    SiteFooter,
    SettingsLink,
    IntroBanner,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  protected readonly insightsKeyStored = inject(InsightsKeyStore).stored;
  protected readonly today = new Intl.DateTimeFormat('de-DE').format(new Date());
  /** Only the portfolio page shows the introduction banner. */
  protected readonly isHome = toSignal(
    inject(Router).events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map((event) => new URL(event.urlAfterRedirects, 'http://x').pathname === '/'),
    ),
    { initialValue: inject(DOCUMENT).location.pathname === '/' },
  );
}
