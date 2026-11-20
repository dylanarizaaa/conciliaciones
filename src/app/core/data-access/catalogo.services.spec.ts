import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';

import { API_BASE_URL } from '../config/api-base-url';
import { ApiError, type ApiResponse } from '../http/api-response';
import { ProcesosService } from './procesos.service';
import { ProyectosService } from './proyectos.service';
import { SubprocesosService } from './subprocesos.service';

function ok<T>(resultado: T): ApiResponse<T> {
  return { codigoEstado: 200, respuestaEstado: true, mensaje: null, errores: [], mensajeError: null, resultado };
}

const resumen = <T>(data: T[] | undefined) => ({ totalAfectado: 10, casosTotales: 2, data });

describe('Servicios de plataformas, categorías y canales', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: API_BASE_URL, useValue: '/api' }],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  describe('ProyectosService', () => {
    const proyecto = { proyectoId: 'p1', nombreProyecto: 'Prepago', monto: 10, cantidad: 2 };

    it('da una plataforma ya listada sin volver a pedirla', async () => {
      const service = TestBed.inject(ProyectosService);
      const listado = firstValueFrom(service.getProyectos());
      http.expectOne('/api/Conciliaciones/proyectos').flush(ok({ data: [proyecto] }));
      await listado;

      expect(await firstValueFrom(service.getProyecto('p1'))).toEqual(proyecto);
    });

    it('sin `data` el listado queda vacío y la plataforma no se encuentra (404)', async () => {
      const service = TestBed.inject(ProyectosService);
      const consulta = firstValueFrom(service.getProyecto('p1'));
      http.expectOne('/api/Conciliaciones/proyectos').flush(ok({}));

      await expect(consulta).rejects.toEqual(expect.objectContaining({ codigoEstado: 404 }));
      await expect(consulta).rejects.toBeInstanceOf(ApiError);
    });
  });

  describe('ProcesosService', () => {
    const proceso = { procesoId: 'c1', nombreProceso: 'Recargas', monto: 10, cantidad: 2 };
    const expectProcesos = () =>
      http.expectOne((req) => req.url === '/api/Conciliaciones/procesos' && req.params.get('proyectoId') === 'p1');

    it('da una categoría ya consultada sin volver a pedirla', async () => {
      const service = TestBed.inject(ProcesosService);
      const listado = firstValueFrom(service.getProcesos('p1'));
      expectProcesos().flush(ok(resumen([proceso])));
      expect((await listado).consultadoEn).toBeInstanceOf(Date);

      expect(await firstValueFrom(service.getProceso('p1', 'c1'))).toEqual(proceso);
    });

    it('una categoría que no está en la plataforma es un 404', async () => {
      const service = TestBed.inject(ProcesosService);
      const consulta = firstValueFrom(service.getProceso('p1', 'otra'));
      expectProcesos().flush(ok(resumen(undefined)));

      await expect(consulta).rejects.toEqual(expect.objectContaining({ codigoEstado: 404 }));
    });
  });

  describe('SubprocesosService', () => {
    const subproceso = { subProcesoId: 's1', nombreSubProceso: 'APP', monto: 10, cantidad: 2 };
    const expectSubprocesos = () =>
      http.expectOne((req) => req.url === '/api/Conciliaciones/subprocesos' && req.params.get('IdProcess') === 'c1');

    it('da un canal ya consultado sin volver a pedirlo', async () => {
      const service = TestBed.inject(SubprocesosService);
      const listado = firstValueFrom(service.getSubprocesos('c1'));
      expectSubprocesos().flush(ok(resumen([subproceso])));
      await listado;

      expect(await firstValueFrom(service.getSubproceso('c1', 's1'))).toEqual(subproceso);
    });

    it('si el canal no está en la caché vuelve a consultar y, si no existe, es un 404', async () => {
      const service = TestBed.inject(SubprocesosService);
      const listado = firstValueFrom(service.getSubprocesos('c1'));
      expectSubprocesos().flush(ok(resumen([subproceso])));
      await listado;

      const consulta = firstValueFrom(service.getSubproceso('c1', 'nuevo'));
      expectSubprocesos().flush(ok(resumen([subproceso])));
      await expect(consulta).rejects.toEqual(expect.objectContaining({ codigoEstado: 404 }));
    });
  });
});
