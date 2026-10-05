import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
}

let nextGroupId = 0;

@Component({
  selector: 'tc-segmented-control',
  templateUrl: './segmented-control.html',
  styleUrl: './segmented-control.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SegmentedControl<T extends string> {
  readonly options = input.required<readonly SegmentOption<T>[]>();
  readonly value = model.required<T>();
  readonly label = input.required<string>();

  protected readonly groupName = `tc-segmented-${nextGroupId++}`;
}
