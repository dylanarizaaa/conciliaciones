import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL } from '../config/api-base-url';
import type { TablePage, ViewTemplate } from '../data-access/vista.model';
import type { ApiResponse } from '../http/api-response';
import { MOCK_BACKEND_LATENCY, mockBackendInterceptor } from './mock-backend.interceptor';
import { MOCK_VALIDADOR, type ResolucionSimulada } from './mock-backend.state';

const RULE = '/api/Conciliaciones/subprocesos/s1/reglas/Cambio%20de%20estado%20log%C3%ADstico';

describe('mockBackendInterceptor', () => {
  let http: HttpClient;
  let backend: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([mockBackendInterceptor])),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: '/api' },
        { provide: MOCK_BACKEND_LATENCY, useValue: 0 },
      ],
    });
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  const casos = (params: Record<string, string | string[]>) =>
    firstValueFrom(http.get<ApiResponse<TablePage>>(`${RULE}/casos`, { params })).then(
      (response) => response.resultado,
    );

  it('entrega la plantilla estática de la regla', async () => {
    const { resultado } = await firstValueFrom(
      http.get<ApiResponse<ViewTemplate>>(`${RULE}/plantilla`),
    );

    expect(resultado.schemaVersion).toBe('1.0.0');
    expect(resultado.actions?.[0].label).toBe('Resolver diferencias');
    expect(resultado.blocks[0].table.columns).toHaveLength(14);
  });

  it('pagina y ordena como lo haría el servidor', async () => {
    const pagina = await casos({ pageNumber: '2', pageSize: '3', sort: 'diferencia:desc' });

    expect(pagina.totalRows).toBe(10);
    expect(pagina.totalPages).toBe(4);
    expect(pagina.sort).toEqual([{ id: 'diferencia', desc: true }]);
    expect(pagina.summary).toEqual({ casosTotales: 10, montoAfectado: 4800000 });
    expect(pagina.rows.map((row) => row['diferencia'])).toEqual([1100000, 1050000, 930000]);
  });

  it('ignora el orden por columnas que no son ordenables', async () => {
    const pagina = await casos({ pageNumber: '1', pageSize: '10', sort: 'accion:asc' });

    expect(pagina.sort).toEqual([]);
    expect(pagina.rows[0]['idCaso']).toBe('CASO-3452');
  });

  it('genera el reporte CSV con encabezados y el orden pedido', async () => {
    const blob = await firstValueFrom(
      http.get(`${RULE}/casos/reporte`, { params: { sort: 'diferencia:desc' }, responseType: 'blob' }),
    );
    const [encabezados, primera] = (await blob.text()).replace('﻿', '').split('\r\n');

    expect(blob.type).toBe('text/csv;charset=utf-8');
    expect(encabezados.split(';').slice(0, 3)).toEqual([
      'Nombre del cliente',
      'Identificación',
      'Número de bolsillo',
    ]);
    expect(primera).toContain('Isabella Estefanía Suárez');
  });

  it('resuelve casos: salen de la lista salvo los que requieren nueva validación', async () => {
    // CASO-3452 está "Entregado"; CASO-3455 está "Cancelado" (requiere nueva validación).
    const { resultado } = await firstValueFrom(
      http.post<ApiResponse<ResolucionSimulada>>(`${RULE}/casos/resolver`, {
        ids: ['CASO-3452', 'CASO-3455', 'NO-EXISTE'],
      }),
    );
    const pagina = await casos({ pageNumber: '1', pageSize: '10' });

    expect(resultado).toEqual({
      procesados: 1,
      pendientes: 1,
      validadoPor: MOCK_VALIDADOR,
      fechaValidacion: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
    });
    expect(pagina.totalRows).toBe(9);
    expect(pagina.rows.map((row) => row['idCaso'])).not.toContain('CASO-3452');
    expect(pagina.rows.find((row) => row['idCaso'] === 'CASO-3455')?.['estado']).toBe('PENDIENTE');
    // El resumen baja con lo resuelto (redondeado a miles).
    expect(pagina.summary?.casosTotales).toBe(9);
    expect(pagina.summary!.montoAfectado).toBeLessThan(4800000);
    expect(pagina.summary!.montoAfectado % 1000).toBe(0);
  });

  it('deja pasar al backend real los endpoints que ya existen', async () => {
    const respuesta = firstValueFrom(http.get('/api/Conciliaciones/proyectos'));
    backend.expectOne('/api/Conciliaciones/proyectos').flush({ ok: true });

    expect(await respuesta).toEqual({ ok: true });
  });
});
