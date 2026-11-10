import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
  type TestRequest,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { NavigationEnd, provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { filter, firstValueFrom } from 'rxjs';

import { API_BASE_URL } from '../../core/config/api-base-url';
import type { ProcesosResultado } from '../../core/data-access/proceso.model';
import type { ProyectosResultado } from '../../core/data-access/proyecto.model';
import type { ReglasPagina, ReglasResultado } from '../../core/data-access/regla.model';
import type { SubprocesosResultado } from '../../core/data-access/subproceso.model';
import type { ApiResponse } from '../../core/http/api-response';
import { Channel } from './channel';

const BASE = '/plataformas/p1/categorias/c1/canales/s1';
const REGLAS_URL = '/api/Conciliaciones/subprocesos/reglas/s1';

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
  data: [{ proyectoId: 'p1', nombreProyecto: 'Inter Pay', monto: 0, cantidad: 0 }],
};
const PROCESOS: ProcesosResultado = {
  casosTotales: 0,
  totalAfectado: 0,
  data: [{ procesoId: 'c1', nombreProceso: 'Recargas', monto: 0, cantidad: 20 }],
};
const SUBPROCESOS: SubprocesosResultado = {
  casosTotales: 0,
  totalAfectado: 0,
  data: [{ subProcesoId: 's1', nombreSubProceso: 'Pago en Casa', monto: 0, cantidad: 10 }],
};

function pagina(overrides: Partial<ReglasPagina> = {}): ReglasResultado {
  return {
    data: {
      casosTotales: 10,
      montoAfectado: 4800000,
      pageNumber: 1,
      pageSize: 10,
      totalPages: 3,
      data: [
        { nombre: 'Cambio de estado logístico', casos: 10, monto: 32000 },
        { nombre: 'Sin recaudo PEC', casos: 1, monto: 20030 },
        { nombre: 'Error de estado logístico', casos: 15, monto: 100012 },
      ],
      ...overrides,
    },
  };
}

const text = (element: Element | null | undefined) =>
  element?.textContent?.replace(/\s+/g, ' ').trim() ?? '';

describe('Channel', () => {
  let harness: RouterTestingHarness;
  let http: HttpTestingController;
  let element: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [
        provideRouter(
          [
            {
              path: 'plataformas/:proyectoId/categorias/:procesoId/canales/:subProcesoId',
              component: Channel,
            },
          ],
        ),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: '/api' },
      ],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  async function navigate(url = BASE): Promise<void> {
    harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(url, Channel);
    element = harness.routeNativeElement!;
  }

  function flushNombres(): void {
    http.expectOne('/api/Conciliaciones/proyectos').flush(ok(PROYECTOS));
    http.expectOne((req) => req.url === '/api/Conciliaciones/procesos').flush(ok(PROCESOS));
    http.expectOne((req) => req.url === '/api/Conciliaciones/subprocesos').flush(ok(SUBPROCESOS));
  }

  function expectReglas(page: number): TestRequest {
    return http.expectOne(
      (req) =>
        req.url === REGLAS_URL &&
        req.params.get('pageNumber') === String(page) &&
        req.params.get('pageSize') === '10',
    );
  }

  /** Promesa de la próxima navegación (no se usa whenStable: la petición queda pendiente a propósito). */
  function nextNavigation(): Promise<unknown> {
    return firstValueFrom(
      TestBed.inject(Router).events.pipe(filter((event) => event instanceof NavigationEnd)),
    );
  }

  async function stable(): Promise<void> {
    await harness.fixture.whenStable();
    harness.detectChanges();
  }

  const rowNames = () =>
    [...element.querySelectorAll('tbody tr')].map((tr) => text(tr.querySelector('td')));

  it('muestra skeletons y los encabezados de la tabla mientras carga', async () => {
    await navigate();

    expect(element.querySelector('app-page-header-skeleton')).not.toBeNull();
    expect(element.querySelector('app-summary-card-skeleton')).not.toBeNull();
    const headers = [...element.querySelectorAll('th')].map((th) => text(th));
    expect(headers).toEqual(['Nombre de la regla', 'Número de casos', 'Monto afectado', 'Acción']);
    expect(element.querySelectorAll('tbody tr[aria-hidden="true"]').length).toBe(5);

    flushNombres();
    expectReglas(1).flush(ok(pagina()));
  });

  it('muestra el canal con su ruta, resumen y reglas', async () => {
    await navigate();
    flushNombres();
    expectReglas(1).flush(ok(pagina()));
    await stable();

    expect(text(element.querySelector('h1'))).toBe('Pago en Casa');
    expect([...element.querySelectorAll('nav[aria-label="Ruta de navegación"] li')].map(text)).toEqual(
      ['Conciliaciones', 'Inter Pay', 'Recargas', 'Pago en Casa'],
    );
    expect(text(element.querySelector('app-page-header p'))).toBe(
      'Gestiona las diferencias detectadas en cada regla de recargas de Pago en Casa',
    );
    expect(element.querySelector('a[aria-label="Volver a Recargas"]')?.getAttribute('href')).toBe(
      '/plataformas/p1/categorias/c1',
    );

    const resumen = text(element.querySelector('app-summary-card'));
    expect(resumen).toContain('10 Casos totales');
    expect(resumen).toContain('$ 4.800.000 Monto afectado');

    const primeraFila = [...element.querySelectorAll('tbody tr')[0].querySelectorAll('td')].map(text);
    expect(primeraFila.slice(0, 3)).toEqual(['Cambio de estado logístico', '10', '$ 32.000']);

    const gestionar = element.querySelector<HTMLAnchorElement>('tbody tr a')!;
    expect(text(gestionar)).toBe('Gestionar Cambio de estado logístico');
    expect(gestionar.getAttribute('href')).toBe(
      `${BASE}/reglas/Cambio%20de%20estado%20log%C3%ADstico`,
    );
  });

  it('ordena las filas desde el encabezado y lo anuncia con aria-sort', async () => {
    await navigate();
    flushNombres();
    expectReglas(1).flush(ok(pagina()));
    await stable();

    const [nombreTh, casosTh, , accionTh] = [...element.querySelectorAll('th')];
    expect(nombreTh.getAttribute('aria-sort')).toBe('none');
    expect(accionTh.hasAttribute('aria-sort')).toBe(false);
    expect(accionTh.querySelector('button')).toBeNull();

    nombreTh.querySelector('button')!.click();
    await stable();
    expect(nombreTh.getAttribute('aria-sort')).toBe('ascending');
    expect(rowNames()).toEqual([
      'Cambio de estado logístico',
      'Error de estado logístico',
      'Sin recaudo PEC',
    ]);

    casosTh.querySelector('button')!.click();
    await stable();
    expect(nombreTh.getAttribute('aria-sort')).toBe('none');
    const casos = [...element.querySelectorAll('tbody tr')].map((tr) =>
      Number(text(tr.querySelectorAll('td')[1])),
    );
    const sentido = casosTh.getAttribute('aria-sort');
    const esperado = [...casos].sort((a, b) => (sentido === 'ascending' ? a - b : b - a));
    expect(sentido).not.toBe('none');
    expect(casos).toEqual(esperado);
  });

  it('pagina en el servidor y conserva la página en la URL', async () => {
    await navigate();
    flushNombres();
    expectReglas(1).flush(ok(pagina()));
    await stable();

    const [anterior, siguiente] = [...element.querySelectorAll<HTMLButtonElement>('app-paginator button')];
    expect(text(element.querySelector('app-paginator'))).toContain('de 3');
    expect(anterior.disabled).toBe(true);
    expect(siguiente.disabled).toBe(false);

    const navegacion = nextNavigation();
    siguiente.click();
    await navegacion;
    expect(TestBed.inject(Router).url).toBe(`${BASE}?pagina=2`);

    // Mientras carga, el resumen se mantiene y la tabla muestra filas skeleton.
    harness.detectChanges();
    expect(text(element.querySelector('app-summary-card'))).toContain('10 Casos totales');
    expect(element.querySelectorAll('tbody tr[aria-hidden="true"]').length).toBe(3);

    expectReglas(2).flush(
      ok(pagina({ pageNumber: 2, data: [{ nombre: 'Solicitud incompleta', casos: 12, monto: 20030 }] })),
    );
    await stable();
    expect(rowNames()).toEqual(['Solicitud incompleta']);
    expect(element.querySelector<HTMLInputElement>('app-paginator input')!.value).toBe('2');
    expect(element.querySelectorAll<HTMLButtonElement>('app-paginator button')[0].disabled).toBe(false);
  });

  it('salta a la página escrita en el campo', async () => {
    await navigate();
    flushNombres();
    expectReglas(1).flush(ok(pagina()));
    await stable();

    const input = element.querySelector<HTMLInputElement>('app-paginator input')!;
    input.value = '7';
    input.dispatchEvent(new Event('input'));
    const navegacion = nextNavigation();
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    await navegacion;

    // 7 excede el total (3): se acota a la última página.
    expect(TestBed.inject(Router).url).toBe(`${BASE}?pagina=3`);
    harness.detectChanges();
    expectReglas(3).flush(ok(pagina({ pageNumber: 3 })));
    await stable();
  });

  it('muestra el estado vacío cuando el canal no tiene reglas', async () => {
    await navigate();
    flushNombres();
    expectReglas(1).flush(ok(pagina({ totalPages: 0, data: [] })));
    await stable();

    expect(element.textContent).toContain('No hay reglas con diferencias en este canal.');
    expect(element.querySelector('app-paginator')).toBeNull();
  });

  it('muestra un error y reintenta la consulta de reglas', async () => {
    await navigate();
    flushNombres();
    expectReglas(1).flush(null, { status: 500, statusText: 'Server Error' });
    await stable();

    expect(text(element.querySelector('[role="alert"]'))).toContain(
      'No pudimos cargar las reglas de este canal.',
    );

    element.querySelector<HTMLButtonElement>('[role="alert"] button')!.click();
    harness.detectChanges();
    expectReglas(1).flush(ok(pagina()));
    await stable();
    expect(element.querySelector('[role="alert"]')).toBeNull();
    expect(element.querySelectorAll('tbody tr').length).toBe(3);
  });
});
