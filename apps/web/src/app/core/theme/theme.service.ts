import { DOCUMENT, Injectable, effect, inject, signal } from '@angular/core';
import { THEME_STORAGE_KEY, isThemePreference, type ThemePreference } from './theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly root = inject(DOCUMENT).documentElement;

  readonly preference = signal<ThemePreference>(readStoredPreference());

  constructor() {
    effect(() => {
      const preference = this.preference();
      if (preference === 'system') delete this.root.dataset['theme'];
      else this.root.dataset['theme'] = preference;
      writeStoredPreference(preference);
    });
  }
}

function readStoredPreference(): ThemePreference {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return isThemePreference(stored) ? stored : 'system';
  } catch {
    return 'system';
  }
}

function writeStoredPreference(preference: ThemePreference): void {
  try {
    if (preference === 'system') localStorage.removeItem(THEME_STORAGE_KEY);
    else localStorage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    // Storage blocked (private mode): the theme still applies for this visit.
  }
}
