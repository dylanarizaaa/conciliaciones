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
  return normalizeMeridiem(timeFormatter.format(value));
}

/** "5:00 p. m." (con los espacios no separables de Intl) → "5:00 p.m." como en el diseño. */
function normalizeMeridiem(value: string): string {
  return value
    .replace(/[\s  ]+/g, ' ')
    .replace(/a\. ?m\./i, 'a.m.')
    .replace(/p\. ?m\./i, 'p.m.');
}

// --- Formatos configurables (celdas de la tabla paramétrica) ---------------------------------

const cache = new Map<string, Intl.NumberFormat | Intl.DateTimeFormat>();

function numberFormatter(options: Intl.NumberFormatOptions): Intl.NumberFormat {
  const key = `n${JSON.stringify(options)}`;
  let formatter = cache.get(key) as Intl.NumberFormat | undefined;
  if (!formatter) {
    formatter = new Intl.NumberFormat(LOCALE, options);
    cache.set(key, formatter);
  }
  return formatter;
}

function dateFormatter(options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = `d${JSON.stringify(options)}`;
  let formatter = cache.get(key) as Intl.DateTimeFormat | undefined;
  if (!formatter) {
    try {
      formatter = new Intl.DateTimeFormat(LOCALE, options);
    } catch {
      // Zona horaria inválida: se usa la del navegador.
      formatter = new Intl.DateTimeFormat(LOCALE, { ...options, timeZone: undefined });
    }
    cache.set(key, formatter);
  }
  return formatter;
}

export interface FractionOptions {
  readonly minimumFractionDigits?: number;
  readonly maximumFractionDigits?: number;
}

/** Intl lanza error si el máximo es menor que el mínimo: se ajusta. */
function fractions(options: FractionOptions, defaultMax: number): Intl.NumberFormatOptions {
  const minimumFractionDigits = options.minimumFractionDigits ?? 0;
  const maximumFractionDigits = Math.max(
    minimumFractionDigits,
    options.maximumFractionDigits ?? defaultMax,
  );
  return { minimumFractionDigits, maximumFractionDigits };
}

/** 1250.5 → "1.250,5" */
export function formatNumber(value: number, options: FractionOptions = {}): string {
  return numberFormatter(fractions(options, 2)).format(value);
}

export interface MoneyOptions extends FractionOptions {
  /** ISO 4217; por defecto COP (sin decimales). */
  readonly currency?: string;
  readonly signDisplay?: 'auto' | 'always' | 'exceptZero' | 'never';
}

/** 900000 → "$ 900.000"; -50000 con `signDisplay: 'exceptZero'` → "-$ 50.000". */
export function formatMoney(value: number, options: MoneyOptions = {}): string {
  const currency = options.currency ?? 'COP';
  const custom =
    options.minimumFractionDigits !== undefined || options.maximumFractionDigits !== undefined;
  return numberFormatter({
    style: 'currency',
    currency,
    signDisplay: options.signDisplay ?? 'auto',
    // Sin decimales pedidos: COP sin decimales (como el resto de la app); otras monedas, los suyos.
    ...(custom ? fractions(options, 2) : currency === 'COP' ? fractions({}, 0) : {}),
  }).format(value);
}

/** 0.256 → "25,6%" (el valor llega como fracción). */
export function formatPercent(value: number, options: FractionOptions = {}): string {
  return numberFormatter({ style: 'percent', ...fractions(options, 1) }).format(value);
}

export interface DateTimeOptions {
  readonly dateStyle?: 'short' | 'medium' | 'long';
  readonly timeStyle?: 'short' | 'medium';
  /** Zona IANA (p. ej. `America/Bogota`); si falta, la del navegador. */
  readonly timeZone?: string;
}

const DATE_PARTS: Record<NonNullable<DateTimeOptions['dateStyle']>, Intl.DateTimeFormatOptions> = {
  short: { day: '2-digit', month: '2-digit', year: '2-digit' },
  medium: { day: 'numeric', month: 'short', year: 'numeric' },
  long: { day: 'numeric', month: 'long', year: 'numeric' },
};

const TIME_PARTS: Record<NonNullable<DateTimeOptions['timeStyle']>, Intl.DateTimeFormatOptions> = {
  short: { hour: 'numeric', minute: '2-digit', hour12: true },
  medium: { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true },
};

/**
 * Fecha y hora con el estilo del diseño: `short` + `short` → "19/04/26 5:00 p.m.";
 * `long` → "19 de abril 2026". Sin estilos se muestra la fecha corta.
 */
export function formatDateTime(value: Date, options: DateTimeOptions = {}): string {
  const zone: Intl.DateTimeFormatOptions = options.timeZone ? { timeZone: options.timeZone } : {};
  const dateStyle = options.dateStyle ?? (options.timeStyle ? undefined : 'short');
  const parts: string[] = [];
  if (dateStyle === 'long') {
    const pieces = dateFormatter({ ...DATE_PARTS.long, ...zone }).formatToParts(value);
    const piece = (type: Intl.DateTimeFormatPartTypes) =>
      pieces.find((item) => item.type === type)?.value ?? '';
    parts.push(`${piece('day')} de ${piece('month')} ${piece('year')}`);
  } else if (dateStyle) {
    parts.push(dateFormatter({ ...DATE_PARTS[dateStyle], ...zone }).format(value));
  }
  if (options.timeStyle) {
    parts.push(normalizeMeridiem(dateFormatter({ ...TIME_PARTS[options.timeStyle], ...zone }).format(value)));
  }
  return parts.join(' ');
}
