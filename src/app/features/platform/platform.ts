import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { resourceValue } from '../../core/resource/resource-value';
import { injectRouteParam } from '../../core/routing/route-params';
import { ProcesosService } from '../../core/data-access/procesos.service';
import { ProyectosService } from '../../core/data-access/proyectos.service';
import { formatCurrency, formatInteger } from '../../core/format/formatters';
import { DifferenceCard } from '../../shared/components/difference-card/difference-card';
import { DifferenceCardSkeleton } from '../../shared/components/difference-card/difference-card-skeleton';
import { EmptyState } from '../../shared/components/empty-state/empty-state';
import { ErrorState } from '../../shared/components/error-state/error-state';
import { PageHeader, type PageHeaderBreadcrumb } from '../../shared/components/page-header/page-header';
import { PageHeaderSkeleton } from '../../shared/components/page-header/page-header-skeleton';
import { SectionTitle } from '../../shared/components/section-title/section-title';
import {
  SummaryCard,
  type SummaryMetric,
  totalsToSummaryMetrics,
} from '../../shared/components/summary-card/summary-card';
import { SummaryCardSkeleton } from '../../shared/components/summary-card/summary-card-skeleton';

interface CategoriaCard {
  readonly id: string;
  readonly nombre: string;
  readonly casos: string;
  readonly monto: string | null;
  readonly inactiva: boolean;
}

/** Ruta relativa a Conciliaciones desde `plataformas/:proyectoId`. */
const CONCILIACIONES_LINK = '../..';
const SKELETON_COUNT = 3;

@Component({
  selector: 'app-platform',
  imports: [
    DifferenceCard,
    DifferenceCardSkeleton,
    EmptyState,
    ErrorState,
    PageHeader,
    PageHeaderSkeleton,
    SectionTitle,
    SummaryCard,
    SummaryCardSkeleton,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './platform.html',
})
export class Platform {
  private readonly proyectosService = inject(ProyectosService);
  private readonly procesosService = inject(ProcesosService);

  /** Id de la plataforma, del parámetro de ruta `:proyectoId`. */
  readonly proyectoId = injectRouteParam('proyectoId');

  protected readonly conciliacionesLink = CONCILIACIONES_LINK;
  protected readonly skeletons = Array.from({ length: SKELETON_COUNT }, (_, index) => index);

  protected readonly proyecto = rxResource({
    params: () => this.proyectoId(),
    stream: ({ params }) => this.proyectosService.getProyecto(params),
  });

  protected readonly procesos = rxResource({
    params: () => this.proyectoId(),
    stream: ({ params }) => this.procesosService.getProcesos(params),
  });

  protected readonly nombre = computed(() => resourceValue(this.proyecto)?.nombreProyecto ?? 'Plataforma');

  protected readonly breadcrumbs = computed<readonly PageHeaderBreadcrumb[]>(() => [
    { label: 'Inicio', link: '/' },
    { label: 'Conciliaciones', link: CONCILIACIONES_LINK },
    { label: this.nombre() },
  ]);

  protected readonly hasError = computed(() => !!this.proyecto.error() || !!this.procesos.error());

  protected readonly resumen = computed<readonly SummaryMetric[]>(() => {
    const resultado = resourceValue(this.procesos);
    return resultado ? totalsToSummaryMetrics(resultado) : [];
  });

  /** Hora en que se consultaron los procesos ("Última actualización"). */
  protected readonly ultimaActualizacion = computed(
    () => resourceValue(this.procesos)?.consultadoEn ?? null,
  );

  protected readonly categorias = computed<readonly CategoriaCard[]>(() =>
    (resourceValue(this.procesos)?.data ?? []).map((proceso) => {
      const monto = proceso.monto ?? null;
      return {
        id: proceso.procesoId,
        nombre: proceso.nombreProceso,
        casos: formatInteger(proceso.cantidad),
        monto: monto === null ? null : formatCurrency(monto),
        inactiva: proceso.cantidad === 0,
      };
    }),
  );

  /** Mensaje para lectores de pantalla sobre el estado de la carga. */
  protected readonly statusMessage = computed(() => {
    if (this.procesos.isLoading()) {
      return 'Cargando la información de la plataforma…';
    }
    if (this.procesos.status() === 'resolved') {
      const total = this.categorias().length;
      return total === 1 ? 'Se cargó 1 categoría.' : `Se cargaron ${total} categorías.`;
    }
    return '';
  });

  protected reload(): void {
    if (this.proyecto.error()) {
      this.proyecto.reload();
    }
    if (this.procesos.error()) {
      this.procesos.reload();
    }
  }
}
