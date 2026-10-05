import { backupFileName, type PortfolioBackup } from '@trade-count/local-store';
import { saveTextFile } from './save-text-file';

/** Saves a backup under its standard file name and returns that name. */
export function saveBackupFile(backup: PortfolioBackup): string {
  const fileName = backupFileName(new Date(backup.exportedAt));
  saveTextFile(fileName, JSON.stringify(backup, null, 2));
  return fileName;
}
