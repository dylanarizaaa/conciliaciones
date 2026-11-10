import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { API_BASE_URL } from '../../core/config/api-base-url';
import type { ProcesosResultado } from '../../core/data-access/proceso.model';
import type { ProyectosResultado } from '../../core/data-access/proyecto.model';
import type { ApiResponse } from '../../core/http/api-response';
import { Platform } from './platform';

const PROYECTOS_URL = '/api/Conciliaciones/proyectos';
const PROCESOS_URL = '/api/Conciliaciones/procesos';

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
  data: [
    { procesoId: 'recargas', nombreProceso: 'Recargas', monto: 6150000, cantidad: 20 },
    { procesoId: 'transferencias', nombreProceso: 'Transferencias', monto: 0, cantidad: 0 },
    { procesoId: 'cliente', nombreProceso: 'Datos del cliente', monto: null, cantidad: 10 },
  ],
};

describe('Platform', () => {
  let harness: RouterTestingHarness;
  let http: HttpTestingController;
  let element: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [
        provideRouter(
          [{ path: 'plataformas/:proyectoId', component: Platform }],
        ),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: '/api' },
      ],
    }).compileComponents();

    // Navega a la ruta real para probar el binding de `:proyectoId` y los enlaces relativos.
    harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/plataformas/p1', Platform);
    http = TestBed.inject(HttpTestingController);
    element = harness.routeNativeElement!;
  });

  afterEach(() => http.verify());

  function flushAll(procesos: ProcesosResultado = PROCESOS): void {
    http.expectOne(PROYECTOS_URL).flush(ok(PROYECTOS));
    http
      .expectOne((req) => req.url === PROCESOS_URL && req.params.get('proyectoId') === 'p1')
      .flush(ok(procesos));
  }

  it('muestra skeletons mientras carga', () => {
    expect(element.querySelector('app-page-header-skeleton')).not.toBeNull();
    expect(element.querySelector('app-summary-card-skeleton')).not.toBeNull();
    expect(element.querySelectorAll('app-difference-card-skeleton').length).toBe(3);

    flushAll();
  });

  it('muestra el nombre de la plataforma, la ruta de navegación y los totales', async () => {
    flushAll();
    await harness.fixture.whenStable();

    expect(element.querySelector('h1')?.textContent?.trim()).toBe('Inter Pay');
    const crumbs = [...element.querySelectorAll('nav li')].map((li) => li.textContent?.trim());
    expect(crumbs).toEqual(['Conciliaciones', 'Inter Pay']);
    // "Conciliaciones" y la flecha de regreso vuelven al listado de plataformas.
    expect(element.querySelector('nav a[href="/"]')).not.toBeNull();
    expect(element.querySelector('a[aria-label="Volver a Conciliaciones"]')?.getAttribute('href')).toBe(
      '/',
    );

    const resumen = element.querySelector('app-summary-card')?.textContent?.replace(/\s+/g, ' ');
    expect(resumen).toContain('50 Casos totales');
    expect(resumen).toContain('$ 13.570.000 Monto afectado');

    // "Última actualización" = hora en que llegó la respuesta de procesos.
    const time = element.querySelector('app-summary-card time');
    expect(time?.textContent).toContain('Última actualización');
    const consultadoEn = new Date(time!.getAttribute('datetime')!);
    expect(Date.now() - consultadoEn.getTime()).toBeLessThan(5000);
  });

  it('renderiza una tarjeta por categoría según la respuesta', async () => {
    flushAll();
    await harness.fixture.whenStable();

    const cards = [...element.querySelectorAll('app-difference-card')];
    expect(cards.length).toBe(3);

    const [recargas, transferencias, cliente] = cards;
    expect(recargas.textContent?.replace(/\s+/g, ' ')).toContain('$ 6.150.000');
    expect(recargas.querySelector('a')?.getAttribute('href')).toBe(
      '/plataformas/p1/categorias/recargas',
    );

    // Sin casos: inactiva y sin enlace.
    expect(transferencias.getAttribute('data-inactive')).toBe('true');
    expect(transferencias.querySelector('a, button')).toBeNull();

    // Sin monto: solo muestra los casos.
    expect(cliente.textContent).toContain('10');
    expect(cliente.textContent).not.toContain('Monto afectado');
  });

  it('muestra el estado vacío cuando no hay categorías', async () => {
    flushAll({ casosTotales: 0, totalAfectado: 0, data: [] });
    await harness.fixture.whenStable();

    expect(element.textContent).toContain('No hay diferencias en esta plataforma.');
  });

  it('muestra el error si la plataforma no existe, sin romper la página', async () => {
    http.expectOne(PROYECTOS_URL).flush(ok({ data: [] }));
    http.expectOne((req) => req.url === PROCESOS_URL).flush(ok(PROCESOS));
    await harness.fixture.whenStable();

    expect(element.querySelector('h1')?.textContent?.trim()).toBe('Plataforma');
    expect(element.querySelector('[role="alert"]')?.textContent).toContain(
      'No pudimos cargar la información de la plataforma.',
    );
  });

  it('muestra un error y reintenta solo la consulta fallida', async () => {
    http.expectOne(PROYECTOS_URL).flush(ok(PROYECTOS));
    http
      .expectOne((req) => req.url === PROCESOS_URL)
      .flush(null, { status: 500, statusText: 'Server Error' });
    await harness.fixture.whenStable();

    expect(element.querySelector('[role="alert"]')?.textContent).toContain(
      'No pudimos cargar la información de la plataforma.',
    );

    element.querySelector<HTMLButtonElement>('[role="alert"] button')!.click();
    harness.detectChanges();

    http.expectNone(PROYECTOS_URL);
    http.expectOne((req) => req.url === PROCESOS_URL).flush(ok(PROCESOS));
    await harness.fixture.whenStable();
    expect(element.querySelector('[role="alert"]')).toBeNull();
    expect(element.querySelectorAll('app-difference-card').length).toBe(3);
  });
});
