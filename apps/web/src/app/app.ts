import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import type { ThemePreference } from './core/theme/theme';
import { ThemeService } from './core/theme/theme.service';
import { SegmentedControl, type SegmentOption } from './shared/ui';

@Component({
  selector: 'tc-root',
  imports: [RouterOutlet, SegmentedControl],
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
}
