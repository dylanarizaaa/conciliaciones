import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { HlmSkeleton } from '@spartan-ng/helm/skeleton';
import { ProcesosService } from '../../../core/data-access/procesos.service';
import { ProyectosService } from '../../../core/data-access/proyectos.service';
import { ReglasService } from '../../../core/data-access/reglas.service';
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
 * `plataformas/:proyectoId/categorias/:procesoId/canales/:subProcesoId/reglas/:reglaId/casos/:conciliacionId`.
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
  private readonly reglas = inject(ReglasService);

  /**
   * Parámetros de ruta `:proyectoId`, `:procesoId`, `:subProcesoId`, `:reglaId` y
   * `:conciliacionId` (el `rowId` de la fila de la pantalla Regla).
   */
  readonly proyectoId = injectRouteParam('proyectoId');
  readonly procesoId = injectRouteParam('procesoId');
  readonly subProcesoId = injectRouteParam('subProcesoId');
  readonly reglaId = injectRouteParam('reglaId');
  readonly conciliacionId = injectRouteParam('conciliacionId');

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

  /** La URL trae el id de la regla; el nombre sale del listado de reglas del canal. */
  protected readonly regla = rxResource({
    params: () => ({ subProcesoId: this.subProcesoId(), reglaId: this.reglaId() }),
    stream: ({ params }) => this.reglas.getRegla(params.subProcesoId, params.reglaId),
  });

  protected readonly nombreRegla = computed(() => resourceValue(this.regla)?.nombreRegla ?? 'Regla');

  protected readonly headerLoading = computed(
    () =>
      this.proyecto.isLoading() ||
      this.proceso.isLoading() ||
      this.subproceso.isLoading() ||
      this.regla.isLoading(),
  );

  protected readonly breadcrumbs = computed<readonly PageHeaderBreadcrumb[]>(() => [
    { label: 'Conciliaciones', link: CONCILIACIONES_LINK },
    { label: resourceValue(this.proyecto)?.nombreProyecto ?? 'Plataforma', link: PLATAFORMA_LINK },
    { label: resourceValue(this.proceso)?.nombreProceso ?? 'Categoría', link: CATEGORIA_LINK },
    { label: resourceValue(this.subproceso)?.nombreSubProceso ?? 'Canal', link: CANAL_LINK },
    { label: this.nombreRegla(), link: REGLA_LINK },
    { label: 'Detalle' },
  ]);

  // --- Plantilla -------------------------------------------------------------------------------

  /** La plantilla es la misma para todos los casos de la regla: no se vuelve a pedir por caso. */
  protected readonly plantilla = rxResource({
    params: () => this.reglaId(),
    stream: ({ params }) => this.vistas.getPlantillaCaso(params),
  });

  /** Todos los bloques (las pestañas referencian bloques que no están en el layout). */
  protected readonly bloques = computed(() => resourceValue(this.plantilla)?.blocks ?? []);

  /** Bloques de primer nivel, en el orden del layout. */
  protected readonly bloquesLayout = computed(() => {
    const plantilla = resourceValue(this.plantilla);
    return plantilla ? layoutBlocks(plantilla) : [];
  });

  /** Parámetros para resolver `dataSource.path` y `dataSource.query` (`{conciliacionId}`, ...). */
  protected readonly pathParams = computed(() => ({
    proyectoId: this.proyectoId(),
    procesoId: this.procesoId(),
    subProcesoId: this.subProcesoId(),
    reglaId: this.reglaId(),
    conciliacionId: this.conciliacionId(),
  }));

  protected readonly hasError = computed(
    () =>
      !!this.proyecto.error() ||
      !!this.proceso.error() ||
      !!this.subproceso.error() ||
      !!this.plantilla.error(),
  );

  protected reload(): void {
    for (const resource of [this.proyecto, this.proceso, this.subproceso, this.regla, this.plantilla]) {
      if (resource.error()) {
        resource.reload();
      }
    }
  }
}
