import { A11yModule } from '@angular/cdk/a11y';
import {
  CdkConnectedOverlay,
  CdkOverlayOrigin,
  type ConnectedPosition,
} from '@angular/cdk/overlay';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterRenderEffect,
  computed,
  forwardRef,
  input,
  model,
  signal,
  viewChild,
} from '@angular/core';
import { NG_VALUE_ACCESSOR, type ControlValueAccessor } from '@angular/forms';
import {
  addDays,
  addMonths,
  formatIsoDate,
  parseIsoDate,
  todayIsoDate,
} from '../../dates/iso-date';
import { WEEKDAYS, monthLabel, monthWeeks } from './month-grid';

const BELOW_THEN_ABOVE: ConnectedPosition[] = [
  { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top', offsetY: 4 },
  { originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom', offsetY: -4 },
];

const KEY_STEPS: Record<string, (iso: string) => string> = {
  ArrowLeft: (iso) => addDays(iso, -1),
  ArrowRight: (iso) => addDays(iso, 1),
  ArrowUp: (iso) => addDays(iso, -7),
  ArrowDown: (iso) => addDays(iso, 7),
  PageUp: (iso) => addMonths(iso, -1),
  PageDown: (iso) => addMonths(iso, 1),
};

/** Themed date field with a month calendar; the value is a `YYYY-MM-DD` string. */
@Component({
  selector: 'tc-date-picker',
  imports: [CdkOverlayOrigin, CdkConnectedOverlay, A11yModule],
  templateUrl: './date-picker.html',
  styleUrl: './date-picker.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => DatePicker), multi: true },
  ],
})
export class DatePicker implements ControlValueAccessor {
  readonly value = model<string | null>(null);
  readonly inputId = input<string>();
  readonly ariaLabel = input<string>();
  readonly placeholder = input('Pick a date');
  readonly min = input<string | null>(null);
  readonly max = input<string | null>(null);
  readonly clearable = input(false);

  protected readonly open = signal(false);
  protected readonly disabled = signal(false);
  /** The day that has keyboard focus; also decides which month is shown. */
  protected readonly active = signal(todayIsoDate());
  protected readonly positions = BELOW_THEN_ABOVE;
  protected readonly weekdays = WEEKDAYS;
  protected readonly today = todayIsoDate();

  protected readonly display = computed(() => {
    const value = this.value();
    return value ? formatIsoDate(value) : null;
  });
  private readonly view = computed(() => parseIsoDate(this.active()));
  protected readonly title = computed(() => monthLabel(this.view().year, this.view().monthIndex));
  protected readonly weeks = computed(() => monthWeeks(this.view().year, this.view().monthIndex));

  private readonly trigger = viewChild.required<ElementRef<HTMLButtonElement>>('trigger');
  private readonly grid = viewChild<ElementRef<HTMLElement>>('grid');
  private onChange: (value: string | null) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  constructor() {
    afterRenderEffect(() => {
      const active = this.active();
      if (this.open())
        this.grid()?.nativeElement.querySelector<HTMLElement>(`[data-iso="${active}"]`)?.focus();
    });
  }

  protected isDisabled(iso: string): boolean {
    const min = this.min();
    const max = this.max();
    return (!!min && iso < min) || (!!max && iso > max);
  }

  protected toggle(): void {
    if (this.disabled()) return;
    if (!this.open()) this.active.set(this.value() ?? this.clampToRange(this.today));
    this.open.update((open) => !open);
  }

  protected close(): void {
    if (!this.open()) return;
    this.open.set(false);
    this.onTouched();
    this.trigger().nativeElement.focus();
  }

  protected showMonth(step: number): void {
    this.active.update((iso) => addMonths(iso, step));
  }

  protected choose(iso: string): void {
    if (this.isDisabled(iso)) return;
    this.commit(iso);
    this.close();
  }

  protected clear(): void {
    this.commit(null);
    this.trigger().nativeElement.focus();
  }

  protected moveFocus(event: KeyboardEvent): void {
    const step = KEY_STEPS[event.key];
    if (step) {
      event.preventDefault();
      this.active.update(step);
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.choose(this.active());
    }
  }

  writeValue(value: string | null): void {
    this.value.set(value || null);
  }

  registerOnChange(fn: (value: string | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(disabled: boolean): void {
    this.disabled.set(disabled);
  }

  private commit(value: string | null): void {
    this.value.set(value);
    this.onChange(value);
  }

  private clampToRange(iso: string): string {
    const min = this.min();
    const max = this.max();
    if (min && iso < min) return min;
    if (max && iso > max) return max;
    return iso;
  }
}
