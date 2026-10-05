import { ChangeDetectionStrategy, Component, computed, input, model } from '@angular/core';
import { Select, type SelectOption } from '../select/select';
import { pageCount, pageLinks } from './pagination';

let nextId = 0;

@Component({
  selector: 'tc-paginator',
  imports: [Select],
  templateUrl: './paginator.html',
  styleUrl: './paginator.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Paginator {
  readonly total = input.required<number>();
  readonly page = model.required<number>();
  readonly pageSize = model.required<number>();
  readonly pageSizeOptions = input<readonly number[]>([10, 25, 50]);
  readonly itemLabel = input('rows');

  protected readonly sizeSelectId = `tc-page-size-${nextId++}`;
  protected readonly sizeOptions = computed<SelectOption<number>[]>(() =>
    this.pageSizeOptions().map((size) => ({ value: size, label: String(size) })),
  );
  protected readonly count = computed(() => pageCount(this.total(), this.pageSize()));
  protected readonly links = computed(() => pageLinks(this.page(), this.count()));
  protected readonly range = computed(() => {
    const total = this.total();
    if (total === 0) return `0 ${this.itemLabel()}`;
    const first = (this.page() - 1) * this.pageSize() + 1;
    const last = Math.min(total, first + this.pageSize() - 1);
    return `${first}–${last} of ${total} ${this.itemLabel()}`;
  });

  protected goTo(page: number): void {
    this.page.set(Math.min(Math.max(1, page), this.count()));
  }

  protected changePageSize(size: number | null): void {
    if (size === null) return;
    this.pageSize.set(size);
    this.page.set(1);
  }
}
