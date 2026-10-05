import { CdkListbox, CdkOption, type ListboxValueChangeEvent } from '@angular/cdk/listbox';
import {
  CdkConnectedOverlay,
  CdkOverlayOrigin,
  type ConnectedPosition,
} from '@angular/cdk/overlay';
import { A11yModule } from '@angular/cdk/a11y';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  forwardRef,
  input,
  model,
  signal,
  viewChild,
} from '@angular/core';
import { NG_VALUE_ACCESSOR, type ControlValueAccessor } from '@angular/forms';

export interface SelectOption<T> {
  value: T;
  label: string;
}

const BELOW_THEN_ABOVE: ConnectedPosition[] = [
  { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top', offsetY: 4 },
  { originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom', offsetY: -4 },
];

/** Themed replacement for <select>; works with formControlName or [(value)]. */
@Component({
  selector: 'tc-select',
  imports: [CdkOverlayOrigin, CdkConnectedOverlay, CdkListbox, CdkOption, A11yModule],
  templateUrl: './select.html',
  styleUrl: './select.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => Select), multi: true }],
  host: { '[attr.data-size]': 'size()' },
})
export class Select<T extends string | number> implements ControlValueAccessor {
  readonly options = input.required<readonly SelectOption<T>[]>();
  readonly value = model<T | null>(null);
  readonly placeholder = input('Select…');
  /** Id for the trigger, so a <label for> can point at it. */
  readonly inputId = input<string>();
  readonly ariaLabel = input<string>();
  readonly size = input<'md' | 'sm'>('md');

  protected readonly open = signal(false);
  protected readonly disabled = signal(false);
  protected readonly positions = BELOW_THEN_ABOVE;
  protected readonly selected = computed(() =>
    this.options().find((o) => o.value === this.value()),
  );

  private readonly trigger = viewChild.required<ElementRef<HTMLButtonElement>>('trigger');
  private onChange: (value: T | null) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  protected triggerWidth(): number {
    return this.trigger().nativeElement.offsetWidth;
  }

  protected toggle(): void {
    if (!this.disabled()) this.open.update((open) => !open);
  }

  protected close(): void {
    if (!this.open()) return;
    this.open.set(false);
    this.onTouched();
    this.trigger().nativeElement.focus();
  }

  protected choose(event: ListboxValueChangeEvent<T>): void {
    const [value] = event.value;
    if (value === undefined) return;
    this.value.set(value);
    this.onChange(value);
    this.close();
  }

  writeValue(value: T | null): void {
    this.value.set(value);
  }

  registerOnChange(fn: (value: T | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(disabled: boolean): void {
    this.disabled.set(disabled);
  }
}
