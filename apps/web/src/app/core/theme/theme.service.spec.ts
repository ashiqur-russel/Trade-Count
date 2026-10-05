import { TestBed } from '@angular/core/testing';
import { THEME_STORAGE_KEY } from './theme';
import { ThemeService } from './theme.service';

describe('ThemeService', () => {
  const root = document.documentElement;

  beforeEach(() => {
    localStorage.clear();
    delete root.dataset['theme'];
  });

  function createService(): ThemeService {
    const service = TestBed.inject(ThemeService);
    TestBed.tick();
    return service;
  }

  it('follows the OS setting by default, leaving data-theme unset', () => {
    const service = createService();

    expect(service.preference()).toBe('system');
    expect(root.dataset['theme']).toBeUndefined();
  });

  it('applies and remembers an explicit choice', () => {
    const service = createService();
    service.preference.set('dark');
    TestBed.tick();

    expect(root.dataset['theme']).toBe('dark');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
  });

  it('restores the saved choice on start', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'light');

    expect(createService().preference()).toBe('light');
    expect(root.dataset['theme']).toBe('light');
  });

  it('ignores an unknown saved value', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'neon');

    expect(createService().preference()).toBe('system');
  });

  it('clears the attribute and saved value when switching back to system', () => {
    const service = createService();
    service.preference.set('dark');
    TestBed.tick();
    service.preference.set('system');
    TestBed.tick();

    expect(root.dataset['theme']).toBeUndefined();
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();
  });
});
