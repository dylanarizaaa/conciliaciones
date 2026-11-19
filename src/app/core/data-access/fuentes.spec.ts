import { humanizeId, tituloFuente } from './fuentes';

describe('títulos de las fuentes', () => {
  it('usa el título de la plantilla cuando es un texto para el usuario', () => {
    expect(tituloFuente('fuenteApp', 'Recargas APP')).toBe('Recargas APP');
  });

  it('si el título es el mismo id técnico (o falta), usa el nombre asociado en el front', () => {
    expect(tituloFuente('fuentePrepagoMovimiento', 'fuentePrepagoMovimiento')).toBe('Prepago · Movimiento');
    expect(tituloFuente('FUENTECONTROLLERADMISION')).toBe('Controller · Admisión');
  });

  it('una fuente sin nombre asociado se muestra a partir de su id', () => {
    expect(tituloFuente('fuenteNuevaConciliacionBanco', 'fuenteNuevaConciliacionBanco')).toBe(
      'Nueva conciliacion banco',
    );
    expect(tituloFuente('Recargas Pago en Casa')).toBe('Recargas Pago en Casa');
    expect(humanizeId('detalle_cuenta-banco')).toBe('Detalle cuenta banco');
    expect(humanizeId('fuente')).toBe('Fuente');
  });
});
