import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, type Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api-base-url';
import { type ApiResponse, unwrapApiResponse } from '../http/api-response';
import type { ReglasConsulta, ReglasResultado } from './regla.model';

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
}
