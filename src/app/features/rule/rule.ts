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
import { lucideDownload, lucideLoaderCircle } from '@ng-icons/lucide';
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
import type { ResolucionDiferencias } from '../../core/data-access/regla.model';
import { ReglasService } from '../../core/data-access/reglas.service';
import type { TablePageConsulta, TableRow } from '../../core/data-access/vista.model';
import {
  findTableBlock,
  leafColumnsOf,
  parseSorting,
  resolveApiPath,
  serializeSorting,
} from '../../core/data-access/vista.utils';
import { VistasService } from '../../core/data-access/vistas.service';
import {
  formatCurrency,
  formatDateTime,
  formatInteger,
  toDate,
} from '../../core/format/formatters';
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
import {
  ResultDialog,
  type ResultDialogItem,
} from '../../shared/components/result-dialog/result-dialog';
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

/** Acciones fijas de la pantalla: no vienen de la plantilla, son las mismas en todas las reglas. */
type Accion = 'resolver' | 'descargar';

const ETIQUETAS: Readonly<Record<Accion, string>> = {
  resolver: 'Resolver diferencias',
  descargar: 'Descargar reporte',
};

/** Datos del modal "Conciliación procesada" leídos de la respuesta del servicio. */
function resolucionItems(respuesta: ResolucionDiferencias): ResultDialogItem[] {
  const fecha = toDate(respuesta?.fechaValidacion);
  return [
    ...(respuesta?.validadoPor ? [{ label: 'Validado por', value: respuesta.validadoPor }] : []),
    ...(fecha ? [{ label: 'Fecha de validación', value: formatDateTime(fecha, { dateStyle: 'medium' }) }] : []),
  ];
}

/**
 * Pantalla de una regla: casos con diferencias por resolver. La tabla y su fuente de datos vienen
 * de la plantilla del back (contrato en `docs/contrato-vista`); las acciones "Resolver diferencias"
 * y "Descargar reporte" son fijas de la pantalla.
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
    ResultDialog,
    SectionTitle,
    SummaryCard,
    SummaryCardSkeleton,
  ],
  providers: [provideIcons({ lucideDownload, lucideLoaderCircle })],
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
  private readonly reglas = inject(ReglasService);

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

  // --- Acciones de la pantalla ---------------------------------------------------------------

  protected readonly etiquetas = ETIQUETAS;
  /** Acción en curso. */
  protected readonly ejecutando = signal<Accion | null>(null);
  /** Resultado de la última acción, para lectores de pantalla. */
  protected readonly mensajeAccion = signal('');
  /** Acción que falló, para mostrar el error y reintentarla. */
  protected readonly errorAccion = signal<Accion | null>(null);

  /** La plantilla trae selección de filas (columna de checks). */
  protected readonly seleccionable = computed(() => this.definicion()?.selectable ?? false);
  /** "Resolver diferencias" necesita al menos una fila marcada. */
  protected readonly puedeResolver = computed(
    () => this.ejecutando() === null && this.selectedIds().length > 0,
  );
  protected readonly puedeDescargar = computed(
    () => this.ejecutando() === null && this.bloque() !== undefined,
  );

  /** Datos del modal "Conciliación procesada" (se conservan al cerrarlo para la animación). */
  protected readonly resolucion = signal<readonly ResultDialogItem[] | null>(null);
  protected readonly resolucionAbierta = signal(false);

  constructor() {
    // Si la página pedida ya no existe (p. ej. ?pagina=99), lleva a la última disponible.
    effect(() => {
      const pagina = resourceValue(this.datos);
      if (pagina && pagina.totalPages > 0 && this.pageNumber() > pagina.totalPages) {
        this.goToPage(pagina.totalPages, true);
      }
    });

    // Sin columna de checks no hay selección y "Resolver diferencias" queda deshabilitado:
    // es un error de configuración de la plantilla, se avisa para detectarlo pronto.
    effect(() => {
      const definicion = this.definicion();
      if (definicion && !definicion.selectable) {
        console.warn(
          `[Regla] La plantilla de "${this.regla()}" no trae selección de filas ` +
            '(table.selection + RowCheckbox): "Resolver diferencias" queda deshabilitado.',
        );
      }
    });
  }

  /** Envía los casos seleccionados; al responder abre el modal "Conciliación procesada". */
  protected resolver(): void {
    if (!this.puedeResolver()) {
      return;
    }
    const ids = this.selectedIds();
    this.run('resolver', this.reglas.resolverDiferencias(this.subProcesoId(), this.regla(), ids), (respuesta) => {
      this.rowSelection.set({});
      this.datos.reload();
      // El modal se anuncia solo (rol dialog + título); no hace falta el mensaje de estado.
      this.resolucion.set(resolucionItems(respuesta));
      this.resolucionAbierta.set(true);
    });
  }

  /** Descarga el reporte con el orden actual de la tabla. */
  protected descargar(): void {
    if (!this.puedeDescargar()) {
      return;
    }
    const fileName = safeFileName(`diferencias-${this.regla()}.csv`, 'diferencias');
    this.run('descargar', this.reglas.descargarReporte(this.subProcesoId(), this.regla(), this.sorting()), (blob) => {
      saveFile(this.document, blob, fileName);
      this.mensajeAccion.set(`Descargamos el archivo ${fileName}.`);
    });
  }

  protected reintentar(accion: Accion): void {
    if (accion === 'resolver') {
      this.resolver();
    } else {
      this.descargar();
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

  private run<T>(accion: Accion, request: Observable<T>, onSuccess: (value: T) => void): void {
    this.errorAccion.set(null);
    this.mensajeAccion.set('');
    this.ejecutando.set(accion);
    request
      .pipe(
        finalize(() => this.ejecutando.set(null)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({ next: onSuccess, error: () => this.errorAccion.set(accion) });
  }
}
