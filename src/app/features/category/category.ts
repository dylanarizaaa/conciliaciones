import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { resourceValue } from '../../core/resource/resource-value';
import { ProcesosService } from '../../core/data-access/procesos.service';
import { ProyectosService } from '../../core/data-access/proyectos.service';
import { SubprocesosService } from '../../core/data-access/subprocesos.service';
import { formatCurrency, formatInteger } from '../../core/format/formatters';
import { EmptyState } from '../../shared/components/empty-state/empty-state';
import { ErrorState } from '../../shared/components/error-state/error-state';
import { PageHeader, type PageHeaderBreadcrumb } from '../../shared/components/page-header/page-header';
import { PageHeaderSkeleton } from '../../shared/components/page-header/page-header-skeleton';
import { SectionTitle } from '../../shared/components/section-title/section-title';
import { StatusCard, type StatusCardMetric } from '../../shared/components/status-card/status-card';
import { StatusCardSkeleton } from '../../shared/components/status-card/status-card-skeleton';
import {
  SummaryCard,
  type SummaryMetric,
  totalsToSummaryMetrics,
} from '../../shared/components/summary-card/summary-card';
import { SummaryCardSkeleton } from '../../shared/components/summary-card/summary-card-skeleton';

interface CanalCard {
  readonly id: string;
  readonly nombre: string;
  readonly metrics: readonly StatusCardMetric[];
}

/** Rutas relativas desde `plataformas/:proyectoId/categorias/:procesoId`. */
const PLATAFORMA_LINK = '../..';
const CONCILIACIONES_LINK = '../../../..';
const SKELETON_COUNT = 4;

@Component({
  selector: 'app-category',
  imports: [
    EmptyState,
    ErrorState,
    PageHeader,
    PageHeaderSkeleton,
    SectionTitle,
    StatusCard,
    StatusCardSkeleton,
    SummaryCard,
    SummaryCardSkeleton,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './category.html',
})
export class Category {
  private readonly proyectosService = inject(ProyectosService);
  private readonly procesosService = inject(ProcesosService);
  private readonly subprocesosService = inject(SubprocesosService);

  /** Id de la plataforma, enlazado desde el parámetro de ruta `:proyectoId`. */
  readonly proyectoId = input.required<string>();
  /** Id de la categoría, enlazado desde el parámetro de ruta `:procesoId`. */
  readonly procesoId = input.required<string>();

  protected readonly plataformaLink = PLATAFORMA_LINK;
  protected readonly skeletons = Array.from({ length: SKELETON_COUNT }, (_, index) => index);

  protected readonly proyecto = rxResource({
    params: () => this.proyectoId(),
    stream: ({ params }) => this.proyectosService.getProyecto(params),
  });

  protected readonly proceso = rxResource({
    params: () => ({ proyectoId: this.proyectoId(), procesoId: this.procesoId() }),
    stream: ({ params }) => this.procesosService.getProceso(params.proyectoId, params.procesoId),
  });

  protected readonly subprocesos = rxResource({
    params: () => this.procesoId(),
    stream: ({ params }) => this.subprocesosService.getSubprocesos(params),
  });

  protected readonly nombrePlataforma = computed(
    () => resourceValue(this.proyecto)?.nombreProyecto ?? 'Plataforma',
  );
  protected readonly nombre = computed(() => resourceValue(this.proceso)?.nombreProceso ?? 'Categoría');

  /** El encabezado espera a conocer ambos nombres para no mostrar textos provisionales. */
  protected readonly headerLoading = computed(
    () => this.proyecto.isLoading() || this.proceso.isLoading(),
  );

  protected readonly breadcrumbs = computed<readonly PageHeaderBreadcrumb[]>(() => [
    { label: 'Inicio', link: '/' },
    { label: 'Conciliaciones', link: CONCILIACIONES_LINK },
    { label: this.nombrePlataforma(), link: PLATAFORMA_LINK },
    { label: this.nombre() },
  ]);

  /** "Canales de recargas", "Canales de anulaciones", ... */
  protected readonly tituloCanales = computed(() =>
    resourceValue(this.proceso)
      ? `Canales de ${this.nombre().toLocaleLowerCase('es')}`
      : 'Canales',
  );

  protected readonly hasError = computed(
    () => !!this.proyecto.error() || !!this.proceso.error() || !!this.subprocesos.error(),
  );

  protected readonly resumen = computed<readonly SummaryMetric[]>(() => {
    const resultado = resourceValue(this.subprocesos);
    return resultado ? totalsToSummaryMetrics(resultado) : [];
  });

  /** Hora en que se consultaron los canales ("Última actualización"). */
  protected readonly ultimaActualizacion = computed(
    () => resourceValue(this.subprocesos)?.consultadoEn ?? null,
  );

  protected readonly canales = computed<readonly CanalCard[]>(() =>
    (resourceValue(this.subprocesos)?.data ?? []).map((subproceso) => {
      const monto = subproceso.monto ?? null;
      const metrics: StatusCardMetric[] = [
        { value: formatInteger(subproceso.cantidad), label: 'Casos' },
      ];
      if (monto !== null) {
        metrics.push({ value: formatCurrency(monto), label: 'Monto afectado' });
      }
      return { id: subproceso.subProcesoId, nombre: subproceso.nombreSubProceso, metrics };
    }),
  );

  /** Mensaje para lectores de pantalla sobre el estado de la carga. */
  protected readonly statusMessage = computed(() => {
    if (this.subprocesos.isLoading()) {
      return 'Cargando la información de la categoría…';
    }
    if (this.subprocesos.status() === 'resolved') {
      const total = this.canales().length;
      return total === 1 ? 'Se cargó 1 canal.' : `Se cargaron ${total} canales.`;
    }
    return '';
  });

  protected reload(): void {
    for (const resource of [this.proyecto, this.proceso, this.subprocesos]) {
      if (resource.error()) {
        resource.reload();
      }
    }
  }
}
