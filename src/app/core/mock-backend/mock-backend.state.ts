import { Injectable } from '@angular/core';
import type {
  LeafColumnDefinition,
  TablePage,
  TableRow,
  ViewTemplate,
} from '../data-access/vista.model';
import { findTableBlock, leafColumnsOf } from '../data-access/vista.utils';
import datosJson from './fixtures/regla-diferencias.datos.json';
import plantillaJson from './fixtures/regla-diferencias.plantilla.json';

/** JSON estáticos que reemplazan a los endpoints pendientes del back. */
export const PLANTILLA_REGLA = plantillaJson as unknown as ViewTemplate;
export const DATOS_REGLA = datosJson as unknown as TablePage;

/**
 * Estado en memoria del backend simulado. Vive mientras dure la sesión del navegador, así que
 * "Resolver diferencias" se refleja al recargar la tabla (los casos pasan a "Resuelto").
 */
@Injectable({ providedIn: 'root' })
export class MockBackendState {
  readonly plantilla: ViewTemplate = PLANTILLA_REGLA;
  readonly summary = DATOS_REGLA.summary;

  /** Columnas hoja de la tabla de la plantilla, por id (para ordenar y armar el reporte). */
  readonly columnas: ReadonlyMap<string, LeafColumnDefinition> = new Map(
    leafColumnsOf(findTableBlock(PLANTILLA_REGLA)?.table.columns ?? []).map((column) => [
      column.id,
      column,
    ]),
  );

  private filas: readonly TableRow[] = structuredClone(DATOS_REGLA.rows);

  rows(): readonly TableRow[] {
    return this.filas;
  }

  /** Marca los casos como resueltos y devuelve cuántos existían. */
  resolver(ids: readonly string[]): number {
    const pendientes = new Set(ids);
    let procesados = 0;
    this.filas = this.filas.map((fila) => {
      if (!pendientes.has(String(fila['idCaso']))) {
        return fila;
      }
      procesados++;
      return { ...fila, estado: 'RESUELTO' };
    });
    return procesados;
  }
}
