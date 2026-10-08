import { TestBed } from '@angular/core/testing';
import { LossPotSetting } from './loss-pot-setting';

describe('LossPotSetting', () => {
  beforeEach(() => localStorage.clear());

  it('keeps a saved pot on this device for the next visit', () => {
    TestBed.inject(LossPotSetting).save({ amount: '21000', validUpTo: '2025-12-31' });
    TestBed.resetTestingModule();

    expect(TestBed.inject(LossPotSetting).start()).toEqual({
      amount: '21000',
      validUpTo: '2025-12-31',
    });
  });

  it('forgets the pot when it is removed', () => {
    const setting = TestBed.inject(LossPotSetting);
    setting.save({ amount: '500', validUpTo: '2025-12-31' });
    setting.clear();

    expect(setting.start()).toBeNull();
    expect(localStorage.getItem('tc-loss-pot')).toBeNull();
  });

  it('ignores a stored value that is not a pot', () => {
    localStorage.setItem('tc-loss-pot', JSON.stringify({ amount: '-5', validUpTo: 'soon' }));

    expect(TestBed.inject(LossPotSetting).start()).toBeNull();
  });
});
