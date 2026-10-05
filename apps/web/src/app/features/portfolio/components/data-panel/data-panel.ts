import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Panel } from '../../../../shared/ui';
import { BackupPanel } from '../backup-panel/backup-panel';
import { SyncPanel } from '../sync-panel/sync-panel';

@Component({
  selector: 'tc-data-panel',
  imports: [Panel, SyncPanel, BackupPanel],
  template: `
    <tc-panel heading="Your data">
      <p class="lead">
        Stored only in this browser. Sync it, end-to-end encrypted, to your other devices, or keep a
        backup file.
      </p>
      <tc-sync-panel />
      <tc-backup-panel />
    </tc-panel>
  `,
  styles: `
    .lead {
      color: var(--tc-color-text-muted);
      font-size: var(--tc-text-sm);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DataPanel {}
