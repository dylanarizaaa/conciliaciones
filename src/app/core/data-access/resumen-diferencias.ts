import { type ApiResponse, unwrapApiResponse } from '../http/api-response';

/** Estructura común de los endpoints que agrupan diferencias (procesos, subprocesos, ...). */
export interface ResumenDiferencias<T> {
  readonly totalAfectado: number;
  readonly casosTotales: number;
  readonly data: readonly T[];
}

/** Resumen junto con el momento en que se recibió (no lo envía el backend). */
export type ResumenConsulta<T> = ResumenDiferencias<T> & {
  /** Hora de la consulta; se muestra como "Última actualización". */
  readonly consultadoEn: Date;
};

/** Desenvuelve la respuesta, normaliza `data` y marca la hora de la consulta. */
export function toResumenConsulta<T>(
  response: ApiResponse<ResumenDiferencias<T>>,
): ResumenConsulta<T> {
  const resultado = unwrapApiResponse(response);
  return { ...resultado, data: resultado.data ?? [], consultadoEn: new Date() };
}
