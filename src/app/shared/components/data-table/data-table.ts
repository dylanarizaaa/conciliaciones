import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import {
  type AngularTable,
  type Column,
  FlexRender,
  type RowData,
  type TableFeatures,
} from '@tanstack/angular-table';
import { HlmSkeleton } from '@spartan-ng/helm/skeleton';
import { HlmTableImports } from '@spartan-ng/helm/table';
import type { DataTableColumnMeta } from './data-table.types';

type AriaSort = 'ascending' | 'descending' | 'none';

/** APIs que agrega `rowSortingFeature`; la tabla puede no tenerla registrada. */
interface SortableColumn {
  getCanSort(): boolean;
  getIsSorted(): false | 'asc' | 'desc';
}

function isSortable(column: object): column is SortableColumn {
  return 'getCanSort' in column && 'getIsSorted' in column;
}

/**
 * Renderiza una tabla de TanStack Table con el diseño de `helm/table` ("Tabla" del handoff).
 * Las columnas definen su contenido con `flexRender` (p. ej. `SortHeaderCell`, `LinkCell`).
 */
@Component({
  selector: 'app-data-table',
  imports: [FlexRender, HlmSkeleton, HlmTableImports],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <div hlmTableContainer>
      <table hlmTable [attr.aria-labelledby]="labelledBy() || null" [attr.aria-busy]="loading()">
        <thead hlmTHead>
          @for (headerGroup of table().getHeaderGroups(); track headerGroup.id) {
            <tr hlmTr>
              @for (header of headerGroup.headers; track header.id) {
                <th
                  hlmTh
                  scope="col"
                  [class]="columnClass(header.column)"
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
                @for (column of columns(); track column.id) {
                  <td hlmTd [class]="columnClass(column)">
                    <hlm-skeleton class="h-4 w-full max-w-40 bg-foreground/10" />
                  </td>
                }
              </tr>
            }
          } @else {
            @for (row of table().getRowModel().rows; track row.id) {
              <tr hlmTr>
                @for (cell of row.getAllCells(); track cell.id) {
                  <td hlmTd [class]="columnClass(cell.column, true)">
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
  /** Instancia creada con `injectTable` en la página. */
  readonly table = input.required<AngularTable<TFeatures, TData>>();
  /** Muestra filas skeleton en lugar de los datos. */
  readonly loading = input<boolean>(false);
  /** Cantidad de filas skeleton durante la carga. */
  readonly skeletonRowCount = input<number>(5);
  /** Id del título visible que nombra la tabla. */
  readonly labelledBy = input<string>('');

  protected readonly columns = computed(() => this.table().getAllLeafColumns());
  protected readonly skeletonRows = computed(() =>
    Array.from({ length: this.skeletonRowCount() }, (_, index) => index),
  );

  protected columnClass(column: Column<TFeatures, TData, unknown>, isCell = false): string {
    const meta = column.columnDef.meta as DataTableColumnMeta | undefined;
    return [meta?.className, isCell ? meta?.cellClassName : undefined].filter(Boolean).join(' ');
  }

  protected ariaSort(column: Column<TFeatures, TData, unknown>): AriaSort | null {
    if (!isSortable(column) || !column.getCanSort()) {
      return null;
    }
    const direction = column.getIsSorted();
    return direction === 'asc' ? 'ascending' : direction === 'desc' ? 'descending' : 'none';
  }
}
