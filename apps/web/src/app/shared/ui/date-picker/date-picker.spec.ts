import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { DatePicker } from './date-picker';

@Component({
  imports: [DatePicker, ReactiveFormsModule],
  template: `
    <tc-date-picker
      inputId="when"
      [formControl]="control"
      [min]="min()"
      [clearable]="true"
      ariaLabel="Trade date"
    />
  `,
})
class Host {
  readonly control = new FormControl<string | null>('2026-10-05');
  readonly min = signal<string | null>(null);
}

describe('DatePicker', () => {
  async function setup() {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    const trigger = fixture.nativeElement.querySelector('#when') as HTMLButtonElement;
    return { fixture, trigger };
  }

  const day = (iso: string) =>
    document.querySelector<HTMLButtonElement>(`.cdk-overlay-container [data-iso="${iso}"]`)!;

  it('shows the form value in German date format', async () => {
    const { trigger } = await setup();

    expect(trigger.textContent).toContain('05.10.2026');
  });

  it('opens on the month of the value with that day selected, and picks a clicked day', async () => {
    const { fixture, trigger } = await setup();
    trigger.click();
    await fixture.whenStable();

    expect(document.querySelector('.cdk-overlay-container .title')!.textContent).toContain(
      'October 2026',
    );
    expect(day('2026-10-05').getAttribute('aria-selected')).toBe('true');

    day('2026-10-12').click();
    await fixture.whenStable();

    expect(fixture.componentInstance.control.value).toBe('2026-10-12');
  });

  it('moves with the arrow keys and selects with Enter', async () => {
    const { fixture, trigger } = await setup();
    trigger.click();
    await fixture.whenStable();

    day('2026-10-05').dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }),
    );
    await fixture.whenStable();
    day('2026-10-12').dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await fixture.whenStable();

    expect(fixture.componentInstance.control.value).toBe('2026-10-12');
  });

  it('disables days before min', async () => {
    const { fixture, trigger } = await setup();
    fixture.componentInstance.min.set('2026-10-03');
    trigger.click();
    await fixture.whenStable();

    expect(day('2026-10-02').disabled).toBe(true);
    expect(day('2026-10-03').disabled).toBe(false);
  });

  it('clears the value with the clear button', async () => {
    const { fixture } = await setup();
    (fixture.nativeElement.querySelector('.clear') as HTMLButtonElement).click();
    await fixture.whenStable();

    expect(fixture.componentInstance.control.value).toBeNull();
  });
});
