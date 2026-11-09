export const environment = {
  /** URL base del microservicio de conciliaciones. */
  apiBaseUrl: 'http://localhost:5241/ms-conciliaciones/api/v1',
  /**
   * Atiende con JSON estáticos los endpoints que el back aún no publica (plantilla y datos de la
   * pantalla de regla, reporte y "Resolver diferencias"). El resto de endpoints usa el back real.
   * Ver `src/app/core/mock-backend`. Poner en `false` cuando el back los publique.
   */
  mockPendingEndpoints: true,
};
