import { NgComponentOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type {
  AccordionDefinition,
  FuenteDetalle,
  ViewRecord,
} from '../../../core/data-access/vista.model';
import { isEmptyValue } from '../../../core/data-access/vista.utils';
import { toText } from '../data-table/cells/cell-styles';
import { cellForType, valueCellResolver } from '../data-table/cells/value-cell';

const NO_RECORD: ViewRecord = {};

/**
 * Tarjeta con los datos de una fuente ("Contenido acordeón" del handoff): el nombre de cada dato
 * como etiqueta y su valor pintado con el catálogo de celdas de la tabla, según su `tipo`. Si
 * ningún dato trae valor muestra el mensaje de `emptyState`.
 */
@Component({
  selector: 'app-field-list',
  imports: [NgComponentOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-col gap-4 rounded-card bg-gris-inicial p-4' },
  template: `
    @if (isEmpty()) {
      <p class="text-sm leading-5 font-semibold text-foreground">{{ emptyTitle() }}</p>
      @if (definition().emptyState?.description; as description) {
        <p class="text-sm leading-5 text-muted-foreground">{{ description }}</p>
      }
    } @else {
      @if (title(); as title) {
        <p role="heading" [attr.aria-level]="headingLevel()" class="text-base leading-5 font-semibold text-foreground">
          {{ title }}
        </p>
      }
      @if (datos().length > 0) {
        <dl class="flex flex-col gap-3">
          @for (dato of datos(); track $index) {
            <div class="flex min-w-0 flex-col">
              <dt class="text-sm leading-5 text-muted-foreground">{{ dato.nombre }}</dt>
              <dd class="min-w-0 text-sm leading-5 font-semibold text-foreground">
                <ng-container *ngComponentOutlet="dato.view.component; inputs: dato.view.inputs" />
              </dd>
            </div>
          }
        </dl>
      }
    }
  `,
})
export class FieldList {
  /** Datos de la fuente (vienen del back). */
  readonly fuente = input.required<FuenteDetalle>();
  /** Presentación: dato del título, celdas por tipo y mensaje sin datos (vienen de la plantilla). */
  readonly definition = input.required<AccordionDefinition>();
  /** Nivel del título dentro de la jerarquía de encabezados de la página. */
  readonly headingLevel = input<number>(4);

  private readonly todos = computed(() =>
    (this.fuente().datos ?? []).filter((dato) => !!dato && toText(dato.nombre) !== null),
  );

  private readonly titleDato = computed(() => {
    const field = this.definition().titleField?.trim().toLowerCase();
    return field ? this.todos().find((dato) => dato.nombre?.trim().toLowerCase() === field) : undefined;
  });

  protected readonly title = computed(() => {
    const dato = this.titleDato();
    const value = toText(dato?.valor);
    return dato && value !== null ? `${dato.nombre}: ${value}` : '';
  });

  protected readonly datos = computed(() => {
    const overrides = this.definition().cellsByType ?? {};
    const titleDato = this.titleDato();
    return this.todos()
      .filter((dato) => dato !== titleDato)
      .map((dato) => ({
        nombre: dato.nombre,
        view: valueCellResolver(cellForType(dato.tipo, overrides), { wrap: true })(dato.valor, NO_RECORD),
      }));
  });

  protected readonly isEmpty = computed(() => this.todos().every((dato) => isEmptyValue(dato.valor)));

  protected readonly emptyTitle = computed(
    () => this.definition().emptyState?.title ?? 'Sin información en este aplicativo.',
  );
}
