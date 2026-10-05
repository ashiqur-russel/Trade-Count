/* Applies the saved theme before first paint (key matches THEME_STORAGE_KEY in src/app/core/theme/theme.ts).
   A separate file, not inline, so the Content-Security-Policy can forbid inline scripts. */
try {
  var theme = localStorage.getItem('tc-theme');
  if (theme === 'light' || theme === 'dark') document.documentElement.dataset.theme = theme;
} catch (e) {}
