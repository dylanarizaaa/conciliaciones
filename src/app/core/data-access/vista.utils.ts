import { ApiError } from '../http/api-response';
import {
  type ColumnDefinition,
  type ColumnSortDefinition,
  isGroupColumn,
  type LeafColumnDefinition,
  type QueryParams,
  type RegistrosPagina,
  type TableBlock,
  type TablePage,
  type TableRow,
  type ViewBlock,
  type ViewTemplate,
} from './vista.model';

/** Versión mayor del contrato que entiende este front. */
export const SUPPORTED_SCHEMA_MAJOR = 1;

const PLACEHOLDER = /\{([^{}]+)\}/g;

/** Lee un campo de la fila; admite rutas con punto (`cliente.nombre`). */
export function getPath(row: unknown, path: string): unknown {
  let current: unknown = row;
  for (const key of path.split('.')) {
    if (current === null || typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

/** Reemplaza `{campo}` por los valores de la fila: "Ver detalle de {cliente.nombre}". */
export function interpolateRow(template: string, row: TableRow): string {
  return template.replace(PLACEHOLDER, (_, path: string) => {
    const value = getPath(row, path.trim());
    return value === null || value === undefined ? '' : String(value);
  });
}

/**
 * Resuelve una ruta del contrato (`/Conciliaciones/subprocesos/{subProcesoId}/casos`) con los
 * parámetros de la ruta del front. Cada valor se codifica para la URL.
 */
export function resolveApiPath(path: string, params: Readonly<Record<string, string>>): string {
  return path.replace(PLACEHOLDER, (_, name: string) => {
    const value = params[name.trim()];
    if (value === undefined) {
      throw new ApiError(`La plantilla usa el parámetro desconocido "{${name}}".`, 0, []);
    }
    return encodeURIComponent(value);
  });
}

/**
 * Resuelve los parámetros de consulta de una fuente (`{ "reglaId": "{reglaId}" }`) con los
 * parámetros de la ruta del front. El `HttpClient` los codifica al armar la URL.
 */
export function resolveQuery(
  query: QueryParams | undefined,
  params: Readonly<Record<string, string>>,
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(query ?? {}).map(([name, value]) => [
      name,
      value.replace(PLACEHOLDER, (_, param: string) => {
        const resolved = params[param.trim()];
        if (resolved === undefined) {
          throw new ApiError(`La plantilla usa el parámetro desconocido "{${param}}".`, 0, []);
        }
        return resolved;
      }),
    ]),
  );
}

/**
 * Página de una tabla a partir de la respuesta del back. Acepta la forma del swagger
 * (`data`, `totalCount`, `casosTotales`, `montoAfectado`) y la del contrato (`rows`, `totalRows`,
 * `summary`).
 */
export function toTablePage(resultado: unknown): TablePage {
  const page = (resultado ?? {}) as Partial<TablePage> & RegistrosPagina;
  const rows = page.rows ?? page.data ?? [];
  const summary =
    page.summary ??
    (typeof page.casosTotales === 'number'
      ? { casosTotales: page.casosTotales, montoAfectado: page.montoAfectado ?? 0 }
      : undefined);
  return {
    pageNumber: page.pageNumber ?? 1,
    pageSize: page.pageSize ?? rows.length,
    totalRows: page.totalRows ?? page.totalCount ?? rows.length,
    totalPages: page.totalPages ?? (rows.length > 0 ? 1 : 0),
    ...(page.sort ? { sort: page.sort } : {}),
    ...(page.filters ? { filters: page.filters } : {}),
    ...(summary ? { summary } : {}),
    rows,
  };
}

/** `[{ id: 'monto', desc: true }]` → `['monto:desc']` (formato del parámetro `sort`). */
export function serializeSorting(sorting: readonly ColumnSortDefinition[]): string[] {
  return sorting.map(({ id, desc }) => `${id}:${desc ? 'desc' : 'asc'}`);
}

/** Lee `campo:asc,otro:desc`; ignora las partes mal formadas. */
export function parseSorting(value: string | null | undefined): ColumnSortDefinition[] {
  if (!value) {
    return [];
  }
  return value
    .split(',')
    .map((part) => part.trim().split(':'))
    .filter(([id, direction]) => !!id && (direction === 'asc' || direction === 'desc'))
    .map(([id, direction]) => ({ id, desc: direction === 'desc' }));
}

/**
 * Comprueba que la plantilla sea de una versión que el front entiende y que traiga bloques (o, si
 * se indica `requiredBlock`, al menos uno de ese tipo). Si no, lanza un `ApiError` para que la
 * pantalla muestre el estado de error.
 */
export function assertSupportedTemplate(
  template: ViewTemplate,
  requiredBlock?: ViewBlock['type'],
): ViewTemplate {
  if (!template || typeof template !== 'object') {
    throw new ApiError('La regla no tiene una plantilla configurada.', 0, []);
  }
  // Sin `schemaVersion` se asume la versión mayor que entiende el front.
  const major = template.schemaVersion
    ? Number.parseInt(template.schemaVersion.split('.')[0] ?? '', 10)
    : SUPPORTED_SCHEMA_MAJOR;
  if (major !== SUPPORTED_SCHEMA_MAJOR) {
    throw new ApiError(
      `La plantilla usa la versión ${template?.schemaVersion ?? 'desconocida'} del contrato.`,
      0,
      [],
    );
  }
  const blocks = Array.isArray(template.blocks) ? template.blocks : [];
  if (blocks.length === 0) {
    throw new ApiError('La plantilla no trae ningún bloque para mostrar.', 0, []);
  }
  if (requiredBlock === 'table' && !blocks.some((block) => block.type === 'table')) {
    throw new ApiError('La plantilla no trae ninguna tabla para mostrar.', 0, []);
  }
  return template;
}

/** Bloques de primer nivel en el orden del layout (sin los `blockId` que no existen). */
export function layoutBlocks(template: ViewTemplate): ViewBlock[] {
  const byId = new Map(template.blocks.map((block) => [block.id, block]));
  return (template.layout?.items ?? [])
    .map((item) => byId.get(item.blockId))
    .filter((block): block is ViewBlock => block !== undefined);
}

/** El valor cuenta como "sin dato": `null`, `undefined` o texto vacío. */
export function isEmptyValue(value: unknown): boolean {
  return value === null || value === undefined || (typeof value === 'string' && value.trim() === '');
}

/** Columnas hoja (las que pintan celdas) en orden, recorriendo los grupos. */
export function leafColumnsOf(columns: readonly ColumnDefinition[]): LeafColumnDefinition[] {
  return columns.flatMap((column) => (isGroupColumn(column) ? leafColumnsOf(column.columns) : [column]));
}

/** Primer bloque de tabla en el orden del layout (o el de `blockId`, si se indica). */
export function findTableBlock(template: ViewTemplate, blockId?: string): TableBlock | undefined {
  const tables = template.blocks.filter((block): block is TableBlock => block.type === 'table');
  if (blockId) {
    return tables.find((block) => block.id === blockId);
  }
  const ordered = template.layout?.items ?? [];
  for (const item of ordered) {
    const block = tables.find((candidate) => candidate.id === item.blockId);
    if (block) {
      return block;
    }
  }
  return tables[0];
}
