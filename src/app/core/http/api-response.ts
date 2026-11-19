/** Envoltura estándar de las respuestas del backend. */
export interface ApiResponse<T> {
  readonly codigoEstado: number;
  readonly respuestaEstado: boolean;
  readonly mensaje: string | null;
  readonly errores: readonly string[];
  readonly mensajeError: string | null;
  readonly resultado: T;
}

/** Error de negocio devuelto por el backend con `respuestaEstado: false`. */
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly codigoEstado: number,
    public readonly errores: readonly string[],
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** La respuesta trae la envoltura estándar (`respuestaEstado`, `resultado`, ...). */
export function isApiResponse<T>(response: unknown): response is ApiResponse<T> {
  return (
    typeof response === 'object' &&
    response !== null &&
    typeof (response as { respuestaEstado?: unknown }).respuestaEstado === 'boolean'
  );
}

/**
 * Devuelve `resultado` o lanza `ApiError` si el backend reporta un fallo.
 *
 * El swagger declara algunos endpoints (`proyectos`, `procesos`, `subprocesos`) sin la envoltura:
 * si la respuesta no la trae, se toma tal cual como resultado.
 */
export function unwrapApiResponse<T>(response: ApiResponse<T> | T): T {
  if (!isApiResponse<T>(response)) {
    return response as T;
  }
  if (!response.respuestaEstado) {
    throw new ApiError(
      response.mensajeError ?? response.mensaje ?? 'La solicitud no pudo completarse.',
      response.codigoEstado,
      response.errores ?? [],
    );
  }
  return response.resultado;
}
