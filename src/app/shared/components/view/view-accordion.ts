import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { HlmAccordionImports } from '@spartan-ng/helm/accordion';
import { HlmSkeleton } from '@spartan-ng/helm/skeleton';
import type {
  AccordionBlock,
  AccordionItemDefinition,
} from '../../../core/data-access/vista.model';
import { interpolateRow, resolveApiPath } from '../../../core/data-access/vista.utils';
import { VistasService } from '../../../core/data-access/vistas.service';
import { resourceValue } from '../../../core/resource/resource-value';
import { ErrorState } from '../error-state/error-state';
import { FieldList } from '../field-list/field-list';
import { SectionTitle } from '../section-title/section-title';

let nextId = 0;

/**
 * Bloque `accordion` de la vista paramétrica ("Contenedor acordeones" del handoff): pide el
 * registro declarado en `dataSource` y pinta un acordeón por cada elemento de la plantilla, con
 * sus campos. En pantallas anchas los reparte en columnas.
 */
@Component({
  selector: 'app-view-accordion',
  imports: [ErrorState, FieldList, HlmAccordionImports, HlmSkeleton, SectionTitle],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <section class="flex flex-col gap-6" [attr.aria-labelledby]="title() ? titleId : null">
      <p class="sr-only" role="status">{{ registro.isLoading() ? 'Cargando la información…' : '' }}</p>

      @if (registro.error()) {
        <app-error-state title="No pudimos cargar esta información." (retry)="registro.reload()" />
      } @else if (record(); as record) {
        @if (title(); as title) {
          <h2 appSectionTitle [id]="titleId">{{ title }}</h2>
        }
        <div class="rounded-card bg-card p-4 shadow-capa-1">
          <!-- Un solo acordeón para todas las columnas: las flechas del teclado las recorren seguidas. -->
          <div hlmAccordion [type]="type()" class="md:flex-row md:gap-x-[4.125rem]">
            @for (column of layoutColumns(); track $index) {
              <div class="flex min-w-0 flex-1 flex-col gap-8">
                @for (item of column; track item.id) {
                  <div hlmAccordionItem [isOpened]="item.defaultOpen ?? false">
                    <hlm-accordion-trigger>{{ item.title }}</hlm-accordion-trigger>
                    <hlm-accordion-content>
                      <app-field-list [definition]="item.content" [record]="record" />
                    </hlm-accordion-content>
                  </div>
                }
              </div>
            }
          </div>
        </div>
      } @else {
        <div class="flex flex-col gap-6" aria-hidden="true">
          @if (block().title) {
            <hlm-skeleton class="h-4 w-48 bg-foreground/10" />
          }
          <div class="rounded-card bg-card p-4 shadow-capa-1">
            <div class="flex flex-col gap-8 md:flex-row md:gap-x-[4.125rem]">
              @for (column of layoutColumns(); track $index) {
                <div class="flex flex-1 flex-col gap-8">
                  @for (item of column; track item.id) {
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
  /** Parámetros de la ruta del front para resolver `dataSource.path`. */
  readonly params = input.required<Readonly<Record<string, string>>>();

  protected readonly titleId = `app-view-accordion-title-${nextId++}`;

  protected readonly registro = rxResource({
    params: () => resolveApiPath(this.block().dataSource.path, this.params()),
    stream: ({ params }) => this.vistas.getRegistro(params),
  });

  protected readonly record = computed(() => resourceValue(this.registro));

  /** El título admite `{campo}` del registro (p. ej. el nombre del cliente). */
  protected readonly title = computed(() => {
    const title = this.block().title;
    const record = this.record();
    return title && record ? interpolateRow(title, record).trim() : '';
  });

  protected readonly type = computed(() => this.block().accordion.type ?? 'multiple');

  /** Reparte los acordeones en orden: la primera mitad a la izquierda y el resto a la derecha. */
  protected readonly layoutColumns = computed<AccordionItemDefinition[][]>(() => {
    const { items, layoutColumns = 1 } = this.block().accordion;
    const count = Math.max(1, Math.min(layoutColumns, items.length));
    const perColumn = Math.ceil(items.length / count);
    return Array.from({ length: count }, (_, index) =>
      items.slice(index * perColumn, (index + 1) * perColumn),
    );
  });
}
