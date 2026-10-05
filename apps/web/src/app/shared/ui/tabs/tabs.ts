import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  input,
  model,
} from '@angular/core';

export interface TabItem<T extends string> {
  id: T;
  label: string;
  count?: number;
}

@Component({
  selector: 'tc-tabs',
  templateUrl: './tabs.html',
  styleUrl: './tabs.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Tabs<T extends string> {
  readonly tabs = input.required<readonly TabItem<T>[]>();
  readonly selected = model.required<T>();
  readonly label = input.required<string>();

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected selectByKeyboard(event: KeyboardEvent, index: number): void {
    const step = { ArrowRight: 1, ArrowLeft: -1 }[event.key];
    if (!step) return;
    event.preventDefault();
    const tabs = this.tabs();
    const next = (index + step + tabs.length) % tabs.length;
    this.selected.set(tabs[next].id);
    this.host.nativeElement.querySelectorAll<HTMLButtonElement>('[role=tab]')[next]?.focus();
  }
}
