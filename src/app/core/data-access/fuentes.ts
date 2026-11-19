/**
 * Nombres visibles de las fuentes (aplicativos) de `fuentes-detalle`. La plantilla del back usa el
 * identificador técnico como título ("fuentePrepagoMovimiento"); el front lo asocia aquí con el
 * nombre que ve el usuario. Una fuente que no está en la lista se nombra a partir de su id.
 */
export const TITULOS_FUENTE: Readonly<Record<string, string>> = {
  fuentePrepagoMovimientoDetalle: 'Prepago · Detalle del movimiento',
  fuentePrepagoMovimiento: 'Prepago · Movimiento',
  fuentePrepagoDetalleCuenta: 'Prepago · Detalle de la cuenta',
  fuentePrepagoDetalleCliente: 'Prepago · Detalle del cliente',
  fuenteControllerAdmision: 'Controller · Admisión',
  fuenteControllerGuiaFormaPago: 'Controller · Forma de pago de la guía',
  fuenteControllerFormasPago: 'Controller · Formas de pago',
};

const normalize = (value: string) => value.trim().toLowerCase();

const TITULOS = new Map(Object.entries(TITULOS_FUENTE).map(([id, titulo]) => [normalize(id), titulo]));

/** "fuenteControllerGuiaFormaPago" → "Controller guia forma pago". */
export function humanizeId(id: string): string {
  const words = id
    .trim()
    .replace(/^fuente(?=[A-Z_\-\s])/, '')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_\-\s]+/g, ' ')
    .trim()
    .toLowerCase();
  return words ? words[0].toUpperCase() + words.slice(1) : id;
}

/**
 * Título de un acordeón: el de la plantilla si es un texto para el usuario; si falta o es el mismo
 * id técnico, el nombre asociado en el front o, en último caso, el id legible.
 */
export function tituloFuente(id: string, title?: string | null): string {
  const propio = title?.trim();
  if (propio && normalize(propio) !== normalize(id)) {
    return propio;
  }
  // Un id con espacios ya es un nombre para el usuario ("Recargas APP"): se deja como está.
  return TITULOS.get(normalize(id)) ?? (/\s/.test(id.trim()) ? id.trim() : humanizeId(id));
}
