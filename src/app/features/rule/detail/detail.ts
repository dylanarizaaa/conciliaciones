import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { HlmSkeleton } from '@spartan-ng/helm/skeleton';
import { ProcesosService } from '../../../core/data-access/procesos.service';
import { ProyectosService } from '../../../core/data-access/proyectos.service';
import { SubprocesosService } from '../../../core/data-access/subprocesos.service';
import { layoutBlocks } from '../../../core/data-access/vista.utils';
import { VistasService } from '../../../core/data-access/vistas.service';
import { resourceValue } from '../../../core/resource/resource-value';
import { injectRouteParam } from '../../../core/routing/route-params';
import { EmptyState } from '../../../shared/components/empty-state/empty-state';
import { ErrorState } from '../../../shared/components/error-state/error-state';
import {
  PageHeader,
  type PageHeaderBreadcrumb,
} from '../../../shared/components/page-header/page-header';
import { PageHeaderSkeleton } from '../../../shared/components/page-header/page-header-skeleton';
import { ViewBlockOutlet } from '../../../shared/components/view/view-block';

/**
 * Rutas relativas desde
 * `plataformas/:proyectoId/categorias/:procesoId/canales/:subProcesoId/reglas/:regla/casos/:casoId`.
 */
const REGLA_LINK = '../..';
const CANAL_LINK = '../../../..';
const CATEGORIA_LINK = '../../../../../..';
const PLATAFORMA_LINK = '../../../../../../../..';
const CONCILIACIONES_LINK = '../../../../../../../../../..';

/**
 * Pantalla de detalle de un caso ("Detalle de la diferencia"). El encabezado es fijo; el contenido
 * (acordeones, pestañas y tablas) y sus fuentes de datos vienen de la plantilla del back
 * (contrato en `docs/contrato-vista`).
 */
@Component({
  selector: 'app-detail',
  imports: [EmptyState, ErrorState, HlmSkeleton, PageHeader, PageHeaderSkeleton, ViewBlockOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './detail.html',
})
export class Detail {
  private readonly proyectosService = inject(ProyectosService);
  private readonly procesosService = inject(ProcesosService);
  private readonly subprocesosService = inject(SubprocesosService);
  private readonly vistas = inject(VistasService);

  /** Parámetros de ruta `:proyectoId`, `:procesoId`, `:subProcesoId`, `:regla` y `:casoId`. */
  readonly proyectoId = injectRouteParam('proyectoId');
  readonly procesoId = injectRouteParam('procesoId');
  readonly subProcesoId = injectRouteParam('subProcesoId');
  readonly regla = injectRouteParam('regla');
  readonly casoId = injectRouteParam('casoId');

  protected readonly reglaLink = REGLA_LINK;

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

  protected readonly headerLoading = computed(
    () => this.proyecto.isLoading() || this.proceso.isLoading() || this.subproceso.isLoading(),
  );

  protected readonly breadcrumbs = computed<readonly PageHeaderBreadcrumb[]>(() => [
    { label: 'Conciliaciones', link: CONCILIACIONES_LINK },
    { label: resourceValue(this.proyecto)?.nombreProyecto ?? 'Plataforma', link: PLATAFORMA_LINK },
    { label: resourceValue(this.proceso)?.nombreProceso ?? 'Categoría', link: CATEGORIA_LINK },
    { label: resourceValue(this.subproceso)?.nombreSubProceso ?? 'Canal', link: CANAL_LINK },
    { label: this.regla(), link: REGLA_LINK },
    { label: 'Detalle' },
  ]);

  // --- Plantilla -------------------------------------------------------------------------------

  /** La plantilla es la misma para todos los casos de la regla: no se vuelve a pedir por caso. */
  protected readonly plantilla = rxResource({
    params: () => ({ subProcesoId: this.subProcesoId(), regla: this.regla() }),
    stream: ({ params }) => this.vistas.getPlantillaCaso(params.subProcesoId, params.regla),
  });

  /** Todos los bloques (las pestañas referencian bloques que no están en el layout). */
  protected readonly bloques = computed(() => resourceValue(this.plantilla)?.blocks ?? []);

  /** Bloques de primer nivel, en el orden del layout. */
  protected readonly bloquesLayout = computed(() => {
    const plantilla = resourceValue(this.plantilla);
    return plantilla ? layoutBlocks(plantilla) : [];
  });

  /** Parámetros para resolver las rutas del contrato (`{subProcesoId}`, `{regla}`, `{casoId}`...). */
  protected readonly pathParams = computed(() => ({
    proyectoId: this.proyectoId(),
    procesoId: this.procesoId(),
    subProcesoId: this.subProcesoId(),
    regla: this.regla(),
    casoId: this.casoId(),
  }));

  protected readonly hasError = computed(
    () =>
      !!this.proyecto.error() ||
      !!this.proceso.error() ||
      !!this.subproceso.error() ||
      !!this.plantilla.error(),
  );

  protected reload(): void {
    for (const resource of [this.proyecto, this.proceso, this.subproceso, this.plantilla]) {
      if (resource.error()) {
        resource.reload();
      }
    }
  }
}
