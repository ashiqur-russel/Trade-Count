import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AppUpdate } from '../core/pwa/app-update';
import { Button } from '../shared/ui/button/button';

@Component({
  selector: 'tc-update-banner',
  imports: [Button],
  template: `
    @if (update.ready()) {
      <div class="banner" role="status">
        <p>A new version of Trade Count is ready.</p>
        <button tc-button size="sm" variant="primary" type="button" (click)="update.reload()">
          Reload
        </button>
      </div>
    }
  `,
  styleUrl: './shell-banner.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UpdateBanner {
  protected readonly update = inject(AppUpdate);
}
