import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Field } from '../../../../shared/ui';

@Component({
  selector: 'tc-sync-key-field',
  imports: [ReactiveFormsModule, Field],
  template: `
    <tc-field [label]="label()" [controlId]="controlId()" [hint]="hint()">
      <input
        [id]="controlId()"
        [formControl]="control()"
        autocomplete="off"
        autocapitalize="characters"
        spellcheck="false"
        placeholder="XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX"
        (keydown.enter)="submitted.emit()"
      />
    </tc-field>
  `,
  styles: `
    input {
      font-family: var(--tc-font-numeric);
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SyncKeyField {
  readonly controlId = input.required<string>();
  readonly control = input.required<FormControl<string>>();
  readonly label = input('Sync key');
  readonly hint = input('');
  readonly submitted = output();
}
