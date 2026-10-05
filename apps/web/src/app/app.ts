import { ChangeDetectionStrategy, Component, DOCUMENT, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
// Direct imports keep the rest of shared/ui (CDK overlays, forms) out of the initial bundle.
import { BrandMark } from './shared/ui/brand-mark/brand-mark';
import { Backdrop } from './shell/backdrop';
import { SettingsLink } from './shell/settings-link';
import { SiteFooter } from './shell/site-footer';
import { InstallHint } from './shell/install-hint';
import { UpdateBanner } from './shell/update-banner';

@Component({
  selector: 'tc-root',
  imports: [
    RouterOutlet,
    RouterLink,
    Backdrop,
    BrandMark,
    UpdateBanner,
    InstallHint,
    SiteFooter,
    SettingsLink,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  /** The big masthead introduces the app; other pages (legal texts) get a slim bar instead. */
  protected readonly isHome = toSignal(
    inject(Router).events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map((event) => new URL(event.urlAfterRedirects, 'http://x').pathname === '/'),
    ),
    { initialValue: inject(DOCUMENT).location.pathname === '/' },
  );
}
