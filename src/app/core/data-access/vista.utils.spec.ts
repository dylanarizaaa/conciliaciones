import { ApiError } from '../http/api-response';
import type { ViewTemplate } from './vista.model';
import {
  assertSupportedTemplate,
  findTableBlock,
  getPath,
  interpolateRow,
  isEmptyValue,
  layoutBlocks,
  leafColumnsOf,
  parseSorting,
  resolveApiPath,
  resolveQuery,
  serializeSorting,
  toTablePage,
} from './vista.utils';

const row = {
  idCaso: 'CASO-1',
  cliente: { nombre: 'Ana Pérez', documento: null },
};

function template(overrides: Partial<ViewTemplate> = {}): ViewTemplate {
  return {
    schemaVersion: '1.0.0',
    id: 'vista',
    layout: { type: 'stack', items: [{ blockId: 'b' }] },
    blocks: [
      { id: 'a', type: 'table', dataSource: { path: '/a' }, table: { rowId: 'id', columns: [] } },
      { id: 'b', type: 'table', dataSource: { path: '/b' }, table: { rowId: 'id', columns: [] } },
    ],
    ...overrides,
  };
}

describe('vista.utils', () => {
  it('lee campos con ruta de punto', () => {
    expect(getPath(row, 'cliente.nombre')).toBe('Ana Pérez');
    expect(getPath(row, 'cliente.documento')).toBeNull();
    expect(getPath(row, 'cliente.nombre.largo')).toBeUndefined();
    expect(getPath(row, 'noExiste.campo')).toBeUndefined();
  });

  it('interpola {campo} con los datos de la fila (vacío si no hay dato)', () => {
    expect(interpolateRow('Ver detalle de {cliente.nombre}', row)).toBe('Ver detalle de Ana Pérez');
    expect(interpolateRow('Doc: {cliente.documento}', row)).toBe('Doc: ');
  });

  it('resuelve las rutas del contrato codificando cada parámetro', () => {
    expect(
      resolveApiPath('/subprocesos/{subProcesoId}/reglas/{regla}/casos', {
        subProcesoId: 's1',
        regla: 'Cambio de estado logístico',
      }),
    ).toBe('/subprocesos/s1/reglas/Cambio%20de%20estado%20log%C3%ADstico/casos');
  });

  it('resuelve los parámetros de consulta de una fuente', () => {
    expect(
      resolveQuery({ reglaId: '{reglaId}', origen: 'detalle', clave: '{subProcesoId}-{reglaId}' }, {
        reglaId: 'r 1',
        subProcesoId: 's1',
      }),
    ).toEqual({ reglaId: 'r 1', origen: 'detalle', clave: 's1-r 1' });
    expect(resolveQuery(undefined, {})).toEqual({});
    expect(() => resolveQuery({ x: '{otro}' }, {})).toThrow(ApiError);
  });

  it('normaliza la página del swagger (data, totalCount, casosTotales) y la del contrato', () => {
    expect(
      toTablePage({
        casosTotales: 10,
        montoAfectado: 500,
        totalCount: 10,
        totalPages: 1,
        pageNumber: 1,
        pageSize: 10,
        data: [{ id: 1 }],
      }),
    ).toEqual({
      pageNumber: 1,
      pageSize: 10,
      totalRows: 10,
      totalPages: 1,
      summary: { casosTotales: 10, montoAfectado: 500 },
      rows: [{ id: 1 }],
    });
    expect(
      toTablePage({ pageNumber: 2, pageSize: 5, totalRows: 6, totalPages: 2, rows: [{ id: 2 }] }),
    ).toEqual({ pageNumber: 2, pageSize: 5, totalRows: 6, totalPages: 2, rows: [{ id: 2 }] });
    // Sin paginación ni totales: una sola página con lo que llegó.
    expect(toTablePage({ data: [{ id: 1 }, { id: 2 }] })).toEqual({
      pageNumber: 1,
      pageSize: 2,
      totalRows: 2,
      totalPages: 1,
      rows: [{ id: 1 }, { id: 2 }],
    });
    expect(toTablePage(null)).toEqual({ pageNumber: 1, pageSize: 0, totalRows: 0, totalPages: 0, rows: [] });
  });

  it('rechaza rutas con parámetros desconocidos', () => {
    expect(() => resolveApiPath('/reglas/{otro}', { regla: 'x' })).toThrow(ApiError);
  });

  it('serializa y lee el orden en formato campo:dirección', () => {
    expect(serializeSorting([{ id: 'monto', desc: true }, { id: 'nombre', desc: false }])).toEqual([
      'monto:desc',
      'nombre:asc',
    ]);
    expect(parseSorting('monto:desc,nombre:asc')).toEqual([
      { id: 'monto', desc: true },
      { id: 'nombre', desc: false },
    ]);
    expect(parseSorting('monto:arriba,:asc,nombre')).toEqual([]);
    expect(parseSorting(undefined)).toEqual([]);
  });

  it('acepta plantillas de la versión mayor 1 con al menos un bloque', () => {
    const plantilla = template({ schemaVersion: '1.4.2' });
    expect(assertSupportedTemplate(plantilla)).toBe(plantilla);
    expect(assertSupportedTemplate(plantilla, 'table')).toBe(plantilla);
  });

  it('sin `schemaVersion` asume la versión 1 (así responde hoy el back)', () => {
    const { schemaVersion: _, id: __, ...sinVersion } = template();
    expect(assertSupportedTemplate(sinVersion as ViewTemplate)).toBe(sinVersion);
    expect(() => assertSupportedTemplate(null as unknown as ViewTemplate)).toThrow(ApiError);
  });

  it('rechaza versiones mayores desconocidas o plantillas sin bloques', () => {
    expect(() => assertSupportedTemplate(template({ schemaVersion: '2.0.0' }))).toThrow(
      'La plantilla usa la versión 2.0.0 del contrato.',
    );
    expect(() => assertSupportedTemplate(template({ blocks: [] }))).toThrow(ApiError);
  });

  it('exige una tabla solo a las pantallas que la necesitan', () => {
    const sinTabla = template({
      blocks: [{ id: 'p', type: 'tabs', tabs: { items: [{ id: 't', title: 'T', blockId: 'x' }] } }],
    });
    expect(assertSupportedTemplate(sinTabla)).toBe(sinTabla);
    expect(() => assertSupportedTemplate(sinTabla, 'table')).toThrow(
      'La plantilla no trae ninguna tabla para mostrar.',
    );
  });

  it('devuelve los bloques del layout en orden, sin los que no existen', () => {
    const plantilla = template({
      layout: { type: 'stack', items: [{ blockId: 'b' }, { blockId: 'zz' }, { blockId: 'a' }] },
    });
    expect(layoutBlocks(plantilla).map((block) => block.id)).toEqual(['b', 'a']);
  });

  it('reconoce los valores sin dato', () => {
    expect([null, undefined, '', '  '].every(isEmptyValue)).toBe(true);
    expect([0, false, 'x', {}].some(isEmptyValue)).toBe(false);
  });

  it('elige el bloque de tabla en el orden del layout o por id', () => {
    expect(findTableBlock(template())?.id).toBe('b');
    expect(findTableBlock(template(), 'a')?.id).toBe('a');
    expect(findTableBlock(template(), 'zz')).toBeUndefined();
  });

  it('recorre los grupos para obtener las columnas hoja en orden', () => {
    const leaves = leafColumnsOf([
      { id: 'a', accessorKey: 'a', header: 'A' },
      {
        id: 'g',
        header: 'Grupo',
        columns: [
          { id: 'b', accessorKey: 'b', header: 'B' },
          { id: 'c', accessorKey: 'c', header: 'C' },
        ],
      },
    ]);
    expect(leaves.map((column) => column.id)).toEqual(['a', 'b', 'c']);
  });
});
