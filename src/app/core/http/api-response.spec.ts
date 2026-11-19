import { ApiError, unwrapApiResponse } from './api-response';

describe('unwrapApiResponse', () => {
  it('devuelve `resultado` de la envoltura estándar', () => {
    expect(
      unwrapApiResponse({
        codigoEstado: 200,
        respuestaEstado: true,
        mensaje: null,
        errores: [],
        mensajeError: null,
        resultado: { data: [1] },
      }),
    ).toEqual({ data: [1] });
  });

  it('acepta respuestas sin envoltura (así las declara el swagger en algunos endpoints)', () => {
    expect(unwrapApiResponse({ data: [1] })).toEqual({ data: [1] });
  });

  it('lanza ApiError con el mensaje del back si `respuestaEstado` es false', () => {
    expect(() =>
      unwrapApiResponse({
        codigoEstado: 404,
        respuestaEstado: false,
        mensaje: null,
        errores: null as unknown as string[],
        mensajeError: 'No existe la regla.',
        resultado: null,
      }),
    ).toThrow(new ApiError('No existe la regla.', 404, []));
  });
});
