import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, type Observable, of, tap } from 'rxjs';
import { API_BASE_URL } from '../config/api-base-url';
import { ApiError, type ApiResponse } from '../http/api-response';
import type { Proceso, ProcesosConsulta, ProcesosResultado } from './proceso.model';
import { toResumenConsulta } from './resumen-diferencias';

@Injectable({ providedIn: 'root' })
export class ProcesosService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);
  /** Última consulta por plataforma, para no repetirla al navegar a una categoría. */
  private readonly cache = new Map<string, ProcesosConsulta>();

  /**
   * Totales de la plataforma y sus diferencias agrupadas por categoría (proceso).
   * Incluye `consultadoEn`: la hora en que llegó la respuesta.
   */
  getProcesos(proyectoId: string): Observable<ProcesosConsulta> {
    const params = new HttpParams().set('proyectoId', proyectoId);
    return this.http
      .get<ApiResponse<ProcesosResultado>>(`${this.baseUrl}/Conciliaciones/procesos`, { params })
      .pipe(
        map((response) => toResumenConsulta(response)),
        tap((consulta) => this.cache.set(proyectoId, consulta)),
      );
  }

  /** Devuelve una categoría de la plataforma, usando la caché si ya se consultó. */
  getProceso(proyectoId: string, procesoId: string): Observable<Proceso> {
    const find = (consulta: ProcesosConsulta) =>
      consulta.data.find((proceso) => proceso.procesoId === procesoId);

    const cached = this.cache.get(proyectoId);
    const fromCache = cached && find(cached);
    if (fromCache) {
      return of(fromCache);
    }
    return this.getProcesos(proyectoId).pipe(
      map((consulta) => {
        const proceso = find(consulta);
        if (!proceso) {
          throw new ApiError('No encontramos la categoría solicitada.', 404, []);
        }
        return proceso;
      }),
    );
  }
}
