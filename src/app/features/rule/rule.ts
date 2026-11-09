import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  DOCUMENT,
  effect,
  inject,
  input,
  linkedSignal,
  signal,
} from '@angular/core';
import { rxResource, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideDownload } from '@ng-icons/lucide';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmSkeleton } from '@spartan-ng/helm/skeleton';
import {
  injectTable,
  type RowSelectionState,
  type SortingState,
  type Updater,
} from '@tanstack/angular-table';
import { finalize, type Observable } from 'rxjs';
import { safeFileName, saveFile } from '../../core/browser/save-file';
import { ProcesosService } from '../../core/data-access/procesos.service';
import { ProyectosService } from '../../core/data-access/proyectos.service';
import { SubprocesosService } from '../../core/data-access/subprocesos.service';
import type {
  DownloadAction,
  RequestAction,
  TablePageConsulta,
  TableRow,
  ViewAction,
} from '../../core/data-access/vista.model';
import {
  findTableBlock,
  interpolateParams,
  leafColumnsOf,
  parseSorting,
  resolveApiPath,
  serializeSorting,
} from '../../core/data-access/vista.utils';
import { VistasService } from '../../core/data-access/vistas.service';
import { formatCurrency, formatInteger } from '../../core/format/formatters';
import { resourceValue } from '../../core/resource/resource-value';
import { DataTable } from '../../shared/components/data-table/data-table';
import {
  buildTemplateTable,
  TEMPLATE_TABLE_FEATURES,
  type TemplateColumnDef,
} from '../../shared/components/data-table/template/template-table';
import { EmptyState } from '../../shared/components/empty-state/empty-state';
import { ErrorState } from '../../shared/components/error-state/error-state';
import { PageHeader, type PageHeaderBreadcrumb } from '../../shared/components/page-header/page-header';
import { PageHeaderActions } from '../../shared/components/page-header/page-header-actions';
import { PageHeaderSkeleton } from '../../shared/components/page-header/page-header-skeleton';
import { Paginator } from '../../shared/components/paginator/paginator';
import { SectionTitle } from '../../shared/components/section-title/section-title';
import { SummaryCard, type SummaryMetric } from '../../shared/components/summary-card/summary-card';
import { SummaryCardSkeleton } from '../../shared/components/summary-card/summary-card-skeleton';

/** Rutas relativas desde `plataformas/:proyectoId/categorias/:procesoId/canales/:subProcesoId/reglas/:regla`. */
const CANAL_LINK = '../..';
const CATEGORIA_LINK = '../../../..';
const PLATAFORMA_LINK = '../../../../../..';
const CONCILIACIONES_LINK = '../../../../../../../..';
const DEFAULT_PAGE_SIZE = 10;
const EMPTY_ROWS: TableRow[] = [];
const NO_COLUMNS: TemplateColumnDef[] = [];
const NO_PINNING = { start: [], end: [] };
const NO_VISIBILITY = {};
const fallbackRowId = (_: TableRow, index: number) => `fila-${index}`;

/** Error de una acción (descargar, resolver) con la acción para reintentarla. */
interface ActionError {
  readonly action: ViewAction;
  readonly message: string;
}

/**
 * Pantalla de una regla: casos con diferencias por resolver. La tabla, sus acciones y la fuente
 * de datos vienen de la plantilla del back (contrato en `docs/contrato-vista`).
 */
@Component({
  selector: 'app-rule',
  imports: [
    DataTable,
    EmptyState,
    ErrorState,
    HlmButton,
    HlmSkeleton,
    NgIcon,
    PageHeader,
    PageHeaderActions,
    PageHeaderSkeleton,
    Paginator,
    SectionTitle,
    SummaryCard,
    SummaryCardSkeleton,
  ],
  providers: [provideIcons({ lucideDownload })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './rule.html',
})
export class Rule {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);
  private readonly proyectosService = inject(ProyectosService);
  private readonly procesosService = inject(ProcesosService);
  private readonly subprocesosService = inject(SubprocesosService);
  private readonly vistas = inject(VistasService);

  /** Parámetros de ruta `:proyectoId`, `:procesoId`, `:subProcesoId` y `:regla`. */
  readonly proyectoId = input.required<string>();
  readonly procesoId = input.required<string>();
  readonly subProcesoId = input.required<string>();
  readonly regla = input.required<string>();
  /** Query param `?pagina=` (desde 1). */
  readonly pagina = input<string>();
  /** Query param `?orden=campo:asc|desc`. */
  readonly orden = input<string>();

  protected readonly canalLink = CANAL_LINK;

  // --- Nombres para la miga de pan -----------------------------------------------------------

  protected readonly proyecto = rxResource({
    params: () => this.proyectoId(),
    stream: ({ params }) => this.proyectosService.getProyecto(params),
  });

  protected readonly proceso = rxResource({
    params: () => ({ proyectoId: this.proyectoId(), procesoId: this.procesoId() }),
    stream: ({ params }) => this.procesosService.getProceso(params.proyectoId, params.procesoId),
  });

  protected readonly subproceso = rxResource({
    params: () => ({ procesoId: this.procesoId(), subProcesoId: this.subProcesoId() }),
    stream: ({ params }) =>
      this.subprocesosService.getSubproceso(params.procesoId, params.subProcesoId),
  });

  // --- Plantilla y datos ----------------------------------------------------------------------

  protected readonly plantilla = rxResource({
    params: () => ({ subProcesoId: this.subProcesoId(), regla: this.regla() }),
    stream: ({ params }) => this.vistas.getPlantillaRegla(params.subProcesoId, params.regla),
  });

  /** Bloque de tabla de la plantilla (hoy la vista trae uno solo). */
  protected readonly bloque = computed(() => {
    const plantilla = resourceValue(this.plantilla);
    return plantilla ? findTableBlock(plantilla) : undefined;
  });

  /** Columnas y estado inicial de TanStack generados desde la plantilla. */
  protected readonly definicion = computed(() => {
    const bloque = this.bloque();
    return bloque ? buildTemplateTable(bloque.table) : undefined;
  });

  /** Parámetros para resolver las rutas del contrato (`{subProcesoId}`, `{regla}`, ...). */
  private readonly pathParams = computed(() => ({
    proyectoId: this.proyectoId(),
    procesoId: this.procesoId(),
    subProcesoId: this.subProcesoId(),
    regla: this.regla(),
  }));

  protected readonly pageNumber = computed(() => {
    const page = Number.parseInt(this.pagina() ?? '', 10);
    return Number.isFinite(page) && page > 0 ? page : 1;
  });

  private readonly pageSize = computed(
    () => this.bloque()?.dataSource.pagination?.defaultPageSize ?? DEFAULT_PAGE_SIZE,
  );

  private readonly serverSorting = computed(
    () => (this.bloque()?.dataSource.sorting?.mode ?? 'server') === 'server',
  );

  private readonly sortableIds = computed(() => {
    const bloque = this.bloque();
    return new Set(
      leafColumnsOf(bloque?.table.columns ?? [])
        .filter((column) => column.enableSorting && column.accessorKey)
        .map((column) => column.id),
    );
  });

  /** Orden de la URL (solo columnas ordenables) o, si no hay, el de la plantilla. */
  protected readonly sorting = computed<SortingState>(() => {
    const config = this.bloque()?.dataSource.sorting;
    const fromUrl = parseSorting(this.orden()).filter(({ id }) => this.sortableIds().has(id));
    const sorting = fromUrl.length > 0 ? fromUrl : [...(config?.default ?? [])];
    return config?.multi ? sorting : sorting.slice(0, 1);
  });

  protected readonly datos = rxResource({
    params: () => {
      const bloque = this.bloque();
      if (!bloque) {
        return undefined;
      }
      return {
        path: resolveApiPath(bloque.dataSource.path, this.pathParams()),
        pageNumber: this.pageNumber(),
        pageSize: this.pageSize(),
        sort: this.serverSorting() ? this.sorting() : [],
      };
    },
    stream: ({ params }) => this.vistas.getPagina(params.path, params),
  });

  /** Última página recibida: mantiene el resumen y el paginador mientras carga la siguiente. */
  private readonly ultimaPagina = linkedSignal<TablePageConsulta | undefined, TablePageConsulta | undefined>({
    source: () => resourceValue(this.datos),
    computation: (value, previous) => value ?? previous?.value,
  });

  protected readonly rows = computed(
    () => (resourceValue(this.datos)?.rows as TableRow[] | undefined) ?? EMPTY_ROWS,
  );

  // --- Tabla y selección ----------------------------------------------------------------------

  /**
   * Filas marcadas, por `rowId`. Se conserva al ordenar y al paginar (salvo que la plantilla pida
   * lo contrario) y se reinicia al cambiar de regla.
   */
  protected readonly rowSelection = linkedSignal<unknown, RowSelectionState>({
    source: () =>
      this.bloque()?.table.selection?.persistAcrossPages === false
        ? `${this.regla()}#${this.pageNumber()}`
        : this.regla(),
    computation: () => ({}),
  });

  protected readonly selectedIds = computed(() => Object.keys(this.rowSelection()));

  protected readonly table = injectTable(() => {
    const definicion = this.definicion();
    const sorting = this.bloque()?.dataSource.sorting;
    return {
      features: TEMPLATE_TABLE_FEATURES,
      columns: definicion?.columns ?? NO_COLUMNS,
      data: this.rows(),
      getRowId: definicion?.getRowId ?? fallbackRowId,
      state: {
        sorting: this.sorting(),
        rowSelection: this.rowSelection(),
        columnPinning: definicion?.columnPinning ?? NO_PINNING,
        columnVisibility: definicion?.columnVisibility ?? NO_VISIBILITY,
      },
      onSortingChange: (updater: Updater<SortingState>) => this.changeSorting(updater),
      onRowSelectionChange: (updater: Updater<RowSelectionState>) =>
        this.rowSelection.update((current) =>
          typeof updater === 'function' ? updater(current) : updater,
        ),
      manualSorting: this.serverSorting(),
      enableMultiSort: sorting?.multi ?? false,
      // Con orden por defecto siempre hay una columna ordenada: el ciclo es asc ↔ desc.
      enableSortingRemoval: !sorting?.default?.length,
      sortDescFirst: false,
      enableRowSelection: definicion?.selectable ?? false,
      enableMultiRowSelection: true,
      enableSubRowSelection: false,
      enableRowRangeSelection: false,
    };
  });

  // --- Encabezado y resumen -------------------------------------------------------------------

  protected readonly nombrePlataforma = computed(
    () => resourceValue(this.proyecto)?.nombreProyecto ?? 'Plataforma',
  );
  protected readonly nombreCategoria = computed(
    () => resourceValue(this.proceso)?.nombreProceso ?? 'Categoría',
  );
  protected readonly nombreCanal = computed(
    () => resourceValue(this.subproceso)?.nombreSubProceso ?? 'Canal',
  );

  protected readonly headerLoading = computed(
    () => this.proyecto.isLoading() || this.proceso.isLoading() || this.subproceso.isLoading(),
  );

  protected readonly breadcrumbs = computed<readonly PageHeaderBreadcrumb[]>(() => [
    { label: 'Conciliaciones', link: CONCILIACIONES_LINK },
    { label: this.nombrePlataforma(), link: PLATAFORMA_LINK },
    { label: this.nombreCategoria(), link: CATEGORIA_LINK },
    { label: this.nombreCanal(), link: CANAL_LINK },
    { label: this.regla() },
  ]);

  protected readonly hasError = computed(
    () =>
      !!this.proyecto.error() ||
      !!this.proceso.error() ||
      !!this.subproceso.error() ||
      !!this.plantilla.error() ||
      !!this.datos.error(),
  );

  protected readonly resumen = computed<readonly SummaryMetric[]>(() => {
    const pagina = this.ultimaPagina();
    if (!pagina) {
      return [];
    }
    const metrics: SummaryMetric[] = [
      { value: formatInteger(pagina.summary?.casosTotales ?? pagina.totalRows), label: 'Casos' },
    ];
    if (pagina.summary) {
      metrics.push({ value: formatCurrency(pagina.summary.montoAfectado), label: 'Monto afectado' });
    }
    return metrics;
  });

  protected readonly ultimaActualizacion = computed(() => this.ultimaPagina()?.consultadoEn ?? null);
  protected readonly totalPages = computed(() => this.ultimaPagina()?.totalPages ?? 0);
  /** Filas skeleton: tantas como tenía la última página para que la tabla no salte. */
  protected readonly skeletonRowCount = computed(() => this.ultimaPagina()?.rows.length || 5);

  protected readonly isEmpty = computed(
    () => this.datos.status() === 'resolved' && (resourceValue(this.datos)?.totalRows ?? 0) === 0,
  );

  /** Mensaje para lectores de pantalla sobre el estado de la carga. */
  protected readonly statusMessage = computed(() => {
    if (this.plantilla.isLoading() || this.datos.isLoading()) {
      return 'Cargando diferencias…';
    }
    if (this.datos.status() === 'resolved') {
      const total = this.rows().length;
      const diferencias = total === 1 ? '1 diferencia' : `${total} diferencias`;
      return `Página ${this.pageNumber()} de ${Math.max(this.totalPages(), 1)}: ${diferencias}.`;
    }
    return '';
  });

  // --- Acciones de la plantilla ---------------------------------------------------------------

  /** Acciones del encabezado (p. ej. "Resolver diferencias"). */
  protected readonly accionesPagina = computed(() => resourceValue(this.plantilla)?.actions ?? []);
  /** Acciones de la barra de la tabla (p. ej. "Descargar reporte"). */
  protected readonly accionesBloque = computed(() => this.bloque()?.toolbar?.actions ?? []);

  /** Id de la acción en curso. */
  protected readonly ejecutando = signal<string | null>(null);
  /** Resultado de la última acción, para lectores de pantalla. */
  protected readonly mensajeAccion = signal('');
  protected readonly errorAccion = signal<ActionError | null>(null);

  constructor() {
    // Si la página pedida ya no existe (p. ej. ?pagina=99), lleva a la última disponible.
    effect(() => {
      const pagina = resourceValue(this.datos);
      if (pagina && pagina.totalPages > 0 && this.pageNumber() > pagina.totalPages) {
        this.goToPage(pagina.totalPages, true);
      }
    });
  }

  /** Una acción que envía la selección necesita el mínimo de filas marcadas en su bloque. */
  protected puedeEjecutar(action: ViewAction): boolean {
    if (this.ejecutando() !== null) {
      return false;
    }
    if (action.kind !== 'request' || !action.selection) {
      return true;
    }
    const { blockId, min = 1 } = action.selection;
    return blockId === this.bloque()?.id && this.selectedIds().length >= min;
  }

  protected ejecutar(action: ViewAction): void {
    if (!this.puedeEjecutar(action)) {
      return;
    }
    this.errorAccion.set(null);
    this.mensajeAccion.set('');
    if (action.kind === 'download') {
      this.descargar(action);
    } else {
      this.enviar(action);
    }
  }

  protected goToPage(page: number, replaceUrl = false): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { pagina: page > 1 ? page : null },
      queryParamsHandling: 'merge',
      replaceUrl,
    });
  }

  protected reload(): void {
    for (const resource of [this.proyecto, this.proceso, this.subproceso, this.plantilla, this.datos]) {
      if (resource.error()) {
        resource.reload();
      }
    }
  }

  /** El orden vive en la URL (`?orden=`); al cambiarlo se vuelve a la primera página. */
  private changeSorting(updater: Updater<SortingState>): void {
    const next = typeof updater === 'function' ? updater(this.sorting()) : updater;
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        orden: next.length > 0 ? serializeSorting(next).join(',') : null,
        pagina: null,
      },
      queryParamsHandling: 'merge',
    });
  }

  private enviar(action: RequestAction): void {
    const ids = this.selectedIds();
    this.run(
      action,
      () => this.vistas.enviar(action, resolveApiPath(action.path, this.pathParams()), ids),
      () => {
        const mensaje = action.successMessage ?? `${action.label}: listo.`;
        this.mensajeAccion.set(mensaje.replace(/\{count\}/g, String(ids.length)));
        this.rowSelection.set({});
        this.datos.reload();
      },
    );
  }

  private descargar(action: DownloadAction): void {
    const fileName = safeFileName(
      interpolateParams(action.fileName ?? `${action.id}.csv`, this.pathParams()),
      action.id,
    );
    this.run(
      action,
      () => this.vistas.descargar(resolveApiPath(action.path, this.pathParams()), this.sorting()),
      (blob) => {
        saveFile(this.document, blob as Blob, fileName);
        this.mensajeAccion.set(`Descargamos el archivo ${fileName}.`);
      },
    );
  }

  /** Ejecuta la petición de una acción; cualquier error (también de la plantilla) se muestra. */
  private run(
    action: ViewAction,
    request: () => Observable<unknown>,
    onSuccess: (value: unknown) => void,
  ): void {
    const fail = () =>
      this.errorAccion.set({ action, message: `No pudimos completar "${action.label}".` });
    let peticion: Observable<unknown>;
    try {
      peticion = request();
    } catch {
      fail();
      return;
    }
    this.ejecutando.set(action.id);
    peticion
      .pipe(
        finalize(() => this.ejecutando.set(null)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({ next: onSuccess, error: fail });
  }
}
