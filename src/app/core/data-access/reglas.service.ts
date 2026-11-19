import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { EMPTY, expand, first, map, type Observable, of, tap } from 'rxjs';
import { API_BASE_URL } from '../config/api-base-url';
import { ApiError, type ApiResponse, unwrapApiResponse } from '../http/api-response';
import type {
  CambioEstadoRequest,
  Regla,
  ReglasConsulta,
  ReglasPagina,
  ReglasResultado,
  Reporte,
  ReporteRespuesta,
  ResolucionDiferencias,
} from './regla.model';

/** Tamaño de página al buscar una regla por id (no hay endpoint de una sola regla). */
const BUSQUEDA_PAGE_SIZE = 50;
const EXCEL_CONTENT_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

function toPagina(resultado: ReglasResultado | null | undefined): ReglasPagina {
  const pagina =
    resultado && !Array.isArray((resultado as ReglasPagina).data)
      ? (resultado as { readonly data: ReglasPagina }).data
      : (resultado as ReglasPagina | null | undefined);
  return { ...(pagina as ReglasPagina), data: pagina?.data ?? [] };
}

/** "data:…;base64,AAAA" o "AAAA" → bytes. */
function base64ToBytes(value: string): Uint8Array<ArrayBuffer> {
  const binary = atob(value.replace(/^data:[^,]*,/, '').replace(/\s+/g, ''));
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index++) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

@Injectable({ providedIn: 'root' })
export class ReglasService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);
  /** Reglas ya vistas por canal: dan el nombre de la regla al navegar a su pantalla. */
  private readonly cache = new Map<string, Map<string, Regla>>();

  /**
   * Reglas con diferencias de un canal, paginadas en el servidor
   * (`GET /Conciliaciones/subprocesos/reglas?subProcesoId=&pageNumber=&pageSize=`).
   */
  getReglas(subProcesoId: string, pageNumber: number, pageSize: number): Observable<ReglasConsulta> {
    const params = new HttpParams()
      .set('subProcesoId', subProcesoId)
      .set('pageNumber', pageNumber)
      .set('pageSize', pageSize);
    return this.http
      .get<ApiResponse<ReglasResultado>>(`${this.baseUrl}/Conciliaciones/subprocesos/reglas`, { params })
      .pipe(
        map((response) => ({ ...toPagina(unwrapApiResponse(response)), consultadoEn: new Date() })),
        tap((consulta) => {
          const reglas = this.cache.get(subProcesoId) ?? new Map<string, Regla>();
          consulta.data.forEach((regla) => reglas.set(regla.idRegla, regla));
          this.cache.set(subProcesoId, reglas);
        }),
      );
  }

  /**
   * Una regla del canal por id. Usa las reglas ya consultadas; si no está (p. ej. al abrir la URL
   * directamente), recorre las páginas del listado hasta encontrarla.
   */
  getRegla(subProcesoId: string, reglaId: string): Observable<Regla> {
    const cached = this.cache.get(subProcesoId)?.get(reglaId);
    if (cached) {
      return of(cached);
    }
    let page = 1;
    return this.getReglas(subProcesoId, page, BUSQUEDA_PAGE_SIZE).pipe(
      expand((consulta) =>
        consulta.data.some((regla) => regla.idRegla === reglaId) || page >= consulta.totalPages
          ? EMPTY
          : this.getReglas(subProcesoId, ++page, BUSQUEDA_PAGE_SIZE),
      ),
      map((consulta) => consulta.data.find((regla) => regla.idRegla === reglaId)),
      first((regla): regla is Regla => regla !== undefined, null),
      map((regla) => {
        if (!regla) {
          throw new ApiError('No encontramos la regla solicitada.', 404, []);
        }
        return regla;
      }),
    );
  }

  /**
   * "Resolver diferencias": cambia el estado de las conciliaciones seleccionadas
   * (`PUT /Conciliaciones/cambio-estado` con `{ conciliacionId: [...] }`).
   */
  resolverDiferencias(ids: readonly string[]): Observable<ResolucionDiferencias> {
    const body: CambioEstadoRequest = { conciliacionId: ids };
    return this.http
      .put<ApiResponse<ResolucionDiferencias>>(`${this.baseUrl}/Conciliaciones/cambio-estado`, body)
      .pipe(
        map((response) => {
          const resultado = unwrapApiResponse(response);
          return {
            ...resultado,
            actualizados: resultado?.actualizados ?? [],
            noEncontrados: resultado?.noEncontrados ?? [],
            totalProcesados: resultado?.totalProcesados ?? 0,
          };
        }),
      );
  }

  /**
   * "Descargar reporte": Excel con los casos de la regla
   * (`GET /Informes/export-excel?reglaId=`). El back lo envía en base64 dentro del JSON.
   */
  descargarReporte(reglaId: string): Observable<Reporte> {
    const params = new HttpParams().set('reglaId', reglaId);
    return this.http
      .get<ApiResponse<ReporteRespuesta>>(`${this.baseUrl}/Informes/export-excel`, { params })
      .pipe(
        map((response) => {
          const reporte = unwrapApiResponse(response);
          if (!reporte?.archivoBase64) {
            throw new ApiError('El reporte llegó vacío.', 0, []);
          }
          return {
            blob: new Blob([base64ToBytes(reporte.archivoBase64)], {
              type: reporte.contentType || EXCEL_CONTENT_TYPE,
            }),
            nombreArchivo: reporte.nombreArchivo || null,
          };
        }),
      );
  }
}
