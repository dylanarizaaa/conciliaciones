/**
 * Metadatos de columna que entiende `app-data-table`. Se declaran en las features de la tabla:
 *
 * ```ts
 * const features = tableFeatures({ ..., columnMeta: {} as DataTableColumnMeta });
 * ```
 */
export interface DataTableColumnMeta {
  /** Clases extra para el `<th>` y los `<td>` de la columna (ancho, alineación). */
  readonly className?: string;
  /** Clases extra solo para los `<td>` (estilo del contenido, p. ej. `DATA_TABLE_CELL.lead`). */
  readonly cellClassName?: string;
}

/** Clases de columna habituales según el handoff ("Casilla Info_V2"). */
export const DATA_TABLE_CELL = {
  /** Estilo "Lead": texto principal de la fila. */
  lead: 'font-semibold text-foreground',
  /** Columna que se ajusta a su contenido (p. ej. "Acción"). */
  hug: 'w-px',
  /** Columnas de datos de igual ancho cuando hay tres ("Fill" en el handoff). */
  third: 'w-1/3',
} as const;
