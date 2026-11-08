import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, type Observable, of, tap } from 'rxjs';
import { API_BASE_URL } from '../config/api-base-url';
import { ApiError, type ApiResponse } from '../http/api-response';
import { toResumenConsulta } from './resumen-diferencias';
import type { Subproceso, SubprocesosConsulta, SubprocesosResultado } from './subproceso.model';

@Injectable({ providedIn: 'root' })
export class SubprocesosService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);
  /** Última consulta por categoría, para no repetirla al navegar a un canal. */
  private readonly cache = new Map<string, SubprocesosConsulta>();

  /**
   * Totales de la categoría y sus diferencias agrupadas por canal (subproceso).
   * Incluye `consultadoEn`: la hora en que llegó la respuesta.
   */
  getSubprocesos(procesoId: string): Observable<SubprocesosConsulta> {
    const params = new HttpParams().set('IdProcess', procesoId);
    return this.http
      .get<ApiResponse<SubprocesosResultado>>(`${this.baseUrl}/Conciliaciones/subprocesos`, {
        params,
      })
      .pipe(
        map((response) => toResumenConsulta(response)),
        tap((consulta) => this.cache.set(procesoId, consulta)),
      );
  }

  /** Devuelve un canal de la categoría, usando la caché si ya se consultó. */
  getSubproceso(procesoId: string, subProcesoId: string): Observable<Subproceso> {
    const find = (consulta: SubprocesosConsulta) =>
      consulta.data.find((subproceso) => subproceso.subProcesoId === subProcesoId);

    const cached = this.cache.get(procesoId);
    const fromCache = cached && find(cached);
    if (fromCache) {
      return of(fromCache);
    }
    return this.getSubprocesos(procesoId).pipe(
      map((consulta) => {
        const subproceso = find(consulta);
        if (!subproceso) {
          throw new ApiError('No encontramos el canal solicitado.', 404, []);
        }
        return subproceso;
      }),
    );
  }
}
