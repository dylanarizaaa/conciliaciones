import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { HlmAccordionImports } from '@spartan-ng/helm/accordion';
import { HlmSkeleton } from '@spartan-ng/helm/skeleton';
import type { AccordionBlock, FuenteDetalle } from '../../../core/data-access/vista.model';
import { interpolateRow, resolveApiPath, resolveQuery } from '../../../core/data-access/vista.utils';
import { VistasService } from '../../../core/data-access/vistas.service';
import { resourceValue } from '../../../core/resource/resource-value';
import { EmptyState } from '../empty-state/empty-state';
import { ErrorState } from '../error-state/error-state';
import { FieldList } from '../field-list/field-list';
import { SectionTitle } from '../section-title/section-title';

/** Acordeones de relleno mientras llegan las fuentes. */
const SKELETON_ITEMS = 6;

let nextId = 0;

interface AccordionItem {
  readonly key: string;
  readonly title: string;
  readonly fuente: FuenteDetalle;
}

/**
 * Bloque `accordion` de la vista paramétrica ("Contenedor acordeones" del handoff): pide las
 * fuentes declaradas en `dataSource` (forma de `GET /Conciliaciones/fuentes-detalle`) y pinta un
 * acordeón por fuente, con sus datos. En pantallas anchas los reparte en columnas.
 */
@Component({
  selector: 'app-view-accordion',
  imports: [EmptyState, ErrorState, FieldList, HlmAccordionImports, HlmSkeleton, SectionTitle],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <section class="flex flex-col gap-6" [attr.aria-labelledby]="titleId">
      <p class="sr-only" role="status">{{ fuentes.isLoading() ? 'Cargando la información…' : '' }}</p>

      @if (fuentes.error()) {
        <app-error-state title="No pudimos cargar esta información." (retry)="fuentes.reload()" />
      } @else if (fuentes.hasValue()) {
        @if (title(); as title) {
          <h2 appSectionTitle [id]="titleId">{{ title }}</h2>
        } @else {
          <!-- Sin título en la plantilla: los acordeones (h3) siguen colgando de un h2 (axe: heading-order). -->
          <h2 class="sr-only" [id]="titleId">{{ fallbackTitle }}</h2>
        }
        @if (items().length === 0) {
          <app-empty-state title="No hay información de los aplicativos para esta diferencia." />
        } @else {
          <div class="rounded-card bg-card p-4 shadow-capa-1">
            <!-- Un solo acordeón para todas las columnas: las flechas del teclado las recorren seguidas. -->
            <div hlmAccordion [type]="type()" class="md:flex-row md:gap-x-[4.125rem]">
              @for (column of layoutColumns(); track $index) {
                <div class="flex min-w-0 flex-1 flex-col gap-8">
                  @for (item of column; track item.key) {
                    <div hlmAccordionItem>
                      <hlm-accordion-trigger>{{ item.title }}</hlm-accordion-trigger>
                      <hlm-accordion-content>
                        <app-field-list [fuente]="item.fuente" [definition]="block().accordion" />
                      </hlm-accordion-content>
                    </div>
                  }
                </div>
              }
            </div>
          </div>
        }
      } @else {
        <div class="flex flex-col gap-6" aria-hidden="true">
          @if (block().title) {
            <hlm-skeleton class="h-4 w-48 bg-foreground/10" />
          }
          <div class="rounded-card bg-card p-4 shadow-capa-1">
            <div class="flex flex-col gap-8 md:flex-row md:gap-x-[4.125rem]">
              @for (column of skeletonColumns(); track $index) {
                <div class="flex flex-1 flex-col gap-8">
                  @for (item of column; track item) {
                    <div class="flex h-8 items-start border-b border-gris-rafaga">
                      <hlm-skeleton class="h-5 w-56 max-w-full bg-foreground/10" />
                    </div>
                  }
                </div>
              }
            </div>
          </div>
        </div>
      }
    </section>
  `,
})
export class ViewAccordion {
  private readonly vistas = inject(VistasService);

  /** Bloque de la plantilla. */
  readonly block = input.required<AccordionBlock>();
  /** Parámetros de la ruta del front para resolver `dataSource.path` y `dataSource.query`. */
  readonly params = input.required<Readonly<Record<string, string>>>();

  protected readonly titleId = `app-view-accordion-title-${nextId++}`;
  protected readonly fallbackTitle = 'Información por aplicativo';

  protected readonly fuentes = rxResource({
    params: () => {
      const { path, query } = this.block().dataSource;
      return { path: resolveApiPath(path, this.params()), query: resolveQuery(query, this.params()) };
    },
    stream: ({ params }) => this.vistas.getFuentes(params.path, params.query),
  });

  /** Un acordeón por fuente, en el orden en que llegan. */
  protected readonly items = computed<AccordionItem[]>(() =>
    (resourceValue(this.fuentes)?.data ?? [])
      .filter((fuente): fuente is FuenteDetalle => !!fuente)
      .map((fuente, index) => ({
        key: `${index}-${fuente.nombre ?? ''}`,
        title: fuente.nombre?.trim() || `Aplicativo ${index + 1}`,
        fuente,
      })),
  );

  /** El título admite `{campo}` de la respuesta (p. ej. el nombre del cliente, si el back lo envía). */
  protected readonly title = computed(() => {
    const title = this.block().title;
    const respuesta = resourceValue(this.fuentes);
    return title && respuesta ? interpolateRow(title, respuesta).trim() : '';
  });

  protected readonly type = computed(() => this.block().accordion.type ?? 'multiple');

  private readonly columnCount = computed(() => this.block().accordion.layoutColumns ?? 1);

  /** Reparte los acordeones en orden: la primera mitad a la izquierda y el resto a la derecha. */
  protected readonly layoutColumns = computed(() => split(this.items(), this.columnCount()));

  protected readonly skeletonColumns = computed(() =>
    split(
      Array.from({ length: SKELETON_ITEMS }, (_, index) => index),
      this.columnCount(),
    ),
  );
}

function split<T>(items: readonly T[], columns: number): T[][] {
  const count = Math.max(1, Math.min(columns, items.length));
  const perColumn = Math.ceil(items.length / count);
  return Array.from({ length: count }, (_, index) => items.slice(index * perColumn, (index + 1) * perColumn));
}
