import { formatCurrency, formatInteger, formatLongDate, formatTime } from './formatters';

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
});
