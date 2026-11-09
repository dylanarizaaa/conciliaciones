import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { HlmCheckbox } from '@spartan-ng/helm/checkbox';
import {
  injectTableCellContext,
  injectTableHeaderContext,
  type RowData,
  rowSelectionFeature,
  tableFeatures,
} from '@tanstack/angular-table';

/** Las celdas de selección solo necesitan las APIs de `rowSelectionFeature`. */
const selectionFeatures = tableFeatures({ rowSelectionFeature });
type SelectionFeatures = typeof selectionFeatures;

/**
 * `RowCheckbox` del catálogo ("Tabla columna check"): marca la fila. La selección vive en el
 * estado `rowSelection` de TanStack, indexada por el `rowId` de la plantilla.
 */
@Component({
  selector: 'app-row-checkbox',
  imports: [HlmCheckbox],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex' },
  template: `
    <hlm-checkbox
      [checked]="selected()"
      [disabled]="!canSelect()"
      [aria-label]="ariaLabel()"
      (checkedChange)="toggle($event)"
    />
  `,
})
export class RowCheckbox {
  private readonly cell = injectTableCellContext<SelectionFeatures, RowData, unknown>();

  /** Nombre accesible ya resuelto con los datos de la fila. */
  readonly ariaLabel = input.required<string>();

  protected readonly selected = computed(() => this.cell().row.getIsSelected());
  protected readonly canSelect = computed(() => this.cell().row.getCanSelect());

  protected toggle(checked: boolean): void {
    this.cell().row.toggleSelected(checked);
  }
}

/**
 * `SelectAllCheckbox` del catálogo: marca o desmarca las filas de la página visible. Cuando solo
 * hay algunas marcadas muestra el estado intermedio (`aria-checked="mixed"`).
 */
@Component({
  selector: 'app-select-all-checkbox',
  imports: [HlmCheckbox],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex' },
  template: `
    <hlm-checkbox
      [checked]="allSelected()"
      [indeterminate]="someSelected()"
      [disabled]="!hasRows()"
      [aria-label]="ariaLabel()"
      (checkedChange)="toggle($event)"
    />
  `,
})
export class SelectAllCheckbox {
  private readonly header = injectTableHeaderContext<SelectionFeatures, RowData, unknown>();

  readonly ariaLabel = input.required<string>();

  private readonly table = computed(() => this.header().table);
  protected readonly hasRows = computed(() => this.table().getRowModel().rows.length > 0);
  protected readonly allSelected = computed(() => this.table().getIsAllPageRowsSelected());
  protected readonly someSelected = computed(
    () => !this.allSelected() && this.table().getIsSomePageRowsSelected(),
  );

  protected toggle(checked: boolean): void {
    this.table().toggleAllPageRowsSelected(checked);
  }
}
