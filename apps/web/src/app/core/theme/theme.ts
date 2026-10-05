/** Must match the [data-theme] blocks in styles/themes/_index.scss. */
export const THEMES = ['light', 'dark'] as const;

export type ThemeName = (typeof THEMES)[number];
export type ThemePreference = ThemeName | 'system';

/** Also read by the inline script in index.html to apply the theme before first paint. */
export const THEME_STORAGE_KEY = 'tc-theme';

export function isThemePreference(value: unknown): value is ThemePreference {
  return value === 'system' || THEMES.includes(value as ThemeName);
}
