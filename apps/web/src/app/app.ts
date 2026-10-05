import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import type { ThemePreference } from './core/theme/theme';
import { ThemeService } from './core/theme/theme.service';
// Direct imports keep the rest of shared/ui (CDK overlays, forms) out of the initial bundle.
import { BrandMark } from './shared/ui/brand-mark/brand-mark';
import {
  SegmentedControl,
  type SegmentOption,
} from './shared/ui/segmented-control/segmented-control';
import { Backdrop } from './shell/backdrop';
import { InstallHint } from './shell/install-hint';
import { UpdateBanner } from './shell/update-banner';

@Component({
  selector: 'tc-root',
  imports: [RouterOutlet, Backdrop, BrandMark, SegmentedControl, UpdateBanner, InstallHint],
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
  protected readonly today = new Intl.DateTimeFormat('de-DE').format(new Date());
}
