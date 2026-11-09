/**
 * Nombre de archivo seguro para descargas: sin tildes, espacios ni caracteres que los sistemas de
 * archivos no admiten. Chromium descarta el atributo `download` si el nombre trae caracteres no
 * ASCII (p. ej. "logístico") y guarda el archivo como "download".
 *
 * "diferencias-Cambio de estado logístico.csv" → "diferencias-cambio-de-estado-logistico.csv"
 */
export function safeFileName(name: string, fallback = 'archivo'): string {
  const slug = (value: string) =>
    value
      .normalize('NFD')
      .replace(/\p{M}+/gu, '')
      .replace(/[^A-Za-z0-9._-]+/g, '-')
      .replace(/-{2,}/g, '-')
      .replace(/^[-.]+|-+$/g, '')
      .toLowerCase();
  const dot = name.lastIndexOf('.');
  const base = slug(dot > 0 ? name.slice(0, dot) : name) || fallback;
  const extension = dot > 0 ? slug(name.slice(dot + 1)) : '';
  return extension ? `${base}.${extension}` : base;
}

/**
 * Entrega un archivo al usuario como descarga del navegador (p. ej. "Descargar reporte").
 * El enlace temporal no se agrega al árbol accesible y la URL se libera al terminar.
 */
export function saveFile(document: Document, blob: Blob, fileName: string): void {
  const view = document.defaultView;
  if (!view) {
    return;
  }
  const url = view.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.hidden = true;
  document.body.append(link);
  link.click();
  link.remove();
  // Se libera después de que el navegador empiece la descarga.
  view.setTimeout(() => view.URL.revokeObjectURL(url), 1000);
}
