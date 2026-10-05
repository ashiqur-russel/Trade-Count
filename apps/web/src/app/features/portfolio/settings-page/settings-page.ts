import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DataPanel } from '../components/data-panel/data-panel';

@Component({
  selector: 'tc-settings-page',
  imports: [RouterLink, DataPanel],
  template: `
    <header class="head">
      <a class="back" routerLink="/">← Back to your portfolio</a>
      <h1>Settings</h1>
    </header>
    <tc-data-panel />
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
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsPage {}
