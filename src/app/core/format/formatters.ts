const LOCALE = 'es-CO';

const integerFormatter = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 0 });

const currencyFormatter = new Intl.NumberFormat(LOCALE, {
  style: 'currency',
  currency: 'COP',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const longDateFormatter = new Intl.DateTimeFormat(LOCALE, {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

const timeFormatter = new Intl.DateTimeFormat(LOCALE, {
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
});

/** 1250 → "1.250" */
export function formatInteger(value: number): string {
  return integerFormatter.format(value);
}

/** 13570000 → "$ 13.570.000" */
export function formatCurrency(value: number): string {
  return currencyFormatter.format(value);
}

/** 2026-08-17 → "17 de agosto 2026" */
export function formatLongDate(value: Date): string {
  const parts = longDateFormatter.formatToParts(value);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? '';
  return `${part('day')} de ${part('month')} ${part('year')}`;
}

/** 11:35 → "11:35 a.m." */
export function formatTime(value: Date): string {
  return timeFormatter
    .format(value)
    .replace(/[\s  ]+/g, ' ')
    .replace(/a\. ?m\./i, 'a.m.')
    .replace(/p\. ?m\./i, 'p.m.');
}
