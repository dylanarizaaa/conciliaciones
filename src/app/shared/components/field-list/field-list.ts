import { NgComponentOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { EmptyStateDefinition } from '../../../core/data-access/vista.model';
import type { ValueCellView } from '../data-table/cells/value-cell';

/** Una fila etiqueta / valor, con el valor listo para pintar con el catálogo de celdas. */
export interface FieldListRow {
  readonly header: string;
  readonly view: ValueCellView;
}

/**
 * Tarjeta con pares etiqueta / valor ("Contenido acordeón" del handoff). Si no hay datos muestra
 * el mensaje de `emptyState`.
 */
@Component({
  selector: 'app-field-list',
  imports: [NgComponentOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-col gap-4 rounded-card bg-gris-inicial p-4' },
  template: `
    @if (empty()) {
      <p class="text-sm leading-5 font-semibold text-foreground">
        {{ emptyState()?.title ?? 'Sin información en este aplicativo.' }}
      </p>
      @if (emptyState()?.description; as description) {
        <p class="text-sm leading-5 text-muted-foreground">{{ description }}</p>
      }
    } @else {
      @if (title(); as title) {
        <p role="heading" [attr.aria-level]="headingLevel()" class="text-base leading-5 font-semibold text-foreground">
          {{ title }}
        </p>
      }
      @if (rows().length > 0) {
        <dl class="flex flex-col gap-3">
          <!-- Por posición: una plantilla puede repetir el id de una columna. -->
          @for (row of rows(); track $index) {
            <div class="flex min-w-0 flex-col">
              <dt class="text-sm leading-5 text-muted-foreground">{{ row.header }}</dt>
              <dd class="min-w-0 text-sm leading-5 font-semibold text-foreground">
                <ng-container *ngComponentOutlet="row.view.component; inputs: row.view.inputs" />
              </dd>
            </div>
          }
        </dl>
      }
    }
  `,
})
export class FieldList {
  /** Título de la tarjeta ("Número de guía: 70002333336"); vacío para no mostrarlo. */
  readonly title = input<string>('');
  readonly rows = input<readonly FieldListRow[]>([]);
  /** No hay datos que mostrar: se muestra `emptyState`. */
  readonly empty = input<boolean>(false);
  readonly emptyState = input<EmptyStateDefinition | undefined>(undefined);
  /** Nivel del título dentro de la jerarquía de encabezados de la página. */
  readonly headingLevel = input<number>(4);
}
