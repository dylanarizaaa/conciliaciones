import { safeFileName } from './save-file';

describe('safeFileName', () => {
  it('quita tildes, espacios y caracteres no admitidos', () => {
    expect(safeFileName('diferencias-Cambio de estado logístico.csv')).toBe(
      'diferencias-cambio-de-estado-logistico.csv',
    );
    expect(safeFileName('Reporte: Pago/en "Casa"?.CSV')).toBe('reporte-pago-en-casa.csv');
  });

  it('usa el nombre de respaldo si no queda nada utilizable', () => {
    expect(safeFileName('¿¿??.csv', 'descargar')).toBe('descargar.csv');
    expect(safeFileName('sin extensión')).toBe('sin-extension');
  });
});
