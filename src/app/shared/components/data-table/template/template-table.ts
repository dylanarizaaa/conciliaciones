import {
  type CellContext,
  type ColumnDef,
  type ColumnPinningState,
  columnPinningFeature,
  columnSizingFeature,
  type ColumnVisibilityState,
  columnVisibilityFeature,
  createSortedRowModel,
  flexRenderComponent,
  rowSelectionFeature,
  rowSortingFeature,
  sortFn_alphanumeric,
  sortFn_basic,
  sortFn_datetime,
  sortFn_text,
  tableFeatures,
} from '@tanstack/angular-table';
import {
  type CellRef,
  type ColumnDefinition,
  type HeaderRef,
  isGroupColumn,
  type LeafColumnDefinition,
  type NumberCellInputs,
  type TableDefinition,
  type TableRow,
} from '../../../../core/data-access/vista.model';
import { getPath, interpolateRow, leafColumnsOf } from '../../../../core/data-access/vista.utils';
import { BadgeCell } from '../cells/badge-cell';
import { BooleanCell } from '../cells/boolean-cell';
import { DateCell } from '../cells/date-cell';
import { LinkCell } from '../cells/link-cell';
import { CurrencyCell, NumberCell, PercentCell } from '../cells/number-cells';
import { RowCheckbox, SelectAllCheckbox } from '../cells/selection-cells';
import { SortHeaderCell } from '../cells/sort-header-cell';
import { TextCell } from '../cells/text-cell';
import type { DataTableColumnMeta } from '../data-table.types';

/**
 * Features de toda tabla definida por plantilla. Son estables (constante de módulo), como pide
 * TanStack: el orden y los filtros del servidor se activan con `manualSorting`/`manualFiltering`.
 */
export const TEMPLATE_TABLE_FEATURES = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns: {
    alphanumeric: sortFn_alphanumeric,
    text: sortFn_text,
    basic: sortFn_basic,
    datetime: sortFn_datetime,
  },
  rowSelectionFeature,
  columnVisibilityFeature,
  columnPinningFeature,
  columnSizingFeature,
  columnMeta: {} as DataTableColumnMeta,
});

export type TemplateTableFeatures = typeof TEMPLATE_TABLE_FEATURES;
export type TemplateColumnDef = ColumnDef<TemplateTableFeatures, TableRow, unknown>;
type TemplateCellContext = CellContext<TemplateTableFeatures, TableRow, unknown>;

/** Ancho por defecto (px) de una columna sin `meta.width` numérico. */
export const DEFAULT_COLUMN_SIZE = 160;

/** Celdas que no leen un campo: no tienen `accessorKey` y no se ordenan ni filtran. */
const DISPLAY_CELLS = new Set<string>(['LinkCell', 'RowCheckbox']);

/** Resultado de traducir la plantilla a TanStack Table. */
export interface TemplateTable {
  readonly columns: TemplateColumnDef[];
  /** Columnas fijas (`pin`), en el vocabulario lógico de v9: `start` / `end`. */
  readonly columnPinning: ColumnPinningState;
  /** Columnas ocultas al inicio (`hidden`). */
  readonly columnVisibility: ColumnVisibilityState;
  readonly getRowId: (row: TableRow, index: number) => string;
  /** La plantilla pide selección de filas. */
  readonly selectable: boolean;
}

/**
 * Traduce la definición de tabla de la plantilla a `ColumnDef[]` de TanStack Table v9.
 *
 * El JSON no trae funciones: cada `{ component, inputs }` se busca en un catálogo cerrado de
 * componentes (ver `cells/`). Un componente desconocido se pinta como `TextCell`.
 */
export function buildTemplateTable(definition: TableDefinition): TemplateTable {
  const leaves = leafColumnsOf(definition.columns);
  const pinned = (position: 'start' | 'end') =>
    leaves.filter((column) => column.pin === position).map((column) => column.id);
  return {
    columns: definition.columns.map(buildColumn),
    columnPinning: { start: pinned('start'), end: pinned('end') },
    columnVisibility: Object.fromEntries(
      leaves.filter((column) => column.hidden).map((column) => [column.id, false]),
    ),
    getRowId: (row, index) => {
      const id = getPath(row, definition.rowId);
      return id === null || id === undefined ? `fila-${index}` : String(id);
    },
    selectable: !!definition.selection,
  };
}

function buildColumn(column: ColumnDefinition): TemplateColumnDef {
  if (isGroupColumn(column)) {
    return {
      id: column.id,
      header: headerRenderer(column.header),
      columns: column.columns.map(buildColumn),
    };
  }
  const cell: CellRef = column.cell ?? { component: 'TextCell' };
  const accessorKey = column.accessorKey;
  const isDisplay = DISPLAY_CELLS.has(cell.component) || !accessorKey;
  const width = column.meta?.width;
  const definition: TemplateColumnDef = {
    id: column.id,
    header: headerRenderer(column.header),
    cell: cellRenderer(cell),
    size: typeof width === 'number' ? width : DEFAULT_COLUMN_SIZE,
    enableSorting: !isDisplay && column.enableSorting === true,
    enableHiding: column.enableHiding ?? true,
    sortUndefined: 'last',
    ...(column.sortType ? { sortFn: column.sortType } : {}),
    meta: columnMeta(column, cell),
  };
  return isDisplay || !accessorKey
    ? definition
    : { ...definition, accessorFn: (row: TableRow) => getPath(row, accessorKey) };
}

function columnMeta(column: LeafColumnDefinition, cell: CellRef): DataTableColumnMeta {
  const classes = [
    column.meta?.align === 'end' ? 'text-end' : column.meta?.align === 'center' ? 'text-center' : '',
    column.meta?.width === 'hug' ? 'w-px' : '',
  ].filter(Boolean);
  return {
    className: classes.length > 0 ? classes.join(' ') : undefined,
    kind: cell.component === 'RowCheckbox' ? 'selection' : undefined,
  };
}

function headerRenderer(header: HeaderRef): string | (() => unknown) {
  if (typeof header === 'string') {
    return header;
  }
  switch (header.component) {
    case 'SortIndicator':
      return () => flexRenderComponent(SortHeaderCell, { inputs: { label: header.inputs.label } });
    case 'SelectAllCheckbox':
      return () =>
        flexRenderComponent(SelectAllCheckbox, { inputs: { ariaLabel: header.inputs.ariaLabel } });
    default:
      return unknownHeader(header);
  }
}

function cellRenderer(cell: CellRef): (context: TemplateCellContext) => unknown {
  switch (cell.component) {
    case 'TextCell': {
      const inputs = cell.inputs ?? {};
      return (context) =>
        flexRenderComponent(TextCell, {
          inputs: {
            value: context.getValue(),
            emphasis: inputs.emphasis ?? 'default',
            truncate: inputs.truncate ?? false,
            secondary: inputs.secondaryAccessorKey
              ? getPath(context.row.original, inputs.secondaryAccessorKey)
              : null,
          },
        });
    }
    case 'NumberCell': {
      const inputs = cell.inputs ?? {};
      return (context) =>
        flexRenderComponent(NumberCell, { inputs: numericInputs(context, inputs) });
    }
    case 'PercentCell': {
      const inputs = cell.inputs ?? {};
      return (context) =>
        flexRenderComponent(PercentCell, { inputs: numericInputs(context, inputs) });
    }
    case 'CurrencyCell': {
      const inputs = cell.inputs ?? {};
      return (context) => {
        const fromRow = inputs.currencyField
          ? getPath(context.row.original, inputs.currencyField)
          : undefined;
        return flexRenderComponent(CurrencyCell, {
          inputs: {
            value: context.getValue(),
            emphasis: inputs.emphasis ?? 'default',
            currency: typeof fromRow === 'string' && fromRow ? fromRow : (inputs.currency ?? 'COP'),
            signDisplay: inputs.signDisplay ?? 'auto',
            minimumFractionDigits: inputs.minimumFractionDigits,
            maximumFractionDigits: inputs.maximumFractionDigits,
          },
        });
      };
    }
    case 'DateCell': {
      const inputs = cell.inputs ?? {};
      return (context) =>
        flexRenderComponent(DateCell, {
          inputs: {
            value: context.getValue(),
            dateStyle: inputs.dateStyle,
            timeStyle: inputs.timeStyle,
            timeZone: inputs.timeZone,
          },
        });
    }
    case 'BooleanCell': {
      const inputs = cell.inputs ?? {};
      return (context) =>
        flexRenderComponent(BooleanCell, {
          inputs: {
            value: context.getValue(),
            trueLabel: inputs.trueLabel ?? 'Sí',
            falseLabel: inputs.falseLabel ?? 'No',
          },
        });
    }
    case 'BadgeCell': {
      const { variants, fallback } = cell.inputs;
      return (context) =>
        flexRenderComponent(BadgeCell, {
          inputs: { value: context.getValue(), variants, fallback },
        });
    }
    case 'LinkCell': {
      const { label, ariaLabel, route, visibleWhen } = cell.inputs;
      return (context) => {
        const row = context.row.original;
        if (visibleWhen && getPath(row, visibleWhen.field) !== visibleWhen.equals) {
          return null;
        }
        return flexRenderComponent(LinkCell, {
          inputs: {
            label,
            link: route.map((segment) => interpolateRow(segment, row)),
            ariaLabel: interpolateRow(ariaLabel, row),
          },
        });
      };
    }
    case 'RowCheckbox': {
      const { ariaLabel } = cell.inputs;
      return (context) =>
        flexRenderComponent(RowCheckbox, {
          inputs: { ariaLabel: interpolateRow(ariaLabel, context.row.original) },
        });
    }
    default:
      return unknownCell(cell);
  }
}

function numericInputs(context: TemplateCellContext, inputs: NumberCellInputs) {
  return {
    value: context.getValue(),
    emphasis: inputs.emphasis ?? 'default',
    minimumFractionDigits: inputs.minimumFractionDigits,
    maximumFractionDigits: inputs.maximumFractionDigits,
  } as const;
}

/** Degradación segura: un componente fuera del catálogo se pinta como texto. */
function unknownCell(cell: never): (context: TemplateCellContext) => unknown {
  console.warn(
    `[tabla paramétrica] Componente de celda desconocido "${(cell as { component?: unknown }).component}"; se usa TextCell.`,
  );
  return cellRenderer({ component: 'TextCell' });
}

function unknownHeader(header: never): string {
  const ref = header as { component?: unknown; inputs?: { label?: unknown } };
  console.warn(`[tabla paramétrica] Encabezado desconocido "${ref.component}"; se muestra como texto.`);
  return typeof ref.inputs?.label === 'string' ? ref.inputs.label : '';
}
