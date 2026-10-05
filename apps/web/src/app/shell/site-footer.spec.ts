import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { SiteFooter } from './site-footer';

describe('SiteFooter', () => {
  function render(): HTMLElement {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(SiteFooter);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('links the three legal pages inside the app', () => {
    const hrefs = [...render().querySelectorAll('nav a')].map((a) => a.getAttribute('href'));

    expect(hrefs.slice(0, 3)).toEqual(expect.arrayContaining(['/imprint', '/privacy', '/terms']));
  });

  it('links the public source code, opening it safely in a new tab', () => {
    const source = render().querySelector<HTMLAnchorElement>('a[href^="https://github.com/"]')!;

    expect(source.getAttribute('href')).toBe('https://github.com/ashiqur-russel/Trade-Count');
    expect(source.getAttribute('rel')).toBe('noopener');
    expect(source.getAttribute('target')).toBe('_blank');
    expect(source.textContent).toContain('AGPL-3.0');
  });

  it('states that the app is a calculator, not tax or investment advice', () => {
    expect(render().textContent).toContain('not tax or investment advice');
  });
});
