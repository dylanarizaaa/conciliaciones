import type { InputSignal, InputSignalWithTransform, Type } from '@angular/core';
import type {
  NumberCellInputs,
  ValueCellRef,
  ViewRecord,
} from '../../../../core/data-access/vista.model';
import { getPath } from '../../../../core/data-access/vista.utils';
import { BadgeCell } from './badge-cell';
import { BooleanCell } from './boolean-cell';
import { DateCell } from './date-cell';
import { CurrencyCell, NumberCell, PercentCell } from './number-cells';
import { TextCell } from './text-cell';

/** Componente del catálogo listo para pintar: sirve con `flexRenderComponent` y `NgComponentOutlet`. */
export interface ValueCellView {
  readonly component: Type<unknown>;
  readonly inputs: Record<string, unknown>;
}

/** Recibe el valor del campo y el registro (fila) completo. */
export type ValueCellResolver = (value: unknown, record: ViewRecord) => ValueCellView;

export interface ValueCellOptions {
  /**
   * El texto largo baja de línea en lugar de cortarse (listas de campos). En las tablas no se
   * usa: las celdas son de una sola línea.
   */
  readonly wrap?: boolean;
}

type InputsOf<T> = {
  [K in keyof T as T[K] extends InputSignalWithTransform<unknown, never> ? K : never]?: T[K] extends InputSignal<
    infer R
  >
    ? R
    : never;
};

function view<T>(component: Type<T>, inputs: InputsOf<T>): ValueCellView {
  return { component, inputs };
}

/**
 * Traduce un `{ component, inputs }` de la plantilla al componente del catálogo que muestra un
 * valor. El JSON no trae funciones: el catálogo es cerrado y un componente desconocido se pinta
 * como `TextCell`.
 */
export function valueCellResolver(
  cell: ValueCellRef = { component: 'TextCell' },
  options: ValueCellOptions = {},
): ValueCellResolver {
  switch (cell.component) {
    case 'TextCell': {
      const inputs = cell.inputs ?? {};
      const truncate = inputs.truncate ?? false;
      return (value, record) =>
        view(TextCell, {
          value,
          emphasis: inputs.emphasis ?? 'default',
          truncate,
          wrap: (options.wrap ?? false) && !truncate,
          secondary: inputs.secondaryAccessorKey
            ? getPath(record, inputs.secondaryAccessorKey)
            : null,
        });
    }
    case 'NumberCell': {
      const inputs = cell.inputs ?? {};
      return (value) => view(NumberCell, numericInputs(value, inputs));
    }
    case 'PercentCell': {
      const inputs = cell.inputs ?? {};
      return (value) => view(PercentCell, numericInputs(value, inputs));
    }
    case 'CurrencyCell': {
      const inputs = cell.inputs ?? {};
      return (value, record) => {
        const fromRecord = inputs.currencyField ? getPath(record, inputs.currencyField) : undefined;
        return view(CurrencyCell, {
          ...numericInputs(value, inputs),
          currency:
            typeof fromRecord === 'string' && fromRecord ? fromRecord : (inputs.currency ?? 'COP'),
          signDisplay: inputs.signDisplay ?? 'auto',
        });
      };
    }
    case 'DateCell': {
      const inputs = cell.inputs ?? {};
      return (value) =>
        view(DateCell, {
          value,
          dateStyle: inputs.dateStyle,
          timeStyle: inputs.timeStyle,
          timeZone: inputs.timeZone,
        });
    }
    case 'BooleanCell': {
      const inputs = cell.inputs ?? {};
      return (value) =>
        view(BooleanCell, {
          value,
          trueLabel: inputs.trueLabel ?? 'Sí',
          falseLabel: inputs.falseLabel ?? 'No',
        });
    }
    case 'BadgeCell': {
      const { variants, fallback } = cell.inputs;
      return (value) => view(BadgeCell, { value, variants, fallback });
    }
    default:
      return unknownCell(cell, options);
  }
}

function numericInputs(value: unknown, inputs: NumberCellInputs) {
  return {
    value,
    emphasis: inputs.emphasis ?? 'default',
    minimumFractionDigits: inputs.minimumFractionDigits,
    maximumFractionDigits: inputs.maximumFractionDigits,
  } as const;
}

/** Degradación segura: un componente fuera del catálogo se pinta como texto. */
function unknownCell(cell: never, options: ValueCellOptions): ValueCellResolver {
  console.warn(
    `[vista paramétrica] Componente de celda desconocido "${(cell as { component?: unknown }).component}"; se usa TextCell.`,
  );
  return valueCellResolver({ component: 'TextCell' }, options);
}
