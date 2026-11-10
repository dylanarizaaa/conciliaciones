import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, type Observable, of, tap } from 'rxjs';
import { API_BASE_URL } from '../config/api-base-url';
import { type ApiResponse, unwrapApiResponse } from '../http/api-response';
import type {
  ColumnSortDefinition,
  TablePage,
  TablePageConsulta,
  ViewBlock,
  ViewRecord,
  ViewTemplate,
} from './vista.model';
import { assertSupportedTemplate, serializeSorting } from './vista.utils';

/** Página y orden pedidos al endpoint de datos de un bloque de tabla. */
export interface TablePageQuery {
  /** Sin página (`pagination.mode: 'none'`) no se envían `pageNumber` ni `pageSize`. */
  readonly pageNumber?: number;
  readonly pageSize?: number;
  /** Solo se envía cuando el orden lo resuelve el servidor. */
  readonly sort: readonly ColumnSortDefinition[];
}

/** Endpoints de la vista paramétrica: plantilla y datos de cada bloque. */
@Injectable({ providedIn: 'root' })
export class VistasService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);
  /** La plantilla no cambia al paginar ni al ordenar: se pide una vez por pantalla y regla. */
  private readonly plantillas = new Map<string, ViewTemplate>();

  /** Plantilla de la pantalla de una regla (`GET …/subprocesos/{id}/reglas/{regla}/plantilla`). */
  getPlantillaRegla(subProcesoId: string, regla: string): Observable<ViewTemplate> {
    return this.getPlantilla(`${this.reglaUrl(subProcesoId, regla)}/plantilla`, 'table');
  }

  /**
   * Plantilla de la pantalla de detalle de un caso
   * (`GET …/subprocesos/{id}/reglas/{regla}/casos/plantilla`). Es la misma para todos los casos
   * de la regla.
   */
  getPlantillaCaso(subProcesoId: string, regla: string): Observable<ViewTemplate> {
    return this.getPlantilla(`${this.reglaUrl(subProcesoId, regla)}/casos/plantilla`);
  }

  /**
   * Registro de un bloque con fuente de registro único (p. ej. los acordeones). `path` es el
   * `dataSource.path` de la plantilla ya resuelto con los parámetros de la ruta.
   */
  getRegistro(path: string): Observable<ViewRecord> {
    return this.http
      .get<ApiResponse<ViewRecord>>(`${this.baseUrl}${path}`)
      .pipe(map((response) => unwrapApiResponse(response) ?? {}));
  }

  /**
   * Página de datos de un bloque de tabla. `path` es el `dataSource.path` de la plantilla ya
   * resuelto con los parámetros de la ruta. Incluye `consultadoEn`: la hora en que llegó la
   * respuesta.
   */
  getPagina(path: string, query: TablePageQuery): Observable<TablePageConsulta> {
    let params = this.sortParams(query.sort);
    if (query.pageNumber !== undefined && query.pageSize !== undefined) {
      params = params.set('pageNumber', query.pageNumber).set('pageSize', query.pageSize);
    }
    return this.http.get<ApiResponse<TablePage>>(`${this.baseUrl}${path}`, { params }).pipe(
      map((response) => {
        const pagina = unwrapApiResponse(response);
        return { ...pagina, rows: pagina.rows ?? [], consultadoEn: new Date() };
      }),
    );
  }

  private getPlantilla(url: string, requiredBlock?: ViewBlock['type']): Observable<ViewTemplate> {
    const cached = this.plantillas.get(url);
    if (cached) {
      return of(cached);
    }
    return this.http.get<ApiResponse<ViewTemplate>>(url).pipe(
      map((response) => assertSupportedTemplate(unwrapApiResponse(response), requiredBlock)),
      tap((plantilla) => this.plantillas.set(url, plantilla)),
    );
  }

  private reglaUrl(subProcesoId: string, regla: string): string {
    return (
      `${this.baseUrl}/Conciliaciones/subprocesos/${encodeURIComponent(subProcesoId)}` +
      `/reglas/${encodeURIComponent(regla)}`
    );
  }

  private sortParams(sort: readonly ColumnSortDefinition[]): HttpParams {
    return serializeSorting(sort).reduce(
      (params, value) => params.append('sort', value),
      new HttpParams(),
    );
  }
}
