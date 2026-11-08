import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { injectTableHeaderContext } from '@tanstack/angular-table';

/**
 * Encabezado ordenable ("Casilla Título" con flechas). Se usa desde una definición de columna:
 *
 * ```ts
 * header: () => flexRenderComponent(SortHeaderCell, { inputs: { label: 'Número de casos' } })
 * ```
 *
 * El estado accesible (`aria-sort`) lo publica `app-data-table` en el `<th>`.
 */
@Component({
  selector: 'app-sort-header-cell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
  template: `
    @if (canSort()) {
      <button
        type="button"
        class="-mx-1 inline-flex cursor-pointer items-center gap-1 rounded-sm px-1 py-0.5 transition-colors outline-none hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
        [class.text-foreground]="direction()"
        (click)="toggle($event)"
      >
        {{ label() }}
        <svg viewBox="0 0 8 12" class="h-3 w-2 shrink-0" aria-hidden="true">
          <path d="M4 0 8 5H0z" [attr.fill-opacity]="direction() === 'desc' ? 0.3 : 1" fill="currentColor" />
          <path d="M4 12 0 7h8z" [attr.fill-opacity]="direction() === 'asc' ? 0.3 : 1" fill="currentColor" />
        </svg>
      </button>
    } @else {
      {{ label() }}
    }
  `,
})
export class SortHeaderCell {
  private readonly header = injectTableHeaderContext();

  /** Texto visible del encabezado. */
  readonly label = input.required<string>();

  protected readonly canSort = computed(() => this.header().column.getCanSort());
  protected readonly direction = computed(() => this.header().column.getIsSorted());

  protected toggle(event: Event): void {
    this.header().column.getToggleSortingHandler()?.(event);
  }
}
