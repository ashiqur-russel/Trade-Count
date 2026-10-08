import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { ThemePreference } from '../../../core/theme/theme';
import { ThemeService } from '../../../core/theme/theme.service';
import { Panel, SegmentedControl, type SegmentOption } from '../../../shared/ui';
import { DataPanel } from '../components/data-panel/data-panel';
import { TaxSettings } from '../components/tax-settings/tax-settings';

@Component({
  selector: 'tc-settings-page',
  imports: [RouterLink, DataPanel, TaxSettings, Panel, SegmentedControl],
  template: `
    <header class="head">
      <a class="back" routerLink="/">← Back to your portfolio</a>
      <h1>Settings</h1>
    </header>
    <tc-data-panel />
    <tc-tax-settings />
    <tc-panel heading="Appearance">
      <div class="option">
        <p class="explain">Auto follows your device's light or dark mode.</p>
        <tc-segmented-control
          label="Colour theme"
          [options]="themeOptions"
          [(value)]="theme.preference"
        />
      </div>
    </tc-panel>
  `,
  styles: `
    :host {
      display: grid;
      gap: var(--tc-space-6);
      width: min(100%, 72ch);
      margin-inline: auto;
    }

    .head {
      display: grid;
      gap: var(--tc-space-2);
    }

    .back {
      width: fit-content;
      color: var(--tc-color-text-muted);
      font-size: var(--tc-text-sm);
      text-decoration: none;
    }

    .back:hover {
      color: var(--tc-color-text);
    }

    h1 {
      font-size: var(--tc-text-xl);
      line-height: 1.1;
    }

    .option {
      display: flex;
      flex-wrap: wrap;
      gap: var(--tc-space-3);
      align-items: center;
      justify-content: space-between;
    }

    .explain {
      color: var(--tc-color-text-muted);
      font-size: var(--tc-text-sm);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsPage {
  protected readonly theme = inject(ThemeService);
  protected readonly themeOptions: readonly SegmentOption<ThemePreference>[] = [
    { value: 'system', label: 'Auto' },
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
  ];
}
