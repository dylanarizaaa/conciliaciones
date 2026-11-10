import { ChangeDetectionStrategy, Component, computed, inject, input, linkedSignal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import {
  injectTable,
  type RowSelectionState,
  type SortingState,
  type Updater,
} from '@tanstack/angular-table';
import type { TableBlock, TablePageConsulta, TableRow } from '../../../core/data-access/vista.model';
import { leafColumnsOf, resolveApiPath } from '../../../core/data-access/vista.utils';
import { VistasService } from '../../../core/data-access/vistas.service';
import { resourceValue } from '../../../core/resource/resource-value';
import { DataTable } from '../data-table/data-table';
import {
  buildTemplateTable,
  TEMPLATE_TABLE_FEATURES,
  type TemplateColumnDef,
} from '../data-table/template/template-table';
import { EmptyState } from '../empty-state/empty-state';
import { ErrorState } from '../error-state/error-state';
import { Paginator } from '../paginator/paginator';
import { SectionTitle } from '../section-title/section-title';

const DEFAULT_PAGE_SIZE = 10;
const EMPTY_ROWS: TableRow[] = [];
const NO_COLUMNS: TemplateColumnDef[] = [];

let nextId = 0;

function applyUpdater<T>(updater: Updater<T>, current: T): T {
  return typeof updater === 'function' ? (updater as (value: T) => T)(current) : updater;
}

/**
 * Bloque `table` de la vista paramétrica: pide los datos declarados en `dataSource` y pinta la
 * tabla de la plantilla. La página y el orden son estado local del bloque (no van a la URL), así
 * una pantalla puede tener varias tablas.
 */
@Component({
  selector: 'app-view-table',
  imports: [DataTable, EmptyState, ErrorState, Paginator, SectionTitle],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-col gap-6' },
  template: `
    @if (showTitle()) {
      <h2 appSectionTitle [id]="titleId">{{ block().title }}</h2>
    }
    <p class="sr-only" role="status">{{ statusMessage() }}</p>

    @if (datos.error()) {
      <app-error-state title="No pudimos cargar esta tabla." (retry)="datos.reload()" />
    } @else if (isEmpty()) {
      <app-empty-state
        [title]="block().table.emptyState?.title ?? 'No hay resultados.'"
        [description]="block().table.emptyState?.description ?? ''"
      />
    } @else {
      <app-data-table
        [table]="table"
        [loading]="datos.isLoading()"
        [skeletonRowCount]="skeletonRowCount()"
        [density]="block().table.density ?? 'default'"
        [labelledBy]="tableLabelledBy()"
      />
      @if (paginated() && totalPages() > 0) {
        <app-paginator
          class="self-end"
          [page]="page()"
          [totalPages]="totalPages()"
          [ariaLabel]="'Paginación de ' + (block().title ?? 'la tabla')"
          (pageChange)="page.set($event)"
        />
      }
    }
  `,
})
export class ViewTable {
  private readonly vistas = inject(VistasService);

  /** Bloque de la plantilla. */
  readonly block = input.required<TableBlock>();
  /** Parámetros de la ruta del front para resolver `dataSource.path`. */
  readonly params = input.required<Readonly<Record<string, string>>>();
  /**
   * Id de un elemento externo que ya nombra la tabla (p. ej. su pestaña). Si se indica, no se
   * pinta el título del bloque.
   */
  readonly labelledBy = input<string>('');

  protected readonly titleId = `app-view-table-title-${nextId++}`;
  protected readonly showTitle = computed(() => !this.labelledBy() && !!this.block().title);
  protected readonly tableLabelledBy = computed(
    () => this.labelledBy() || (this.showTitle() ? this.titleId : ''),
  );

  private readonly definicion = computed(() => buildTemplateTable(this.block().table));
  private readonly path = computed(() => resolveApiPath(this.block().dataSource.path, this.params()));

  protected readonly paginated = computed(
    () => (this.block().dataSource.pagination?.mode ?? 'server') === 'server',
  );
  private readonly pageSize = computed(
    () => this.block().dataSource.pagination?.defaultPageSize ?? DEFAULT_PAGE_SIZE,
  );
  private readonly serverSorting = computed(
    () => (this.block().dataSource.sorting?.mode ?? 'server') === 'server',
  );

  private readonly sortableIds = computed(
    () =>
      new Set(
        leafColumnsOf(this.block().table.columns)
          .filter((column) => column.enableSorting && column.accessorKey)
          .map((column) => column.id),
      ),
  );

  /** Orden actual; parte del orden por defecto de la plantilla y se reinicia si cambia el bloque. */
  protected readonly sorting = linkedSignal<SortingState>(() => {
    const config = this.block().dataSource.sorting;
    const sorting = (config?.default ?? []).filter(({ id }) => this.sortableIds().has(id));
    return config?.multi ? sorting : sorting.slice(0, 1);
  });

  /** Página actual (desde 1); vuelve a la primera al cambiar de datos o de orden en el servidor. */
  protected readonly page = linkedSignal<unknown, number>({
    source: () => [this.path(), this.serverSorting() ? this.sorting() : null],
    computation: () => 1,
  });

  protected readonly datos = rxResource({
    params: () => ({
      path: this.path(),
      ...(this.paginated() ? { pageNumber: this.page(), pageSize: this.pageSize() } : {}),
      sort: this.serverSorting() ? this.sorting() : [],
    }),
    stream: ({ params }) => this.vistas.getPagina(params.path, params),
  });

  /** Última página recibida: mantiene el paginador mientras carga la siguiente. */
  private readonly ultimaPagina = linkedSignal<TablePageConsulta | undefined, TablePageConsulta | undefined>({
    source: () => resourceValue(this.datos),
    computation: (value, previous) => value ?? previous?.value,
  });

  protected readonly rows = computed(
    () => (resourceValue(this.datos)?.rows as TableRow[] | undefined) ?? EMPTY_ROWS,
  );
  protected readonly totalPages = computed(() => this.ultimaPagina()?.totalPages ?? 0);
  /** Filas skeleton: tantas como tenía la última página para que la tabla no salte. */
  protected readonly skeletonRowCount = computed(() => this.ultimaPagina()?.rows.length || 3);

  protected readonly isEmpty = computed(
    () => this.datos.status() === 'resolved' && this.rows().length === 0,
  );

  protected readonly statusMessage = computed(() => {
    if (this.datos.isLoading()) {
      return 'Cargando la tabla…';
    }
    if (this.datos.status() === 'resolved') {
      const total = this.rows().length;
      return total === 1 ? '1 registro.' : `${total} registros.`;
    }
    return '';
  });

  /** Filas marcadas, por `rowId` (solo si la plantilla trae columna de selección). */
  private readonly rowSelection = linkedSignal<unknown, RowSelectionState>({
    source: () => this.path(),
    computation: () => ({}),
  });

  protected readonly table = injectTable(() => {
    const definicion = this.definicion();
    const sorting = this.block().dataSource.sorting;
    return {
      features: TEMPLATE_TABLE_FEATURES,
      columns: definicion.columns ?? NO_COLUMNS,
      data: this.rows(),
      getRowId: definicion.getRowId,
      state: {
        sorting: this.sorting(),
        rowSelection: this.rowSelection(),
        columnPinning: definicion.columnPinning,
        columnVisibility: definicion.columnVisibility,
      },
      onSortingChange: (updater: Updater<SortingState>) =>
        this.sorting.update((current) => applyUpdater(updater, current)),
      onRowSelectionChange: (updater: Updater<RowSelectionState>) =>
        this.rowSelection.update((current) => applyUpdater(updater, current)),
      manualSorting: this.serverSorting(),
      enableMultiSort: sorting?.multi ?? false,
      // Con orden por defecto siempre hay una columna ordenada: el ciclo es asc ↔ desc.
      enableSortingRemoval: !sorting?.default?.length,
      sortDescFirst: false,
      enableRowSelection: definicion.selectable,
      enableMultiRowSelection: true,
      enableSubRowSelection: false,
      enableRowRangeSelection: false,
    };
  });
}
