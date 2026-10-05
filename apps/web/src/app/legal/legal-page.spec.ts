import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { LegalPage } from './legal-page';

function render(kind: 'imprint' | 'privacy', language: 'en' | 'de') {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      { provide: ActivatedRoute, useValue: { snapshot: { data: { kind, language } } } },
    ],
  });
  const fixture = TestBed.createComponent(LegalPage);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('LegalPage', () => {
  it('shows the German imprint with a switch to the English page and the right document language', () => {
    const page = render('imprint', 'de');

    expect(page.querySelector('h1')?.textContent).toBe('Impressum');
    expect(page.querySelector('article')?.getAttribute('lang')).toBe('de');
    const switcher = page.querySelector<HTMLAnchorElement>('a[hreflang]')!;
    expect(switcher.textContent?.trim()).toBe('English');
    expect(switcher.getAttribute('href')).toBe('/imprint');
  });

  it('shows the English privacy policy with every section heading and a way back', () => {
    const page = render('privacy', 'en');

    expect(page.querySelector('h1')?.textContent).toBe('Privacy policy');
    expect([...page.querySelectorAll('h2')].map((h) => h.textContent)).toContain('Sync (optional)');
    expect(page.querySelector('a[href="/"]')?.textContent).toContain('Back to Trade Count');
    expect(page.querySelector('a[hreflang]')?.getAttribute('href')).toBe('/datenschutz');
  });
});
