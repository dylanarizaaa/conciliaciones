import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  type ElementRef,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import {
  type AngularTable,
  type Cell,
  type Column,
  FlexRender,
  type Row,
  type RowData,
  type TableFeatures,
} from '@tanstack/angular-table';
import { HlmSkeleton } from '@spartan-ng/helm/skeleton';
import { HlmTableImports } from '@spartan-ng/helm/table';
import type { DataTableColumnMeta } from './data-table.types';

type AriaSort = 'ascending' | 'descending' | 'none';

/**
 * Ancho mínimo (px) que debe quedar para las columnas que se desplazan. Si la pantalla no lo
 * permite (p. ej. en móvil), las columnas fijas dejan de serlo y toda la tabla se desplaza.
 */
const MIN_CENTER_WIDTH = 240;

// La tabla puede no tener registradas algunas features: se detectan por sus APIs.

interface SortableColumn {
  getCanSort(): boolean;
  getIsSorted(): false | 'asc' | 'desc';
}

interface PinnableColumn {
  getIsPinned(): false | 'start' | 'end';
  getStart(position?: 'start' | 'end' | 'center' | false): number;
  getAfter(position?: 'start' | 'end' | 'center' | false): number;
}

interface SizedColumn {
  getSize(): number;
}

interface PinnableTable<TFeatures extends TableFeatures, TData extends RowData> {
  getIsSomeColumnsPinned(): boolean;
  getStartVisibleLeafColumns(): Column<TFeatures, TData, unknown>[];
  getCenterVisibleLeafColumns(): Column<TFeatures, TData, unknown>[];
  getEndVisibleLeafColumns(): Column<TFeatures, TData, unknown>[];
}

interface SizedTable {
  getTotalSize(): number;
  getStartTotalSize?(): number;
  getEndTotalSize?(): number;
}

interface VisibleColumnsTable<TFeatures extends TableFeatures, TData extends RowData> {
  getVisibleLeafColumns(): Column<TFeatures, TData, unknown>[];
}

interface PinnableRow<TFeatures extends TableFeatures, TData extends RowData> {
  getStartVisibleCells(): Cell<TFeatures, TData, unknown>[];
  getCenterVisibleCells(): Cell<TFeatures, TData, unknown>[];
  getEndVisibleCells(): Cell<TFeatures, TData, unknown>[];
}

interface VisibleCellsRow<TFeatures extends TableFeatures, TData extends RowData> {
  getVisibleCells(): Cell<TFeatures, TData, unknown>[];
}

function has<T extends object>(value: object, method: keyof T): value is T {
  return method in value;
}

let nextId = 0;

/**
 * Renderiza una tabla de TanStack Table con el diseño de `helm/table` ("Tabla" del handoff).
 * Las columnas definen su contenido con `flexRender` (p. ej. `SortHeaderCell`, `LinkCell`).
 *
 * Si la tabla registra `columnSizingFeature`, usa anchos fijos (`size` de cada columna). Con
 * `columnPinningFeature`, las columnas `start` / `end` quedan fijas al desplazar en horizontal
 * ("Columnas fijas") y se separan del resto con un divisor.
 */
@Component({
  selector: 'app-data-table',
  imports: [FlexRender, HlmSkeleton, HlmTableImports],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    @let pinning = pinningActive();
    <div
      #scroller
      hlmTableContainer
      class="rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      [class.pb-2]="overflowing()"
      [attr.role]="overflowing() ? 'region' : null"
      [attr.tabindex]="overflowing() ? 0 : null"
      [attr.aria-labelledby]="overflowing() ? regionLabelledBy() : null"
      [style.scroll-padding-inline-start.px]="pinning ? pinnedWidth().start : null"
      [style.scroll-padding-inline-end.px]="pinning ? pinnedWidth().end : null"
    >
      <!-- Distingue la región desplazable de la sección que la contiene (axe: landmark-unique). -->
      <span [id]="scrollHintId" hidden>tabla con desplazamiento horizontal</span>
      <table
        hlmTable
        [class.table-fixed]="sized()"
        [style.width.px]="sized() ? totalSize() : null"
        [style.min-width]="sized() ? '100%' : null"
        [attr.aria-labelledby]="labelledBy() || null"
        [attr.aria-busy]="loading()"
      >
        @if (sized()) {
          <colgroup>
            @for (column of displayColumns(); track column.id) {
              <col [style.width.px]="columnSize(column)" />
            }
          </colgroup>
        }
        <thead hlmTHead>
          @for (headerGroup of table().getHeaderGroups(); track headerGroup.id) {
            <tr hlmTr>
              @for (header of headerGroup.headers; track header.id) {
                <th
                  hlmTh
                  scope="col"
                  [attr.colspan]="header.colSpan > 1 ? header.colSpan : null"
                  [class]="columnClass(header.column, false, pinning)"
                  [style]="pinStyle(header.column, pinning)"
                  [attr.aria-sort]="ariaSort(header.column)"
                >
                  @if (!header.isPlaceholder) {
                    <ng-container *flexRenderHeader="header; let value">{{ value }}</ng-container>
                  }
                </th>
              }
            </tr>
          }
        </thead>
        <tbody hlmTBody>
          @if (loading()) {
            @for (row of skeletonRows(); track row) {
              <tr hlmTr aria-hidden="true">
                @for (column of displayColumns(); track column.id) {
                  <td hlmTd [class]="columnClass(column, true, pinning)" [style]="pinStyle(column, pinning)">
                    <hlm-skeleton class="h-4 w-full max-w-40 bg-foreground/10" />
                  </td>
                }
              </tr>
            }
          } @else {
            @for (row of table().getRowModel().rows; track row.id) {
              <tr hlmTr>
                @for (cell of rowCells(row); track cell.id) {
                  <td hlmTd [class]="columnClass(cell.column, true, pinning)" [style]="pinStyle(cell.column, pinning)">
                    <ng-container *flexRenderCell="cell; let value">{{ value }}</ng-container>
                  </td>
                }
              </tr>
            }
          }
        </tbody>
      </table>
    </div>
  `,
})
export class DataTable<TFeatures extends TableFeatures, TData extends RowData> {
  private readonly scroller = viewChild.required<ElementRef<HTMLDivElement>>('scroller');

  /** Instancia creada con `injectTable` en la página. */
  readonly table = input.required<AngularTable<TFeatures, TData>>();
  /** Muestra filas skeleton en lugar de los datos. */
  readonly loading = input<boolean>(false);
  /** Cantidad de filas skeleton durante la carga. */
  readonly skeletonRowCount = input<number>(5);
  /** Id del título visible que nombra la tabla. */
  readonly labelledBy = input<string>('');
  /** `compact` = filas de 48px; `default` = 72px ("Casilla Info"). */
  readonly density = input<'default' | 'compact'>('default');

  /** La tabla es más ancha que su contenedor (hay desplazamiento horizontal). */
  protected readonly overflowing = signal(false);
  private readonly viewportWidth = signal(0);

  protected readonly scrollHintId = `app-data-table-scroll-${nextId++}`;
  /** Nombre de la región desplazable: "<título> tabla con desplazamiento horizontal". */
  protected readonly regionLabelledBy = computed(() =>
    [this.labelledBy(), this.scrollHintId].filter(Boolean).join(' '),
  );

  protected readonly skeletonRows = computed(() =>
    Array.from({ length: this.skeletonRowCount() }, (_, index) => index),
  );

  /** Anchos fijos: la tabla registra `columnSizingFeature`. */
  protected readonly sized = computed(() => has<SizedTable>(this.table(), 'getTotalSize'));
  protected readonly totalSize = computed(() => {
    const table = this.table();
    return has<SizedTable>(table, 'getTotalSize') ? table.getTotalSize() : null;
  });

  /** Columnas hoja visibles en el orden en que se pintan (fijas al inicio, centro, fijas al final). */
  protected readonly displayColumns = computed<Column<TFeatures, TData, unknown>[]>(() => {
    const table = this.table();
    if (has<PinnableTable<TFeatures, TData>>(table, 'getStartVisibleLeafColumns')) {
      return [
        ...table.getStartVisibleLeafColumns(),
        ...table.getCenterVisibleLeafColumns(),
        ...table.getEndVisibleLeafColumns(),
      ];
    }
    if (has<VisibleColumnsTable<TFeatures, TData>>(table, 'getVisibleLeafColumns')) {
      return table.getVisibleLeafColumns();
    }
    return table.getAllLeafColumns();
  });

  /** Ancho (px) ocupado por las columnas fijas de cada lado. */
  protected readonly pinnedWidth = computed(() => {
    const table = this.table() as object;
    const sizes = table as SizedTable;
    return {
      start: sizes.getStartTotalSize?.() ?? 0,
      end: sizes.getEndTotalSize?.() ?? 0,
    };
  });

  /**
   * Las columnas fijas solo se fijan si hay columnas fijas, anchos numéricos y espacio suficiente
   * para que se vea el centro de la tabla.
   */
  protected readonly pinningActive = computed(() => {
    const table = this.table();
    if (
      !has<PinnableTable<TFeatures, TData>>(table, 'getIsSomeColumnsPinned') ||
      !this.sized() ||
      !table.getIsSomeColumnsPinned()
    ) {
      return false;
    }
    const { start, end } = this.pinnedWidth();
    return this.viewportWidth() >= start + end + MIN_CENTER_WIDTH;
  });

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const scroller = this.scroller().nativeElement;
      const measure = () => {
        this.viewportWidth.set(scroller.clientWidth);
        this.overflowing.set(scroller.scrollWidth > scroller.clientWidth + 1);
      };
      measure();
      if (typeof ResizeObserver === 'undefined') {
        return;
      }
      // Se mide el contenedor (cambia con la pantalla) y la tabla (cambia con columnas y datos).
      const observer = new ResizeObserver(measure);
      observer.observe(scroller);
      const table = scroller.querySelector('table');
      if (table) {
        observer.observe(table);
      }
      destroyRef.onDestroy(() => observer.disconnect());
    });
  }

  protected rowCells(row: Row<TFeatures, TData>): Cell<TFeatures, TData, unknown>[] {
    if (has<PinnableRow<TFeatures, TData>>(row, 'getStartVisibleCells')) {
      return [...row.getStartVisibleCells(), ...row.getCenterVisibleCells(), ...row.getEndVisibleCells()];
    }
    if (has<VisibleCellsRow<TFeatures, TData>>(row, 'getVisibleCells')) {
      return row.getVisibleCells();
    }
    return row.getAllCells();
  }

  protected columnSize(column: Column<TFeatures, TData, unknown>): number | null {
    return has<SizedColumn>(column, 'getSize') ? column.getSize() : null;
  }

  protected columnClass(
    column: Column<TFeatures, TData, unknown>,
    isCell: boolean,
    pinning: boolean,
  ): string {
    const meta = column.columnDef.meta as DataTableColumnMeta | undefined;
    return [
      meta?.className,
      isCell ? meta?.cellClassName : undefined,
      isCell && this.density() === 'compact' ? 'h-12' : undefined,
      pinning ? this.dividerClass(column, meta) : undefined,
    ]
      .filter(Boolean)
      .join(' ');
  }

  /** Posición sticky de una columna fija (con desplazamientos de `columnSizingFeature`). */
  protected pinStyle(
    column: Column<TFeatures, TData, unknown>,
    pinning: boolean,
  ): Record<string, string> | null {
    if (!pinning || !has<PinnableColumn>(column, 'getIsPinned')) {
      return null;
    }
    const position = column.getIsPinned();
    if (position === 'start') {
      return { position: 'sticky', 'inset-inline-start': `${column.getStart('start')}px`, 'z-index': '1' };
    }
    if (position === 'end') {
      return { position: 'sticky', 'inset-inline-end': `${column.getAfter('end')}px`, 'z-index': '1' };
    }
    return null;
  }

  protected ariaSort(column: Column<TFeatures, TData, unknown>): AriaSort | null {
    if (!has<SortableColumn>(column, 'getCanSort') || !column.getCanSort()) {
      return null;
    }
    const direction = column.getIsSorted();
    return direction === 'asc' ? 'ascending' : direction === 'desc' ? 'descending' : 'none';
  }

  /**
   * Divisor entre las columnas fijas y las que se desplazan. La columna de checks no lleva el
   * suyo: forma un solo grupo con la columna fija siguiente ("Columnas fijas check").
   */
  private dividerClass(
    column: Column<TFeatures, TData, unknown>,
    meta: DataTableColumnMeta | undefined,
  ): string {
    if (meta?.kind === 'selection' || !has<PinnableColumn>(column, 'getIsPinned')) {
      return '';
    }
    const position = column.getIsPinned();
    return position === 'start' ? 'border-e' : position === 'end' ? 'border-s' : '';
  }
}
