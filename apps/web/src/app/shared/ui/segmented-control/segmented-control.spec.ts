import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SegmentedControl } from './segmented-control';

@Component({
  imports: [SegmentedControl],
  template: `<tc-segmented-control label="Side" [options]="options" [(value)]="side" />`,
})
class Host {
  readonly options = [
    { value: 'buy', label: 'Buy' },
    { value: 'sell', label: 'Sell' },
  ] as const;
  readonly side = signal<'buy' | 'sell'>('buy');
}

describe('SegmentedControl', () => {
  it('checks the option matching the bound value and updates it when another is picked', async () => {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    const radios = fixture.nativeElement.querySelectorAll(
      'input[type=radio]',
    ) as NodeListOf<HTMLInputElement>;

    expect([...radios].map((r) => r.checked)).toEqual([true, false]);

    radios[1].click();
    await fixture.whenStable();

    expect(fixture.componentInstance.side()).toBe('sell');
    expect(
      fixture.nativeElement.querySelector('[role=radiogroup]').getAttribute('aria-label'),
    ).toBe('Side');
  });
});
