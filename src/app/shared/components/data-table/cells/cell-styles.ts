import type { Emphasis, Tone } from '../../../../core/data-access/vista.model';

/** Énfasis del valor ("Casilla Info"): `lead` = Negro digital SemiBold, `highlight` = Acento. */
export const EMPHASIS_CLASS: Readonly<Record<Emphasis, string>> = {
  default: '',
  lead: 'font-semibold text-foreground',
  highlight: 'font-semibold text-acento',
};

/** Tono del badge ("Tabla estado"); los colores están en `styles.css` con contraste AA. */
export const TONE_CLASS: Readonly<Record<Tone, string>> = {
  neutral: 'bg-badge-neutral text-badge-neutral-foreground',
  info: 'bg-badge-info text-badge-info-foreground',
  success: 'bg-badge-success text-badge-success-foreground',
  warning: 'bg-badge-warning text-badge-warning-foreground',
  danger: 'bg-badge-danger text-badge-danger-foreground',
};

/** Número finito a partir de un valor del back (admite cadenas numéricas). */
export function toFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

/** Texto visible de un valor; `null`, `undefined` y cadenas vacías cuentan como "sin dato". */
export function toText(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  const text = String(value);
  return text.trim() === '' ? null : text;
}
