import { ChangeDetectionStrategy, Component, DOCUMENT, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import type { ThemePreference } from './core/theme/theme';
import { ThemeService } from './core/theme/theme.service';
// Direct imports keep the rest of shared/ui (CDK overlays, forms) out of the initial bundle.
import { BrandMark } from './shared/ui/brand-mark/brand-mark';
import {
  SegmentedControl,
  type SegmentOption,
} from './shared/ui/segmented-control/segmented-control';
import { Backdrop } from './shell/backdrop';
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
    SegmentedControl,
    UpdateBanner,
    InstallHint,
    SiteFooter,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  protected readonly theme = inject(ThemeService);
  protected readonly themeOptions: readonly SegmentOption<ThemePreference>[] = [
    { value: 'system', label: 'Auto' },
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
  ];
  /** The big masthead introduces the app; other pages (legal texts) get a slim bar instead. */
  protected readonly isHome = toSignal(
    inject(Router).events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map((event) => new URL(event.urlAfterRedirects, 'http://x').pathname === '/'),
    ),
    { initialValue: inject(DOCUMENT).location.pathname === '/' },
  );
  protected readonly today = new Intl.DateTimeFormat('de-DE').format(new Date());
}
