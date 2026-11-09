import { ApiError } from '../http/api-response';
import type { ViewTemplate } from './vista.model';
import {
  assertSupportedTemplate,
  findTableBlock,
  getPath,
  interpolateRow,
  leafColumnsOf,
  parseSorting,
  resolveApiPath,
  serializeSorting,
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

  it('acepta plantillas de la versión mayor 1 con al menos una tabla', () => {
    const plantilla = template({ schemaVersion: '1.4.2' });
    expect(assertSupportedTemplate(plantilla)).toBe(plantilla);
  });

  it('rechaza versiones mayores desconocidas o plantillas sin tablas', () => {
    expect(() => assertSupportedTemplate(template({ schemaVersion: '2.0.0' }))).toThrow(
      'La plantilla usa la versión 2.0.0 del contrato.',
    );
    expect(() => assertSupportedTemplate(template({ blocks: [] }))).toThrow(ApiError);
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
