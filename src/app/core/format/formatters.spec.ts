import {
  formatCurrency,
  formatDateTime,
  formatInteger,
  formatLongDate,
  formatMoney,
  formatNumber,
  formatPercent,
  formatTime,
  toDate,
} from './formatters';

/** Normaliza los espacios no separables que usa Intl para comparar con texto plano. */
const plain = (value: string) => value.replace(/[  ]/g, ' ');

describe('formatters', () => {
  it('formatea enteros con separador de miles', () => {
    expect(formatInteger(1250)).toBe('1.250');
  });

  it('formatea pesos colombianos sin decimales', () => {
    expect(plain(formatCurrency(13570000))).toBe('$ 13.570.000');
  });

  it('formatea la fecha como "17 de agosto 2026"', () => {
    expect(formatLongDate(new Date(2026, 7, 17, 11, 35))).toBe('17 de agosto 2026');
  });

  it('formatea la hora como "11:35 a.m." / "3:05 p.m."', () => {
    expect(formatTime(new Date(2026, 7, 17, 11, 35))).toBe('11:35 a.m.');
    expect(formatTime(new Date(2026, 7, 17, 15, 5))).toBe('3:05 p.m.');
  });

  describe('formatos de la tabla paramétrica', () => {
    const transaccion = new Date('2026-04-19T17:00:00-05:00');

    it('formatea fecha y hora cortas en la zona del negocio: "19/04/26 5:00 p.m."', () => {
      expect(
        formatDateTime(transaccion, { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Bogota' }),
      ).toBe('19/04/26 5:00 p.m.');
    });

    it('formatea la fecha media, la larga y la hora con segundos', () => {
      const options = { timeZone: 'America/Bogota' } as const;
      expect(formatDateTime(transaccion, { ...options, dateStyle: 'medium' })).toBe('19/04/2026');
      expect(formatDateTime(transaccion, { ...options, dateStyle: 'long' })).toBe('19 de abril 2026');
      expect(formatDateTime(transaccion, { ...options, timeStyle: 'medium' })).toBe('5:00:00 p.m.');
    });

    it('usa la fecha corta si no se pide estilo y la zona del navegador si la zona es inválida', () => {
      const local = new Date(2026, 3, 19, 17, 0);
      expect(formatDateTime(local)).toBe('19/04/26');
      expect(formatDateTime(local, { timeStyle: 'short', timeZone: 'Zona/Inventada' })).toBe('5:00 p.m.');
    });

    it('lee fechas del back; una fecha sin hora es local (no se corre al día anterior)', () => {
      expect(toDate('2026-08-19')).toEqual(new Date(2026, 7, 19));
      expect(toDate('2026-04-19T17:00:00-05:00')?.toISOString()).toBe('2026-04-19T22:00:00.000Z');
      expect(toDate('no es fecha')).toBeNull();
      expect(toDate(null)).toBeNull();
    });

    it('formatea montos con moneda, signo y decimales', () => {
      expect(plain(formatMoney(900000))).toBe('$ 900.000');
      expect(plain(formatMoney(-50000, { signDisplay: 'exceptZero' }))).toBe('-$ 50.000');
      expect(plain(formatMoney(12.5, { currency: 'USD' }))).toBe('US$ 12,50');
      expect(plain(formatMoney(12.5, { currency: 'USD', maximumFractionDigits: 0 }))).toBe('US$ 13');
    });

    it('formatea números y porcentajes aunque el máximo de decimales sea menor que el mínimo', () => {
      expect(formatNumber(1250.456)).toBe('1.250,46');
      expect(formatNumber(3, { minimumFractionDigits: 2, maximumFractionDigits: 0 })).toBe('3,00');
      expect(plain(formatPercent(0.256))).toBe('25,6%');
    });
  });
});
