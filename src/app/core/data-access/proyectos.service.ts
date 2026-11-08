import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, type Observable, of, tap } from 'rxjs';
import { API_BASE_URL } from '../config/api-base-url';
import { ApiError, type ApiResponse, unwrapApiResponse } from '../http/api-response';
import type { Proyecto, ProyectosResultado } from './proyecto.model';

@Injectable({ providedIn: 'root' })
export class ProyectosService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);
  /** Última lista recibida, para no repetir la consulta al navegar del listado al detalle. */
  private readonly cache = new Map<string, Proyecto>();

  /** Lista las plataformas con sus casos y monto afectado. */
  getProyectos(): Observable<readonly Proyecto[]> {
    return this.http
      .get<ApiResponse<ProyectosResultado>>(`${this.baseUrl}/Conciliaciones/proyectos`)
      .pipe(
        map((response) => unwrapApiResponse(response).data ?? []),
        tap((proyectos) => {
          this.cache.clear();
          proyectos.forEach((proyecto) => this.cache.set(proyecto.proyectoId, proyecto));
        }),
      );
  }

  /** Devuelve una plataforma por id, usando la caché si ya se consultó el listado. */
  getProyecto(proyectoId: string): Observable<Proyecto> {
    const cached = this.cache.get(proyectoId);
    if (cached) {
      return of(cached);
    }
    return this.getProyectos().pipe(
      map((proyectos) => {
        const proyecto = proyectos.find((item) => item.proyectoId === proyectoId);
        if (!proyecto) {
          throw new ApiError('No encontramos la plataforma solicitada.', 404, []);
        }
        return proyecto;
      }),
    );
  }
}
