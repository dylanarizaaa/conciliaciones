import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, type Observable, of, tap } from 'rxjs';
import { API_BASE_URL } from '../config/api-base-url';
import { ApiError, type ApiResponse, unwrapApiResponse } from '../http/api-response';
import type {
  ColumnSortDefinition,
  FuentesDetalle,
  TablePageConsulta,
  ViewBlock,
  ViewTemplate,
} from './vista.model';
import { assertSupportedTemplate, serializeSorting, toTablePage } from './vista.utils';

/**
 * Valores de `tipoBlock` de `GET /Conciliaciones/subprocesos-ui/plantilla`: cuál plantilla de la
 * regla se pide. El swagger no los documenta; se acordaron así y viven solo aquí.
 */
export const TIPO_BLOCK = {
  /** Pantalla Regla: tabla de casos. */
  regla: 1,
  /** Pantalla Detalle de la diferencia. */
  detalle: 2,
} as const;

export type TipoBlock = (typeof TIPO_BLOCK)[keyof typeof TIPO_BLOCK];

/** `resultado` de la plantilla (`GetParametrizacionPlantillaResponse`). */
interface PlantillaResultado {
  /** La plantilla del contrato; el back puede guardarla como objeto o como texto JSON. */
  readonly plantilla?: unknown;
}

/** Página y orden pedidos al endpoint de datos de un bloque de tabla. */
export interface TablePageQuery {
  /** Parámetros fijos de la fuente (`dataSource.query`, ya resueltos). */
  readonly query?: Readonly<Record<string, string>>;
  /** Sin página (`pagination.mode: 'none'`) no se envían `pageNumber` ni `pageSize`. */
  readonly pageNumber?: number;
  readonly pageSize?: number;
  /** Solo se envía cuando el orden lo resuelve el servidor. */
  readonly sort: readonly ColumnSortDefinition[];
}

/** La plantilla puede llegar como objeto o como texto JSON. */
function parsePlantilla(resultado: PlantillaResultado | ViewTemplate | null | undefined): ViewTemplate {
  const raw =
    resultado && typeof resultado === 'object' && 'plantilla' in resultado
      ? resultado.plantilla
      : resultado;
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as ViewTemplate;
    } catch {
      throw new ApiError('La plantilla no es un JSON válido.', 0, []);
    }
  }
  if (!raw || typeof raw !== 'object') {
    throw new ApiError('La regla no tiene una plantilla configurada.', 0, []);
  }
  return raw as ViewTemplate;
}

/** Endpoints de la vista paramétrica: plantilla y datos de cada bloque. */
@Injectable({ providedIn: 'root' })
export class VistasService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);
  /** La plantilla no cambia al paginar ni al ordenar: se pide una vez por regla y tipo. */
  private readonly plantillas = new Map<string, ViewTemplate>();

  /** Plantilla de la pantalla Regla. */
  getPlantillaRegla(reglaId: string): Observable<ViewTemplate> {
    return this.getPlantilla(reglaId, TIPO_BLOCK.regla, 'table');
  }

  /** Plantilla de la pantalla de detalle; es la misma para todos los casos de la regla. */
  getPlantillaCaso(reglaId: string): Observable<ViewTemplate> {
    return this.getPlantilla(reglaId, TIPO_BLOCK.detalle);
  }

  /**
   * Respuesta de la fuente de un bloque `accordion` (p. ej. `GET /Conciliaciones/fuentes-detalle`).
   * `path` y `query` vienen de la plantilla, ya resueltos con los parámetros de la ruta.
   */
  getFuentes(path: string, query: Readonly<Record<string, string>> = {}): Observable<FuentesDetalle> {
    return this.http
      .get<ApiResponse<FuentesDetalle>>(`${this.baseUrl}${path}`, { params: new HttpParams({ fromObject: query }) })
      .pipe(
        map((response) => {
          const resultado = unwrapApiResponse(response) ?? {};
          return { ...resultado, data: resultado.data ?? [] };
        }),
      );
  }

  /**
   * Página de datos de un bloque de tabla (p. ej. `GET /Conciliaciones/subprocesos-registros/reglas`).
   * Incluye `consultadoEn`: la hora en que llegó la respuesta.
   */
  getPagina(path: string, query: TablePageQuery): Observable<TablePageConsulta> {
    let params = new HttpParams({ fromObject: query.query ?? {} });
    params = serializeSorting(query.sort).reduce((current, value) => current.append('sort', value), params);
    if (query.pageNumber !== undefined && query.pageSize !== undefined) {
      params = params.set('pageNumber', query.pageNumber).set('pageSize', query.pageSize);
    }
    return this.http.get<ApiResponse<unknown>>(`${this.baseUrl}${path}`, { params }).pipe(
      map((response) => ({ ...toTablePage(unwrapApiResponse(response)), consultadoEn: new Date() })),
    );
  }

  /** `GET /Conciliaciones/subprocesos-ui/plantilla?reglaId=&tipoBlock=`. */
  private getPlantilla(
    reglaId: string,
    tipoBlock: TipoBlock,
    requiredBlock?: ViewBlock['type'],
  ): Observable<ViewTemplate> {
    const key = `${reglaId}\u0000${tipoBlock}`;
    const cached = this.plantillas.get(key);
    if (cached) {
      return of(cached);
    }
    const params = new HttpParams().set('reglaId', reglaId).set('tipoBlock', tipoBlock);
    return this.http
      .get<ApiResponse<PlantillaResultado>>(`${this.baseUrl}/Conciliaciones/subprocesos-ui/plantilla`, {
        params,
      })
      .pipe(
        map((response) =>
          assertSupportedTemplate(parsePlantilla(unwrapApiResponse(response)), requiredBlock),
        ),
        tap((plantilla) => this.plantillas.set(key, plantilla)),
      );
  }
}
