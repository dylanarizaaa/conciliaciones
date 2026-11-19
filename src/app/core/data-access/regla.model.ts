/** Regla de conciliación de un canal con sus casos y monto afectado (`FailedRuleDto`). */
export interface Regla {
  /** Identifica la regla en las rutas del front y en los endpoints (`reglaId`). */
  readonly idRegla: string;
  readonly nombreRegla: string;
  readonly casos: number;
  readonly monto: number;
}

/** Página de reglas de un canal (`GetReglasFallidasBySubprocesoResponse`). */
export interface ReglasPagina {
  readonly casosTotales: number;
  readonly montoAfectado: number;
  readonly pageNumber: number;
  readonly pageSize: number;
  readonly totalPages: number;
  readonly data: readonly Regla[];
}

/**
 * `resultado` del listado de reglas. El swagger devuelve la página directamente; versiones
 * anteriores del back la anidaban en `data`. El servicio acepta las dos formas.
 */
export type ReglasResultado = ReglasPagina | { readonly data: ReglasPagina };

/** Página de reglas junto con la hora de la consulta ("Última actualización"). */
export type ReglasConsulta = ReglasPagina & { readonly consultadoEn: Date };

/** Cuerpo de "Resolver diferencias" (`PUT /Conciliaciones/cambio-estado`). */
export interface CambioEstadoRequest {
  /** `rowId` de las filas seleccionadas (ids de conciliación). */
  readonly conciliacionId: readonly string[];
}

/** Respuesta de "Resolver diferencias" (`UpdateConciliacionEstadoResponse`). */
export interface ResolucionDiferencias {
  /** Conciliaciones que cambiaron de estado: salen de la lista al recargarla. */
  readonly actualizados: readonly string[];
  /** Ids que el back no encontró. */
  readonly noEncontrados: readonly string[];
  readonly totalProcesados: number;
  /**
   * No están en el swagger. El diseño del modal "Conciliación procesada" los muestra: si el back
   * los agrega, el front los usa sin cambios.
   */
  readonly validadoPor?: string | null;
  /** ISO 8601 (fecha, o fecha y hora con zona). */
  readonly fechaValidacion?: string | null;
}

/** Archivo de "Descargar reporte" (`ExcelDataReportsResponse`). */
export interface ReporteRespuesta {
  readonly archivoBase64: string | null;
  readonly nombreArchivo: string | null;
  readonly contentType: string | null;
}

/** Reporte listo para guardar. */
export interface Reporte {
  readonly blob: Blob;
  /** Nombre que sugiere el back; `null` si no lo envía. */
  readonly nombreArchivo: string | null;
}
