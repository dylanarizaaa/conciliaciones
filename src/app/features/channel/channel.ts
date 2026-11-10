import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  linkedSignal,
} from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { resourceValue } from '../../core/resource/resource-value';
import { injectRouteParam, injectQueryParam } from '../../core/routing/route-params';
import { ActivatedRoute, Router } from '@angular/router';
import {
  createColumnHelper,
  createSortedRowModel,
  flexRenderComponent,
  injectTable,
  rowSortingFeature,
  tableFeatures,
} from '@tanstack/angular-table';
import { ProcesosService } from '../../core/data-access/procesos.service';
import { ProyectosService } from '../../core/data-access/proyectos.service';
import type { Regla, ReglasConsulta } from '../../core/data-access/regla.model';
import { ReglasService } from '../../core/data-access/reglas.service';
import { SubprocesosService } from '../../core/data-access/subprocesos.service';
import { formatCurrency, formatInteger } from '../../core/format/formatters';
import { LinkCell } from '../../shared/components/data-table/cells/link-cell';
import { SortHeaderCell } from '../../shared/components/data-table/cells/sort-header-cell';
import { DataTable } from '../../shared/components/data-table/data-table';
import {
  DATA_TABLE_CELL,
  type DataTableColumnMeta,
} from '../../shared/components/data-table/data-table.types';
import { EmptyState } from '../../shared/components/empty-state/empty-state';
import { ErrorState } from '../../shared/components/error-state/error-state';
import { PageHeader, type PageHeaderBreadcrumb } from '../../shared/components/page-header/page-header';
import { PageHeaderSkeleton } from '../../shared/components/page-header/page-header-skeleton';
import { Paginator } from '../../shared/components/paginator/paginator';
import { SectionTitle } from '../../shared/components/section-title/section-title';
import { SummaryCard, type SummaryMetric } from '../../shared/components/summary-card/summary-card';
import { SummaryCardSkeleton } from '../../shared/components/summary-card/summary-card-skeleton';

/** Rutas relativas desde `plataformas/:proyectoId/categorias/:procesoId/canales/:subProcesoId`. */
const CATEGORIA_LINK = '../..';
const PLATAFORMA_LINK = '../../../..';
const CONCILIACIONES_LINK = '../../../../../..';
const PAGE_SIZE = 10;
const EMPTY: Regla[] = [];

/** El backend no ordena: se ordena en el cliente la página cargada. */
const features = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  columnMeta: {} as DataTableColumnMeta,
});

const column = createColumnHelper<typeof features, Regla>();

const columns = column.columns([
  column.accessor('nombre', {
    header: () => flexRenderComponent(SortHeaderCell, { inputs: { label: 'Nombre de la regla' } }),
    cell: (info) => info.getValue(),
    // Orden alfabético en español (tildes y mayúsculas no alteran el orden).
    sortFn: (a, b, id) =>
      a.getValue<string>(id).localeCompare(b.getValue<string>(id), 'es', {
        sensitivity: 'base',
        numeric: true,
      }),
    meta: { className: DATA_TABLE_CELL.third, cellClassName: DATA_TABLE_CELL.lead },
  }),
  column.accessor('casos', {
    header: () => flexRenderComponent(SortHeaderCell, { inputs: { label: 'Número de casos' } }),
    cell: (info) => formatInteger(info.getValue()),
    meta: { className: DATA_TABLE_CELL.third },
  }),
  column.accessor('monto', {
    header: () => flexRenderComponent(SortHeaderCell, { inputs: { label: 'Monto afectado' } }),
    cell: (info) => formatCurrency(info.getValue()),
    meta: { className: DATA_TABLE_CELL.third },
  }),
  column.display({
    id: 'accion',
    header: 'Acción',
    enableSorting: false,
    cell: ({ row }) =>
      flexRenderComponent(LinkCell, {
        inputs: {
          label: 'Gestionar',
          link: ['reglas', row.original.nombre],
          context: row.original.nombre,
        },
      }),
    meta: { className: DATA_TABLE_CELL.hug },
  }),
]);

@Component({
  selector: 'app-channel',
  imports: [
    DataTable,
    EmptyState,
    ErrorState,
    PageHeader,
    PageHeaderSkeleton,
    Paginator,
    SectionTitle,
    SummaryCard,
    SummaryCardSkeleton,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './channel.html',
})
export class Channel {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly proyectosService = inject(ProyectosService);
  private readonly procesosService = inject(ProcesosService);
  private readonly subprocesosService = inject(SubprocesosService);
  private readonly reglasService = inject(ReglasService);

  /** Parámetros de ruta `:proyectoId`, `:procesoId` y `:subProcesoId`. */
  readonly proyectoId = injectRouteParam('proyectoId');
  readonly procesoId = injectRouteParam('procesoId');
  readonly subProcesoId = injectRouteParam('subProcesoId');
  /** Query param `?pagina=` (desde 1). */
  readonly pagina = injectQueryParam('pagina');

  protected readonly categoriaLink = CATEGORIA_LINK;

  protected readonly pageNumber = computed(() => {
    const page = Number.parseInt(this.pagina() ?? '', 10);
    return Number.isFinite(page) && page > 0 ? page : 1;
  });

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

  protected readonly reglas = rxResource({
    params: () => ({ subProcesoId: this.subProcesoId(), page: this.pageNumber() }),
    stream: ({ params }) =>
      this.reglasService.getReglas(params.subProcesoId, params.page, PAGE_SIZE),
  });

  /** Última página recibida: mantiene el resumen y el paginador mientras carga la siguiente. */
  private readonly ultimaConsulta = linkedSignal<ReglasConsulta | undefined, ReglasConsulta | undefined>({
    source: () => resourceValue(this.reglas),
    computation: (value, previous) => value ?? previous?.value,
  });

  protected readonly rows = computed(() => (resourceValue(this.reglas)?.data as Regla[] | undefined) ?? EMPTY);

  protected readonly table = injectTable(() => ({
    features,
    columns,
    data: this.rows(),
    getRowId: (row) => row.nombre,
  }));

  protected readonly nombrePlataforma = computed(
    () => resourceValue(this.proyecto)?.nombreProyecto ?? 'Plataforma',
  );
  protected readonly nombreCategoria = computed(
    () => resourceValue(this.proceso)?.nombreProceso ?? 'Categoría',
  );
  protected readonly nombre = computed(
    () => resourceValue(this.subproceso)?.nombreSubProceso ?? 'Canal',
  );

  protected readonly headerLoading = computed(
    () => this.proyecto.isLoading() || this.proceso.isLoading() || this.subproceso.isLoading(),
  );

  protected readonly breadcrumbs = computed<readonly PageHeaderBreadcrumb[]>(() => [
    { label: 'Conciliaciones', link: CONCILIACIONES_LINK },
    { label: this.nombrePlataforma(), link: PLATAFORMA_LINK },
    { label: this.nombreCategoria(), link: CATEGORIA_LINK },
    { label: this.nombre() },
  ]);

  protected readonly descripcion = computed(
    () =>
      `Gestiona las diferencias detectadas en cada regla de ${this.nombreCategoria().toLocaleLowerCase('es')} de ${this.nombre()}`,
  );

  protected readonly hasError = computed(
    () =>
      !!this.proyecto.error() ||
      !!this.proceso.error() ||
      !!this.subproceso.error() ||
      !!this.reglas.error(),
  );

  protected readonly resumen = computed<readonly SummaryMetric[]>(() => {
    const consulta = this.ultimaConsulta();
    return consulta
      ? [
          { value: formatInteger(consulta.casosTotales), label: 'Casos totales' },
          { value: formatCurrency(consulta.montoAfectado), label: 'Monto afectado' },
        ]
      : [];
  });

  protected readonly ultimaActualizacion = computed(() => this.ultimaConsulta()?.consultadoEn ?? null);
  protected readonly totalPages = computed(() => this.ultimaConsulta()?.totalPages ?? 0);
  /** Filas skeleton: tantas como tenía la última página para que la tabla no salte. */
  protected readonly skeletonRowCount = computed(() => this.ultimaConsulta()?.data.length || 5);

  protected readonly isEmpty = computed(
    () => this.reglas.status() === 'resolved' && this.rows().length === 0,
  );

  /** Mensaje para lectores de pantalla sobre el estado de la carga. */
  protected readonly statusMessage = computed(() => {
    if (this.reglas.isLoading()) {
      return 'Cargando reglas…';
    }
    if (this.reglas.status() === 'resolved') {
      const total = this.rows().length;
      const reglas = total === 1 ? '1 regla' : `${total} reglas`;
      return `Página ${this.pageNumber()} de ${Math.max(this.totalPages(), 1)}: ${reglas}.`;
    }
    return '';
  });

  constructor() {
    // Si la página pedida ya no existe (p. ej. ?pagina=99), lleva a la última disponible.
    effect(() => {
      const consulta = resourceValue(this.reglas);
      if (consulta && consulta.totalPages > 0 && this.pageNumber() > consulta.totalPages) {
        this.goToPage(consulta.totalPages, true);
      }
    });
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
    for (const resource of [this.proyecto, this.proceso, this.subproceso, this.reglas]) {
      if (resource.error()) {
        resource.reload();
      }
    }
  }
}
