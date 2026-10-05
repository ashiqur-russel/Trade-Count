import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { saveBackupFile } from '../../../../core/files/save-backup-file';
import { saveTextFile } from '../../../../core/files/save-text-file';
import {
  Alert,
  Button,
  ConfirmButton,
  Field,
  Panel,
  Pill,
  type PillTone,
} from '../../../../shared/ui';
import { PortfolioStore } from '../../data/portfolio-store';
import { PortfolioSync, type SyncStatus } from '../../data/portfolio-sync';

const MAX_LISTED_CHANGES = 8;

type View = 'overview' | 'create' | 'join';

const STATUS_BADGES: Record<SyncStatus, { tone: PillTone; label: string }> = {
  off: { tone: 'neutral', label: 'Off' },
  locked: { tone: 'warn', label: 'Key needed' },
  idle: { tone: 'gain', label: 'Synced' },
  syncing: { tone: 'accent', label: 'Syncing…' },
  offline: { tone: 'warn', label: 'Offline' },
  conflict: { tone: 'loss', label: 'Needs attention' },
  error: { tone: 'loss', label: 'Problem' },
};

const timeFormat = new Intl.DateTimeFormat('de-DE', { hour: '2-digit', minute: '2-digit' });

@Component({
  selector: 'tc-sync-panel',
  imports: [ReactiveFormsModule, Panel, Pill, Button, ConfirmButton, Alert, Field],
  templateUrl: './sync-panel.html',
  styleUrl: './sync-panel.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SyncPanel {
  protected readonly sync = inject(PortfolioSync);
  private readonly store = inject(PortfolioStore);

  protected readonly view = signal<View>('overview');
  protected readonly newKey = signal('');
  protected readonly keySaved = signal(false);
  protected readonly rememberKey = signal(true);
  protected readonly revealedKey = signal<string | null>(null);
  protected readonly copied = signal(false);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly joinKey = new FormControl('', { nonNullable: true });

  protected readonly badge = computed(() => STATUS_BADGES[this.sync.status()]);
  protected readonly lastSynced = computed(() => {
    const at = this.sync.lastSyncedAt();
    return at ? timeFormat.format(new Date(at)) : null;
  });
  protected readonly conflictSides = computed(() => {
    const conflict = this.sync.conflict();
    if (!conflict) return null;
    const side = (lines: string[]) => ({
      shown: lines.slice(0, MAX_LISTED_CHANGES),
      hidden: Math.max(0, lines.length - MAX_LISTED_CHANGES),
    });
    return { thisDevice: side(conflict.onThisDevice), syncedCopy: side(conflict.onSyncedCopy) };
  });
  protected readonly showProblem = computed(() =>
    ['error', 'conflict', 'offline'].includes(this.sync.status()),
  );

  protected async startCreating(): Promise<void> {
    this.reset();
    this.newKey.set(await this.sync.newKey());
    this.view.set('create');
  }

  protected startJoining(): void {
    this.reset();
    this.view.set('join');
  }

  protected cancel(): void {
    this.reset();
    this.view.set('overview');
  }

  protected async confirmCreate(): Promise<void> {
    await this.run(() => this.sync.turnOn(this.newKey(), this.rememberKey()));
  }

  protected async confirmJoin(): Promise<void> {
    if (!this.joinKey.value.trim()) {
      this.error.set('Enter the sync key from your other device.');
      return;
    }
    await this.run(() => this.sync.join(this.joinKey.value, this.rememberKey()));
  }

  protected async unlock(): Promise<void> {
    if (!this.joinKey.value.trim()) {
      this.error.set('Enter your sync key.');
      return;
    }
    await this.run(() => this.sync.unlock(this.joinKey.value));
  }

  protected async leaveWithoutKey(): Promise<void> {
    await this.sync.leaveWithoutKey();
  }

  protected async syncNow(): Promise<void> {
    this.busy.set(true);
    await this.sync.sync();
    this.busy.set(false);
  }

  protected async keepThisDevice(): Promise<void> {
    await this.run(() => this.sync.resolveConflict('keep-this-device'));
  }

  /** The synced copy replaces this device's data, so a backup of it is saved first. */
  protected async useSyncedCopy(): Promise<void> {
    const backup = await this.store.exportBackup();
    if (!backup.ok) {
      this.error.set(`Couldn't save a backup first, so nothing was changed. ${backup.message}`);
      return;
    }
    saveBackupFile(backup.backup);
    await this.run(() => this.sync.resolveConflict('use-synced-copy'));
  }

  protected async turnOff(): Promise<void> {
    await this.run(() => this.sync.turnOff());
  }

  protected toggleKey(): void {
    this.revealedKey.update((shown) => (shown ? null : this.sync.currentKey()));
  }

  protected async copy(key: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(key);
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    } catch {
      this.error.set("Couldn't copy automatically. Select the key and copy it by hand.");
    }
  }

  protected download(key: string): void {
    saveTextFile(
      'trade-count-sync-key.txt',
      `Trade Count sync key\n\n${key}\n\nKeep this file somewhere safe (a password manager, iCloud Drive or Google Drive).\n` +
        'Anyone with this key can read your synced portfolio. If you lose it and all your devices, the synced copy cannot be recovered.\n',
      'text/plain',
    );
  }

  private async run(
    action: () => Promise<{ ok: true } | { ok: false; message: string }>,
  ): Promise<void> {
    this.error.set(null);
    this.busy.set(true);
    const result = await action();
    this.busy.set(false);
    if (!result.ok) {
      this.error.set(result.message);
      return;
    }
    this.reset();
    this.view.set('overview');
  }

  private reset(): void {
    this.newKey.set('');
    this.keySaved.set(false);
    this.rememberKey.set(true);
    this.revealedKey.set(null);
    this.copied.set(false);
    this.error.set(null);
    this.joinKey.reset();
  }
}
