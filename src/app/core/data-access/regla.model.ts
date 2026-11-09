/** Regla de conciliación de un canal con sus casos y monto afectado. */
export interface Regla {
  /** Nombre de la regla; también la identifica en la ruta de detalle. */
  readonly nombre: string;
  readonly casos: number;
  readonly monto: number;
}

/** Página de reglas tal como la devuelve el backend. */
export interface ReglasPagina {
  readonly casosTotales: number;
  readonly montoAfectado: number;
  readonly pageNumber: number;
  readonly pageSize: number;
  readonly totalPages: number;
  readonly data: readonly Regla[];
}

export interface ReglasResultado {
  readonly data: ReglasPagina;
}

/** Página de reglas junto con la hora de la consulta ("Última actualización"). */
export type ReglasConsulta = ReglasPagina & { readonly consultadoEn: Date };

/**
 * Respuesta de "Resolver diferencias" (`resultado`). `validadoPor` y `fechaValidacion` se muestran
 * en el modal "Conciliación procesada".
 */
export interface ResolucionDiferencias {
  /** Casos resueltos: salen de la lista. */
  readonly procesados: number;
  /** Casos que requieren una nueva validación: siguen en estado Pendiente. */
  readonly pendientes: number;
  readonly validadoPor: string;
  /** ISO 8601 (fecha, o fecha y hora con zona). */
  readonly fechaValidacion: string;
}
