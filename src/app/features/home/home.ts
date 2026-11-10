import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { resourceValue } from '../../core/resource/resource-value';
import { ProyectosService } from '../../core/data-access/proyectos.service';
import { formatCurrency, formatInteger } from '../../core/format/formatters';
import { EmptyState } from '../../shared/components/empty-state/empty-state';
import { ErrorState } from '../../shared/components/error-state/error-state';
import { PageHeader, type PageHeaderBreadcrumb } from '../../shared/components/page-header/page-header';
import { SectionTitle } from '../../shared/components/section-title/section-title';
import { StatusCard, type StatusCardMetric } from '../../shared/components/status-card/status-card';
import { StatusCardSkeleton } from '../../shared/components/status-card/status-card-skeleton';

interface PlataformaCard {
  readonly id: string;
  readonly nombre: string;
  readonly metrics: readonly StatusCardMetric[];
}

const SKELETON_COUNT = 4;

@Component({
  selector: 'app-home',
  imports: [EmptyState, ErrorState, PageHeader, SectionTitle, StatusCard, StatusCardSkeleton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './home.html',
})
export class Home {
  private readonly proyectosService = inject(ProyectosService);

  protected readonly breadcrumbs: readonly PageHeaderBreadcrumb[] = [
    { label: 'Conciliaciones' },
  ];
  protected readonly skeletons = Array.from({ length: SKELETON_COUNT }, (_, index) => index);

  protected readonly proyectos = rxResource({
    stream: () => this.proyectosService.getProyectos(),
  });

  protected readonly plataformas = computed<readonly PlataformaCard[]>(() =>
    (resourceValue(this.proyectos) ?? []).map((proyecto) => ({
      id: proyecto.proyectoId,
      nombre: proyecto.nombreProyecto,
      metrics: [
        { value: formatInteger(proyecto.cantidad), label: 'Casos' },
        { value: formatCurrency(proyecto.monto), label: 'Monto afectado' },
      ],
    })),
  );

  /** Mensaje para lectores de pantalla sobre el estado de la carga. */
  protected readonly statusMessage = computed(() => {
    if (this.proyectos.isLoading()) {
      return 'Cargando plataformas…';
    }
    if (this.proyectos.status() === 'resolved') {
      const total = this.plataformas().length;
      return total === 1 ? 'Se cargó 1 plataforma.' : `Se cargaron ${total} plataformas.`;
    }
    return '';
  });

  protected reload(): void {
    this.proyectos.reload();
  }
}
