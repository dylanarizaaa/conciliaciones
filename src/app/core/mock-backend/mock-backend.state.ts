import { Injectable } from '@angular/core';
import type {
  LeafColumnDefinition,
  TablePage,
  TablePageSummary,
  TableRow,
  ViewTemplate,
} from '../data-access/vista.model';
import { findTableBlock, leafColumnsOf } from '../data-access/vista.utils';
import datosJson from './fixtures/regla-diferencias.datos.json';
import plantillaJson from './fixtures/regla-diferencias.plantilla.json';

/** JSON estáticos que reemplazan a los endpoints pendientes del back. */
export const PLANTILLA_REGLA = plantillaJson as unknown as ViewTemplate;
export const DATOS_REGLA = datosJson as unknown as TablePage;

/** Usuario que aparece como validador en el modal "Conciliación procesada" (dato del diseño). */
export const MOCK_VALIDADOR = 'Alexander Tipacoque';

/**
 * Regla de la simulación: estos estados logísticos requieren una nueva validación, así que al
 * resolverlos siguen en "Pendiente". El resto sale de la lista.
 */
const ESTADOS_CON_NUEVA_VALIDACION = new Set(['Cancelado', 'Devuelto']);

/** Respuesta simulada de "Resolver diferencias". */
export interface ResolucionSimulada {
  readonly procesados: number;
  readonly pendientes: number;
  readonly validadoPor: string;
  readonly fechaValidacion: string;
}

/**
 * Estado en memoria del backend simulado. Vive mientras dure la sesión del navegador, así que
 * "Resolver diferencias" se refleja al recargar la tabla.
 */
@Injectable({ providedIn: 'root' })
export class MockBackendState {
  readonly plantilla: ViewTemplate = PLANTILLA_REGLA;

  /** Columnas hoja de la tabla de la plantilla, por id (para ordenar y armar el reporte). */
  readonly columnas: ReadonlyMap<string, LeafColumnDefinition> = new Map(
    leafColumnsOf(findTableBlock(PLANTILLA_REGLA)?.table.columns ?? []).map((column) => [
      column.id,
      column,
    ]),
  );

  private filas: readonly TableRow[] = structuredClone(DATOS_REGLA.rows);
  private readonly diferenciaInicial = sumaDiferencias(DATOS_REGLA.rows);

  rows(): readonly TableRow[] {
    return this.filas;
  }

  /** Casos y monto de lo que queda por resolver (el monto baja en proporción a lo resuelto). */
  get summary(): TablePageSummary | undefined {
    const inicial = DATOS_REGLA.summary;
    if (!inicial) {
      return undefined;
    }
    const proporcion = this.diferenciaInicial > 0 ? sumaDiferencias(this.filas) / this.diferenciaInicial : 1;
    return {
      casosTotales: this.filas.length,
      montoAfectado: Math.round((inicial.montoAfectado * proporcion) / 1000) * 1000,
    };
  }

  /** Resuelve los casos pedidos: salen de la lista salvo los que requieren nueva validación. */
  resolver(ids: readonly string[], ahora = new Date()): ResolucionSimulada {
    const pedidos = new Set(ids);
    const esPedido = (fila: TableRow) => pedidos.has(String(fila['idCaso']));
    const requiereValidacion = (fila: TableRow) =>
      ESTADOS_CON_NUEVA_VALIDACION.has(String(fila['estadoLogistico']));

    const pendientes = this.filas.filter((fila) => esPedido(fila) && requiereValidacion(fila)).length;
    const antes = this.filas.length;
    this.filas = this.filas.filter((fila) => !esPedido(fila) || requiereValidacion(fila));
    return {
      procesados: antes - this.filas.length,
      pendientes,
      validadoPor: MOCK_VALIDADOR,
      fechaValidacion: ahora.toISOString(),
    };
  }
}

function sumaDiferencias(filas: readonly TableRow[]): number {
  return filas.reduce((total, fila) => total + (Number(fila['diferencia']) || 0), 0);
}
