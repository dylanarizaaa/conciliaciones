import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';

import { API_BASE_URL } from '../config/api-base-url';
import { ApiError, type ApiResponse } from '../http/api-response';
import type { Regla, ReglasPagina } from './regla.model';
import { ReglasService } from './reglas.service';

function ok<T>(resultado: T): ApiResponse<T> {
  return { codigoEstado: 200, respuestaEstado: true, mensaje: null, errores: [], mensajeError: null, resultado };
}

const regla = (id: string): Regla => ({ idRegla: id, nombreRegla: `Regla ${id}`, casos: 1, monto: 100 });

function pagina(pageNumber: number, totalPages: number, data: Regla[]): ReglasPagina {
  return { casosTotales: 3, montoAfectado: 300, pageNumber, pageSize: 50, totalPages, data };
}

describe('ReglasService', () => {
  let service: ReglasService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: API_BASE_URL, useValue: '/api' }],
    });
    service = TestBed.inject(ReglasService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  const expectReglas = (page: number, size = 50) =>
    http.expectOne(
      (req) =>
        req.url === '/api/Conciliaciones/subprocesos/reglas' &&
        req.params.get('subProcesoId') === 's1' &&
        req.params.get('pageNumber') === String(page) &&
        req.params.get('pageSize') === String(size),
    );

  it('lista las reglas con la forma del swagger y también con la página anidada en `data`', async () => {
    const swagger = firstValueFrom(service.getReglas('s1', 1, 10));
    expectReglas(1, 10).flush(ok(pagina(1, 1, [regla('a')])));
    expect((await swagger).data.map((item) => item.idRegla)).toEqual(['a']);

    const anidada = firstValueFrom(service.getReglas('s1', 1, 10));
    expectReglas(1, 10).flush(ok({ data: pagina(1, 1, [regla('b')]) }));
    const consulta = await anidada;
    expect(consulta.data.map((item) => item.idRegla)).toEqual(['b']);
    expect(consulta.casosTotales).toBe(3);
  });

  it('da el nombre de una regla ya listada sin volver a pedirla', async () => {
    const listado = firstValueFrom(service.getReglas('s1', 1, 10));
    expectReglas(1, 10).flush(ok(pagina(1, 1, [regla('a')])));
    await listado;

    expect((await firstValueFrom(service.getRegla('s1', 'a'))).nombreRegla).toBe('Regla a');
  });

  it('busca la regla página por página y se detiene al encontrarla', async () => {
    const busqueda = firstValueFrom(service.getRegla('s1', 'c'));
    expectReglas(1).flush(ok(pagina(1, 3, [regla('a')])));
    expectReglas(2).flush(ok(pagina(2, 3, [regla('b'), regla('c')])));

    expect((await busqueda).idRegla).toBe('c');
    http.expectNone((req) => req.params.get('pageNumber') === '3');
  });

  it('si la regla no está en ninguna página, falla con 404', async () => {
    const busqueda = firstValueFrom(service.getRegla('s1', 'zz'));
    expectReglas(1).flush(ok(pagina(1, 1, [regla('a')])));

    await expect(busqueda).rejects.toMatchObject({ name: 'ApiError', codigoEstado: 404 });
  });

  it('resuelve diferencias con PUT a cambio-estado y normaliza las listas vacías', async () => {
    const resolucion = firstValueFrom(service.resolverDiferencias(['u1', 'u2']));
    const request = http.expectOne('/api/Conciliaciones/cambio-estado');
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({ conciliacionId: ['u1', 'u2'] });
    request.flush(ok({ actualizados: ['u1'], noEncontrados: null, totalProcesados: 2 }));

    expect(await resolucion).toEqual({ actualizados: ['u1'], noEncontrados: [], totalProcesados: 2 });
  });

  it('convierte el Excel en base64 (con o sin prefijo data:) en un archivo', async () => {
    const contenido = 'hola';
    const reporte = firstValueFrom(service.descargarReporte('r 1'));
    http
      .expectOne((req) => req.url === '/api/Informes/export-excel' && req.params.get('reglaId') === 'r 1')
      .flush(
        ok({
          archivoBase64: `data:application/octet-stream;base64,${btoa(contenido)}`,
          nombreArchivo: 'reporte.xlsx',
          contentType: null,
        }),
      );

    const { blob, nombreArchivo } = await reporte;
    expect(nombreArchivo).toBe('reporte.xlsx');
    expect(blob.size).toBe(contenido.length);
    expect(blob.type).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  });

  it('un reporte sin archivo es un error', async () => {
    const reporte = firstValueFrom(service.descargarReporte('r1'));
    http
      .expectOne((req) => req.url === '/api/Informes/export-excel')
      .flush(ok({ archivoBase64: '', nombreArchivo: null, contentType: null }));

    await expect(reporte).rejects.toBeInstanceOf(ApiError);
  });
});
