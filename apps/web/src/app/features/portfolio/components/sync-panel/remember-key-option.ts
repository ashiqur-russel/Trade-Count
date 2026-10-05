import { ChangeDetectionStrategy, Component, model } from '@angular/core';
import { CheckRow } from './check-row';

@Component({
  selector: 'tc-remember-key-option',
  imports: [CheckRow],
  template: `
    <tc-check-row [(checked)]="remember">
      Remember the key on this device. Untick on a shared computer: you will then enter the key
      again after each restart.
    </tc-check-row>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RememberKeyOption {
  readonly remember = model(true);
}
