import {
  type HttpEvent,
  type HttpInterceptorFn,
  type HttpRequest,
  HttpResponse,
} from '@angular/common/http';
import { inject, InjectionToken } from '@angular/core';
import { delay, type Observable, of } from 'rxjs';
import { API_BASE_URL } from '../config/api-base-url';
import type { ColumnSortDefinition, LeafColumnDefinition, TableRow } from '../data-access/vista.model';
import { getPath, parseSorting } from '../data-access/vista.utils';
import type { ApiResponse } from '../http/api-response';
import { MockBackendState } from './mock-backend.state';

/** Latencia simulada (ms): deja ver los skeletons como con el backend real. */
export const MOCK_BACKEND_LATENCY = new InjectionToken<number>('MOCK_BACKEND_LATENCY', {
  providedIn: 'root',
  factory: () => 350,
});

const RULE = String.raw`^/Conciliaciones/subprocesos/[^/]+/reglas/[^/]+`;

type Handler = (request: HttpRequest<unknown>, state: MockBackendState) => HttpResponse<unknown>;

/**
 * Endpoints que el back aún no publica. Responden igual para cualquier canal y regla, con los
 * JSON de `fixtures/`. Todo lo demás (proyectos, procesos, subprocesos) va al backend real.
 */
const ROUTES: readonly { method: string; pattern: RegExp; handle: Handler }[] = [
  { method: 'GET', pattern: new RegExp(`${RULE}/plantilla$`), handle: plantilla },
  { method: 'GET', pattern: new RegExp(`${RULE}/casos$`), handle: pagina },
  { method: 'GET', pattern: new RegExp(`${RULE}/casos/reporte$`), handle: reporte },
  { method: 'POST', pattern: new RegExp(`${RULE}/casos/resolver$`), handle: resolver },
];

/**
 * Backend simulado para los servicios pendientes de la pantalla de regla. Se activa con
 * `environment.mockPendingEndpoints`; cuando el back publique los endpoints, se apaga ahí.
 */
export const mockBackendInterceptor: HttpInterceptorFn = (request, next) => {
  const baseUrl = inject(API_BASE_URL);
  if (!request.url.startsWith(baseUrl)) {
    return next(request);
  }
  const path = request.url.slice(baseUrl.length);
  const route = ROUTES.find(
    (candidate) => candidate.method === request.method && candidate.pattern.test(path),
  );
  if (!route) {
    return next(request);
  }
  const response = route.handle(request, inject(MockBackendState));
  return (of(response) as Observable<HttpEvent<unknown>>).pipe(delay(inject(MOCK_BACKEND_LATENCY)));
};

function ok<T>(resultado: T): HttpResponse<ApiResponse<T>> {
  return new HttpResponse({
    status: 200,
    body: {
      codigoEstado: 200,
      respuestaEstado: true,
      mensaje: null,
      errores: [],
      mensajeError: null,
      resultado,
    },
  });
}

function plantilla(_: HttpRequest<unknown>, state: MockBackendState): HttpResponse<unknown> {
  return ok(state.plantilla);
}

function pagina(request: HttpRequest<unknown>, state: MockBackendState): HttpResponse<unknown> {
  const pageNumber = positiveInt(request.params.get('pageNumber'), 1);
  const pageSize = positiveInt(request.params.get('pageSize'), 10);
  const sort = sortOf(request, state);
  const rows = sortRows(state.rows(), sort, state.columnas);
  const totalRows = rows.length;
  const start = (pageNumber - 1) * pageSize;
  return ok({
    pageNumber,
    pageSize,
    totalRows,
    totalPages: Math.ceil(totalRows / pageSize),
    sort,
    summary: state.summary,
    rows: rows.slice(start, start + pageSize),
  });
}

function reporte(request: HttpRequest<unknown>, state: MockBackendState): HttpResponse<unknown> {
  const columns = [...state.columnas.values()].filter((column) => !!column.accessorKey);
  const rows = sortRows(state.rows(), sortOf(request, state), state.columnas);
  const lines = [
    columns.map((column) => csvValue(headerLabel(column))),
    ...rows.map((row) => columns.map((column) => csvValue(getPath(row, column.accessorKey!)))),
  ].map((cells) => cells.join(';'));
  // BOM para que Excel abra las tildes correctamente; ";" es el separador de Excel en español.
  const body = new Blob([`﻿${lines.join('\r\n')}\r\n`], { type: 'text/csv;charset=utf-8' });
  return new HttpResponse({ status: 200, body });
}

function resolver(request: HttpRequest<unknown>, state: MockBackendState): HttpResponse<unknown> {
  const ids = (request.body as { ids?: unknown } | null)?.ids;
  const validos = Array.isArray(ids) ? ids.map(String) : [];
  return ok({ procesados: state.resolver(validos) });
}

function positiveInt(value: string | null, fallback: number): number {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

/** Orden pedido, solo sobre columnas ordenables (el back real respondería 400 con otras). */
function sortOf(request: HttpRequest<unknown>, state: MockBackendState): ColumnSortDefinition[] {
  return parseSorting((request.params.getAll('sort') ?? []).join(',')).filter(
    ({ id }) => state.columnas.get(id)?.enableSorting === true,
  );
}

function sortRows(
  rows: readonly TableRow[],
  sort: readonly ColumnSortDefinition[],
  columns: ReadonlyMap<string, LeafColumnDefinition>,
): TableRow[] {
  const sorted = [...rows];
  if (sort.length === 0) {
    return sorted;
  }
  return sorted.sort((a, b) => {
    for (const { id, desc } of sort) {
      const column = columns.get(id);
      if (!column?.accessorKey) {
        continue;
      }
      const valueA = getPath(a, column.accessorKey);
      const valueB = getPath(b, column.accessorKey);
      // Los vacíos van al final en ambos sentidos.
      const emptyA = valueA === null || valueA === undefined;
      const emptyB = valueB === null || valueB === undefined;
      if (emptyA || emptyB) {
        if (emptyA !== emptyB) {
          return emptyA ? 1 : -1;
        }
        continue;
      }
      const result = compare(valueA, valueB, column);
      if (result !== 0) {
        return desc ? -result : result;
      }
    }
    return 0;
  });
}

function compare(a: unknown, b: unknown, column: LeafColumnDefinition): number {
  if (column.sortType === 'datetime') {
    return Date.parse(String(a)) - Date.parse(String(b));
  }
  if (typeof a === 'number' && typeof b === 'number') {
    return a - b;
  }
  return String(a).localeCompare(String(b), 'es', { numeric: true, sensitivity: 'base' });
}

function headerLabel(column: LeafColumnDefinition): string {
  const header = column.header;
  if (typeof header === 'string') {
    return header;
  }
  return header.component === 'SortIndicator' ? header.inputs.label : column.id;
}

function csvValue(value: unknown): string {
  const text = value === null || value === undefined ? '' : String(value);
  return /[;"\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}
