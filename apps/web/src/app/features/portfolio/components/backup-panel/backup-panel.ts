import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import {
  StoreError,
  backupFileName,
  parseBackup,
  type PortfolioBackup,
} from '@trade-count/local-store';
import { saveTextFile } from '../../../../core/files/save-text-file';
import { formatIsoDate } from '../../../../shared/dates/iso-date';
import { Button, Panel, Pill, type PillTone } from '../../../../shared/ui';
import { PortfolioStore } from '../../data/portfolio-store';

const STALE_AFTER_DAYS = 14;
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const DAY_MS = 86_400_000;

interface Message {
  tone: 'gain' | 'loss';
  text: string;
}

@Component({
  selector: 'tc-backup-panel',
  imports: [Panel, Pill, Button],
  templateUrl: './backup-panel.html',
  styleUrl: './backup-panel.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BackupPanel {
  protected readonly store = inject(PortfolioStore);

  protected readonly preview = signal<PortfolioBackup | null>(null);
  protected readonly message = signal<Message | null>(null);
  protected readonly busy = signal(false);

  protected readonly status = computed<{ tone: PillTone; label: string }>(() => {
    const last = this.store.lastBackupAt();
    const hasData = this.store.trades().length > 0;
    if (!last) return { tone: hasData ? 'warn' : 'neutral', label: 'Never backed up' };
    const days = Math.floor((Date.now() - Date.parse(last)) / DAY_MS);
    const when = days <= 0 ? 'today' : days === 1 ? 'yesterday' : `${days} days ago`;
    return {
      tone: days > STALE_AFTER_DAYS && hasData ? 'warn' : 'neutral',
      label: `Last backup ${when}`,
    };
  });

  protected formatDate(iso: string): string {
    return formatIsoDate(iso.slice(0, 10));
  }

  protected async exportBackup(): Promise<void> {
    this.message.set(null);
    this.busy.set(true);
    const result = await this.store.exportBackup();
    this.busy.set(false);
    if (!result.ok) {
      this.message.set({ tone: 'loss', text: result.message });
      return;
    }
    const exportedAt = new Date(result.backup.exportedAt);
    saveTextFile(backupFileName(exportedAt), JSON.stringify(result.backup, null, 2));
    this.message.set({
      tone: 'gain',
      text: `Saved ${backupFileName(exportedAt)}. Keep it somewhere safe, like iCloud Drive or Google Drive.`,
    });
  }

  protected async chooseFile(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    this.message.set(null);
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) {
      this.message.set({
        tone: 'loss',
        text: 'This file is too large to be a Trade Count backup.',
      });
      return;
    }
    try {
      this.preview.set(parseBackup(JSON.parse(await file.text())));
    } catch (error) {
      const text =
        error instanceof StoreError ? error.message : "This file isn't a Trade Count backup.";
      this.message.set({ tone: 'loss', text });
    }
  }

  protected async confirmRestore(backup: PortfolioBackup): Promise<void> {
    this.busy.set(true);
    const result = await this.store.restoreBackup(backup);
    this.busy.set(false);
    this.preview.set(null);
    this.message.set(
      result.ok
        ? { tone: 'gain', text: `Restored the backup from ${this.formatDate(backup.exportedAt)}.` }
        : { tone: 'loss', text: result.message },
    );
  }
}
