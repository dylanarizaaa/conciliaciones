import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, type Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api-base-url';
import { type ApiResponse, unwrapApiResponse } from '../http/api-response';
import type { ReglasConsulta, ReglasResultado, ResolucionDiferencias } from './regla.model';
import type { ColumnSortDefinition } from './vista.model';
import { serializeSorting } from './vista.utils';

@Injectable({ providedIn: 'root' })
export class ReglasService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  /** Reglas de conciliación de un canal (subproceso), paginadas en el servidor. */
  getReglas(subProcesoId: string, pageNumber: number, pageSize: number): Observable<ReglasConsulta> {
    const params = new HttpParams().set('pageNumber', pageNumber).set('pageSize', pageSize);
    return this.http
      .get<ApiResponse<ReglasResultado>>(
        `${this.baseUrl}/Conciliaciones/subprocesos/reglas/${encodeURIComponent(subProcesoId)}`,
        { params },
      )
      .pipe(
        map((response) => {
          const pagina = unwrapApiResponse(response).data;
          return { ...pagina, data: pagina.data ?? [], consultadoEn: new Date() };
        }),
      );
  }

  /**
   * "Resolver diferencias": envía los casos seleccionados de la regla
   * (`POST …/subprocesos/{subProcesoId}/reglas/{regla}/casos/resolver` con `{ ids }`).
   */
  resolverDiferencias(
    subProcesoId: string,
    regla: string,
    ids: readonly string[],
  ): Observable<ResolucionDiferencias> {
    return this.http
      .post<ApiResponse<ResolucionDiferencias>>(`${this.casosUrl(subProcesoId, regla)}/resolver`, { ids })
      .pipe(map((response) => unwrapApiResponse(response)));
  }

  /**
   * "Descargar reporte": archivo con los casos de la regla en el orden actual de la tabla
   * (`GET …/subprocesos/{subProcesoId}/reglas/{regla}/casos/reporte?sort=campo:asc`).
   */
  descargarReporte(
    subProcesoId: string,
    regla: string,
    sort: readonly ColumnSortDefinition[],
  ): Observable<Blob> {
    const params = serializeSorting(sort).reduce(
      (current, value) => current.append('sort', value),
      new HttpParams(),
    );
    return this.http.get(`${this.casosUrl(subProcesoId, regla)}/reporte`, {
      params,
      responseType: 'blob',
    });
  }

  private casosUrl(subProcesoId: string, regla: string): string {
    return (
      `${this.baseUrl}/Conciliaciones/subprocesos/${encodeURIComponent(subProcesoId)}` +
      `/reglas/${encodeURIComponent(regla)}/casos`
    );
  }
}
