import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Select } from './select';

@Component({
  imports: [Select, ReactiveFormsModule],
  template: `<tc-select inputId="pick" [options]="options" [formControl]="control" />`,
})
class Host {
  readonly options = [
    { value: 'amd', label: 'Advanced Micro Devices' },
    { value: 'sap', label: 'SAP' },
  ];
  readonly control = new FormControl<string | null>('amd');
}

describe('Select', () => {
  async function setup() {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    const trigger = fixture.nativeElement.querySelector('#pick') as HTMLButtonElement;
    return { fixture, trigger };
  }

  const options = () => [
    ...document.querySelectorAll<HTMLElement>('.cdk-overlay-container [role=option]'),
  ];

  it('shows the label of the form value on the trigger', async () => {
    const { trigger } = await setup();

    expect(trigger.textContent).toContain('Advanced Micro Devices');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
  });

  it('opens a listbox and writes the picked option back to the form control', async () => {
    const { fixture, trigger } = await setup();
    trigger.click();
    await fixture.whenStable();

    expect(options().map((o) => o.textContent?.trim())).toEqual(['Advanced Micro Devices', 'SAP']);

    options()[1].click();
    await fixture.whenStable();

    expect(fixture.componentInstance.control.value).toBe('sap');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
  });

  it('closes on Escape without changing the value', async () => {
    const { fixture, trigger } = await setup();
    trigger.click();
    await fixture.whenStable();

    document
      .querySelector('.cdk-overlay-pane')!
      .dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await fixture.whenStable();

    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(fixture.componentInstance.control.value).toBe('amd');
  });
});
