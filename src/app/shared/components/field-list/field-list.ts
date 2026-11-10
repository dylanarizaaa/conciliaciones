import { NgComponentOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { FieldListDefinition, ViewRecord } from '../../../core/data-access/vista.model';
import { getPath, interpolateRow, isEmptyValue } from '../../../core/data-access/vista.utils';
import { valueCellResolver } from '../data-table/cells/value-cell';

/**
 * Tarjeta con encabezado / valor por cada columna de un registro ("Contenido acordeón" del
 * handoff). Los valores se pintan con el mismo catálogo de celdas de la tabla (`TextCell`,
 * `CurrencyCell`, ...). Si ninguna columna trae dato muestra el mensaje de `emptyState`.
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
      <dl class="flex flex-col gap-3">
        @for (column of columns(); track column.id) {
          <div class="flex min-w-0 flex-col">
            <dt class="text-sm leading-5 text-muted-foreground">{{ column.header }}</dt>
            <dd class="min-w-0 text-sm leading-5 font-semibold text-foreground">
              <ng-container *ngComponentOutlet="column.view.component; inputs: column.view.inputs" />
            </dd>
          </div>
        }
      </dl>
    }
  `,
})
export class FieldList {
  /** Título y columnas (vienen de la plantilla). */
  readonly definition = input.required<FieldListDefinition>();
  /** Registro del que se leen los valores. */
  readonly record = input.required<ViewRecord>();
  /** Nivel del título dentro de la jerarquía de encabezados de la página. */
  readonly headingLevel = input<number>(4);

  /** El catálogo se resuelve una vez por plantilla, no en cada cambio de datos. */
  private readonly resolvers = computed(() =>
    this.definition().columns.map((column) => ({
      column,
      resolve: valueCellResolver(column.cell, { wrap: true }),
    })),
  );

  protected readonly columns = computed(() => {
    const record = this.record();
    return this.resolvers().map(({ column, resolve }) => {
      const value = getPath(record, column.accessorKey);
      return { id: column.id, header: column.header, value, view: resolve(value, record) };
    });
  });

  protected readonly isEmpty = computed(() => this.columns().every(({ value }) => isEmptyValue(value)));

  protected readonly title = computed(() => {
    const title = this.definition().title;
    return title ? interpolateRow(title, this.record()).trim() : '';
  });

  protected readonly emptyTitle = computed(
    () => this.definition().emptyState?.title ?? 'Sin información.',
  );
}
