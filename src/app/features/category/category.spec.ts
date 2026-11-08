import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { API_BASE_URL } from '../../core/config/api-base-url';
import type { ProcesosResultado } from '../../core/data-access/proceso.model';
import { ProcesosService } from '../../core/data-access/procesos.service';
import type { ProyectosResultado } from '../../core/data-access/proyecto.model';
import type { SubprocesosResultado } from '../../core/data-access/subproceso.model';
import type { ApiResponse } from '../../core/http/api-response';
import { Category } from './category';

const PROYECTOS_URL = '/api/Conciliaciones/proyectos';
const PROCESOS_URL = '/api/Conciliaciones/procesos';
const SUBPROCESOS_URL = '/api/Conciliaciones/subprocesos';

function ok<T>(resultado: T): ApiResponse<T> {
  return {
    codigoEstado: 200,
    respuestaEstado: true,
    mensaje: null,
    errores: [],
    mensajeError: null,
    resultado,
  };
}

const PROYECTOS: ProyectosResultado = {
  data: [{ proyectoId: 'p1', nombreProyecto: 'Inter Pay', monto: 13570000, cantidad: 50 }],
};

const PROCESOS: ProcesosResultado = {
  casosTotales: 50,
  totalAfectado: 13570000,
  data: [{ procesoId: 'c1', nombreProceso: 'Recargas', monto: 6150000, cantidad: 20 }],
};

const SUBPROCESOS: SubprocesosResultado = {
  casosTotales: 20,
  totalAfectado: 6150000,
  data: [
    { subProcesoId: 's1', nombreSubProceso: 'Pago en Casa', monto: 4800000, cantidad: 10 },
    { subProcesoId: 's2', nombreSubProceso: 'Payzen', monto: 1150000, cantidad: 8 },
    { subProcesoId: 's3', nombreSubProceso: 'Nequi', monto: null, cantidad: 2 },
  ],
};

const text = (element: Element | null | undefined) =>
  element?.textContent?.replace(/\s+/g, ' ').trim() ?? '';

describe('Category', () => {
  let harness: RouterTestingHarness;
  let http: HttpTestingController;
  let element: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [
        provideRouter(
          [{ path: 'plataformas/:proyectoId/categorias/:procesoId', component: Category }],
          withComponentInputBinding(),
        ),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: '/api' },
      ],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  async function navigate(): Promise<void> {
    harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/plataformas/p1/categorias/c1', Category);
    element = harness.routeNativeElement!;
  }

  function flushAll(subprocesos: SubprocesosResultado = SUBPROCESOS): void {
    http.expectOne(PROYECTOS_URL).flush(ok(PROYECTOS));
    http
      .expectOne((req) => req.url === PROCESOS_URL && req.params.get('proyectoId') === 'p1')
      .flush(ok(PROCESOS));
    http
      .expectOne((req) => req.url === SUBPROCESOS_URL && req.params.get('IdProcess') === 'c1')
      .flush(ok(subprocesos));
  }

  it('muestra skeletons mientras carga', async () => {
    await navigate();

    expect(element.querySelector('app-page-header-skeleton')).not.toBeNull();
    expect(element.querySelector('app-summary-card-skeleton')).not.toBeNull();
    expect(element.querySelectorAll('app-status-card-skeleton').length).toBe(4);

    flushAll();
  });

  it('muestra la categoría con su ruta de navegación y totales', async () => {
    await navigate();
    flushAll();
    await harness.fixture.whenStable();

    expect(text(element.querySelector('h1'))).toBe('Recargas');
    const crumbs = [...element.querySelectorAll('nav li')].map((li) => text(li));
    expect(crumbs).toEqual(['Inicio', 'Conciliaciones', 'Inter Pay', 'Recargas']);
    const hrefs = [...element.querySelectorAll('nav a')].map((a) => a.getAttribute('href'));
    expect(hrefs).toEqual(['/', '/', '/plataformas/p1']);
    expect(element.querySelector('a[aria-label="Volver a Inter Pay"]')?.getAttribute('href')).toBe(
      '/plataformas/p1',
    );

    const resumen = text(element.querySelector('app-summary-card'));
    expect(resumen).toContain('20 Casos totales');
    expect(resumen).toContain('$ 6.150.000 Monto afectado');
    expect(resumen).toContain('Última actualización');

    expect(text(element.querySelector('h2'))).toBe('Canales de recargas');
  });

  it('renderiza una tarjeta por canal que enlaza a su detalle', async () => {
    await navigate();
    flushAll();
    await harness.fixture.whenStable();

    const cards = [...element.querySelectorAll('app-status-card')];
    expect(cards.length).toBe(3);

    const [pagoEnCasa, , nequi] = cards;
    expect(text(pagoEnCasa)).toContain('Pago en Casa 10 Casos $ 4.800.000 Monto afectado');
    expect(pagoEnCasa.querySelector('a')?.getAttribute('href')).toBe(
      '/plataformas/p1/categorias/c1/canales/s1',
    );

    // Sin monto: solo muestra los casos.
    expect(text(nequi)).toContain('2 Casos');
    expect(text(nequi)).not.toContain('Monto afectado');
  });

  it('reutiliza la consulta de procesos hecha en la pantalla de plataforma', async () => {
    TestBed.inject(ProcesosService).getProcesos('p1').subscribe();
    http.expectOne((req) => req.url === PROCESOS_URL).flush(ok(PROCESOS));

    await navigate();
    http.expectOne(PROYECTOS_URL).flush(ok(PROYECTOS));
    http.expectNone((req) => req.url === PROCESOS_URL);
    http.expectOne((req) => req.url === SUBPROCESOS_URL).flush(ok(SUBPROCESOS));
    await harness.fixture.whenStable();

    expect(text(element.querySelector('h1'))).toBe('Recargas');
  });

  it('muestra el estado vacío cuando no hay canales', async () => {
    await navigate();
    flushAll({ casosTotales: 0, totalAfectado: 0, data: [] });
    await harness.fixture.whenStable();

    expect(element.textContent).toContain('No hay diferencias en esta categoría.');
  });

  it('muestra un error y reintenta solo la consulta fallida', async () => {
    await navigate();
    http.expectOne(PROYECTOS_URL).flush(ok(PROYECTOS));
    http.expectOne((req) => req.url === PROCESOS_URL).flush(ok(PROCESOS));
    http
      .expectOne((req) => req.url === SUBPROCESOS_URL)
      .flush(null, { status: 500, statusText: 'Server Error' });
    await harness.fixture.whenStable();

    expect(text(element.querySelector('[role="alert"]'))).toContain(
      'No pudimos cargar la información de la categoría.',
    );

    element.querySelector<HTMLButtonElement>('[role="alert"] button')!.click();
    harness.detectChanges();

    http.expectNone(PROYECTOS_URL);
    http.expectNone((req) => req.url === PROCESOS_URL);
    http.expectOne((req) => req.url === SUBPROCESOS_URL).flush(ok(SUBPROCESOS));
    await harness.fixture.whenStable();
    expect(element.querySelector('[role="alert"]')).toBeNull();
    expect(element.querySelectorAll('app-status-card').length).toBe(3);
  });
});
