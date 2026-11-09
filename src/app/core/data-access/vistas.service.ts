import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, type Observable, of, tap } from 'rxjs';
import { API_BASE_URL } from '../config/api-base-url';
import { type ApiResponse, unwrapApiResponse } from '../http/api-response';
import type {
  ColumnSortDefinition,
  TablePage,
  TablePageConsulta,
  ViewTemplate,
} from './vista.model';
import { assertSupportedTemplate, serializeSorting } from './vista.utils';

/** Página y orden pedidos al endpoint de datos de un bloque. */
export interface TablePageQuery {
  readonly pageNumber: number;
  readonly pageSize: number;
  /** Solo se envía cuando el orden lo resuelve el servidor. */
  readonly sort: readonly ColumnSortDefinition[];
}

/** Endpoints de la vista paramétrica: plantilla y datos de cada bloque. */
@Injectable({ providedIn: 'root' })
export class VistasService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);
  /** La plantilla no cambia al paginar ni al ordenar: se pide una vez por regla. */
  private readonly plantillas = new Map<string, ViewTemplate>();

  /** Plantilla de la pantalla de una regla (`GET …/subprocesos/{id}/reglas/{regla}/plantilla`). */
  getPlantillaRegla(subProcesoId: string, regla: string): Observable<ViewTemplate> {
    const key = `${subProcesoId}\u0000${regla}`;
    const cached = this.plantillas.get(key);
    if (cached) {
      return of(cached);
    }
    const url =
      `${this.baseUrl}/Conciliaciones/subprocesos/${encodeURIComponent(subProcesoId)}` +
      `/reglas/${encodeURIComponent(regla)}/plantilla`;
    return this.http.get<ApiResponse<ViewTemplate>>(url).pipe(
      map((response) => assertSupportedTemplate(unwrapApiResponse(response))),
      tap((plantilla) => this.plantillas.set(key, plantilla)),
    );
  }

  /**
   * Página de datos de un bloque. `path` es el `dataSource.path` de la plantilla ya resuelto
   * con los parámetros de la ruta. Incluye `consultadoEn`: la hora en que llegó la respuesta.
   */
  getPagina(path: string, query: TablePageQuery): Observable<TablePageConsulta> {
    const params = this.sortParams(query.sort)
      .set('pageNumber', query.pageNumber)
      .set('pageSize', query.pageSize);
    return this.http.get<ApiResponse<TablePage>>(`${this.baseUrl}${path}`, { params }).pipe(
      map((response) => {
        const pagina = unwrapApiResponse(response);
        return { ...pagina, rows: pagina.rows ?? [], consultadoEn: new Date() };
      }),
    );
  }

  private sortParams(sort: readonly ColumnSortDefinition[]): HttpParams {
    return serializeSorting(sort).reduce(
      (params, value) => params.append('sort', value),
      new HttpParams(),
    );
  }
}
