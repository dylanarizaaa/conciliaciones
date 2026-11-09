import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
  type TestRequest,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { NavigationEnd, provideRouter, Router, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { filter, firstValueFrom } from 'rxjs';

import { API_BASE_URL } from '../../core/config/api-base-url';
import type { ProcesosResultado } from '../../core/data-access/proceso.model';
import type { ProyectosResultado } from '../../core/data-access/proyecto.model';
import type { SubprocesosResultado } from '../../core/data-access/subproceso.model';
import type { TablePage, TableRow, ViewTemplate } from '../../core/data-access/vista.model';
import type { ApiResponse } from '../../core/http/api-response';
import { DATOS_REGLA, PLANTILLA_REGLA } from '../../core/mock-backend/mock-backend.state';
import { Rule } from './rule';

const BASE = '/plataformas/p1/categorias/c1/canales/s1/reglas/Cambio%20de%20estado%20log%C3%ADstico';
const RULE_API = '/api/Conciliaciones/subprocesos/s1/reglas/Cambio%20de%20estado%20log%C3%ADstico';
const SELECT_ALL = 'button[aria-label="Seleccionar todas las diferencias de la página"]';

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

function pagina(overrides: Partial<TablePage> = {}): TablePage {
  return { ...DATOS_REGLA, ...overrides };
}

/** Filas de otra página: mismos datos con otros ids. */
function otrasFilas(): TableRow[] {
  return DATOS_REGLA.rows.map((row, index) => ({ ...row, idCaso: `CASO-P2-${index}` }));
}

const text = (element: Element | null | undefined) =>
  element?.textContent?.replace(/\s+/g, ' ').trim() ?? '';

describe('Rule', () => {
  let harness: RouterTestingHarness;
  let http: HttpTestingController;
  let element: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [
        provideRouter(
          [
            {
              path: 'plataformas/:proyectoId/categorias/:procesoId/canales/:subProcesoId/reglas/:regla',
              component: Rule,
            },
          ],
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

  async function navigate(url = BASE): Promise<void> {
    harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(url, Rule);
    element = harness.routeNativeElement!;
  }

  function flushNombres(): void {
    http.expectOne('/api/Conciliaciones/proyectos').flush(ok(PROYECTOS));
    http.expectOne((req) => req.url === '/api/Conciliaciones/procesos').flush(ok(PROCESOS));
    http.expectOne((req) => req.url === '/api/Conciliaciones/subprocesos').flush(ok(SUBPROCESOS));
  }

  function expectPlantilla(): TestRequest {
    return http.expectOne(`${RULE_API}/plantilla`);
  }

  function expectDatos(page = 1, sort: string | null = null): TestRequest {
    return http.expectOne(
      (req) =>
        req.method === 'GET' &&
        req.url === `${RULE_API}/casos` &&
        req.params.get('pageNumber') === String(page) &&
        req.params.get('pageSize') === '10' &&
        req.params.get('sort') === sort,
    );
  }

  /** Deja correr efectos y microtareas sin esperar las peticiones que siguen pendientes. */
  async function settle(): Promise<void> {
    for (let i = 0; i < 3; i++) {
      TestBed.tick();
      await Promise.resolve();
    }
    harness.detectChanges();
  }

  async function stable(): Promise<void> {
    await harness.fixture.whenStable();
    harness.detectChanges();
  }

  /** Carga completa: nombres, plantilla y la primera página de datos. */
  async function cargar(datos: TablePage = pagina()): Promise<void> {
    await navigate();
    flushNombres();
    expectPlantilla().flush(ok(PLANTILLA_REGLA));
    await settle();
    expectDatos().flush(ok(datos));
    await stable();
  }

  function nextNavigation(): Promise<unknown> {
    return firstValueFrom(
      TestBed.inject(Router).events.pipe(filter((event) => event instanceof NavigationEnd)),
    );
  }

  const button = (label: string) =>
    [...element.querySelectorAll('button')].find((candidate) => text(candidate) === label)!;
  const rowCheckbox = (cliente: string) =>
    element.querySelector<HTMLButtonElement>(
      `button[aria-label="Seleccionar la diferencia de ${cliente}"]`,
    )!;
  const contador = () => text(element.querySelector('p[aria-live="polite"]'));
  const mensajes = () => [...element.querySelectorAll('p[role="status"]')].map(text);

  it('muestra skeletons mientras llegan la plantilla y los datos', async () => {
    await navigate();

    expect(element.querySelector('app-page-header-skeleton')).not.toBeNull();
    expect(element.querySelector('app-summary-card-skeleton')).not.toBeNull();
    expect(element.querySelector('app-data-table')).toBeNull();

    flushNombres();
    expectPlantilla().flush(ok(PLANTILLA_REGLA));
    await settle();

    // Con la plantilla ya se conocen las columnas: encabezados reales y filas skeleton.
    expect(element.querySelectorAll('thead th')).toHaveLength(14);
    expect(element.querySelectorAll('tbody tr[aria-hidden="true"]')).toHaveLength(5);

    expectDatos().flush(ok(pagina()));
    await stable();
    expect(element.querySelectorAll('tbody tr:not([aria-hidden])')).toHaveLength(10);
  });

  it('pinta la regla según la plantilla: encabezado, resumen, columnas y celdas', async () => {
    await cargar();

    expect(text(element.querySelector('h1'))).toBe('Cambio de estado logístico');
    expect([...element.querySelectorAll('nav[aria-label="Ruta de navegación"] li')].map(text)).toEqual(
      ['Conciliaciones', 'Inter Pay', 'Recargas', 'Pago en Casa', 'Cambio de estado logístico'],
    );
    expect(text(element.querySelector('app-page-header p'))).toBe(
      'Resuelve las diferencias detectadas para esta regla',
    );
    expect(element.querySelector('a[aria-label="Volver a Pago en Casa"]')?.getAttribute('href')).toBe(
      '/plataformas/p1/categorias/c1/canales/s1',
    );

    const resumen = text(element.querySelector('app-summary-card'));
    expect(resumen).toContain('10 Casos');
    expect(resumen).toContain('$ 4.800.000 Monto afectado');
    expect(text(element.querySelector('h2'))).toBe('Diferencias por resolver');

    expect([...element.querySelectorAll('thead th')].map(text)).toEqual([
      '',
      'Nombre del cliente',
      'Identificación',
      'Número de bolsillo',
      'Número de guía',
      'ID Movimiento',
      'Fecha de transacción',
      'Estado logístico',
      'Monto Inter Pay',
      'Monto base de pagos',
      'Diferencia',
      'Motivo de diferencia',
      'Estado',
      'Acción',
    ]);

    const primera = [...element.querySelectorAll('tbody tr')[0].querySelectorAll('td')];
    expect(primera.slice(1, 13).map(text)).toEqual([
      'Juan Pablo Rodríguez',
      '1.045.678.902',
      '321-765-4322',
      '70002333336',
      '3452',
      '19/04/26 5:00 p.m.',
      'Entregado',
      '$ 1.200.000',
      '$ 15.000',
      '$ 900.000',
      'Recaudo duplicado PEC',
      'Pendiente',
    ]);

    const detalle = primera[13].querySelector('a')!;
    expect(text(detalle)).toBe('Ver detalle');
    expect(detalle.getAttribute('aria-label')).toBe(
      'Ver detalle de la diferencia de Juan Pablo Rodríguez',
    );
    expect(detalle.getAttribute('href')).toBe(`${BASE}/casos/CASO-3452`);

    expect(contador()).toBe('0 Seleccionados');
    expect(button('Resolver diferencias').disabled).toBe(true);
    expect(button('Descargar reporte').disabled).toBe(false);
    expect(mensajes()[0]).toBe('Página 1 de 1: 10 diferencias.');
  });

  it('selecciona filas y habilita "Resolver diferencias"', async () => {
    await cargar();
    const todas = element.querySelector<HTMLButtonElement>(SELECT_ALL)!;

    todas.click();
    await stable();
    expect(contador()).toBe('10 Seleccionados');
    expect(todas.getAttribute('aria-checked')).toBe('true');
    expect(button('Resolver diferencias').disabled).toBe(false);

    rowCheckbox('Juan Pablo Rodríguez').click();
    await stable();
    expect(contador()).toBe('9 Seleccionados');
    expect(todas.getAttribute('aria-checked')).toBe('mixed');
  });

  it('resuelve la selección: el botón queda cargando y al responder abre el modal de resultado', async () => {
    await cargar();
    rowCheckbox('Juan Pablo Rodríguez').click();
    rowCheckbox('Diego Alejandro Silva').click();
    await stable();
    expect(contador()).toBe('2 Seleccionados');

    const resolverBtn = button('Resolver diferencias');
    resolverBtn.click();
    harness.detectChanges();
    const resolver = http.expectOne(`${RULE_API}/casos/resolver`);
    expect(resolver.request.method).toBe('POST');
    expect(resolver.request.body).toEqual({ ids: ['CASO-3452', 'CASO-3453'] });

    // Cargando: conserva el texto y el foco, anuncia aria-busy e ignora más clics.
    expect(text(resolverBtn)).toBe('Resolver diferencias');
    expect(resolverBtn.getAttribute('aria-busy')).toBe('true');
    expect(resolverBtn.disabled).toBe(false);
    expect(resolverBtn.querySelector('ng-icon')).not.toBeNull();
    resolverBtn.click();
    http.expectNone(`${RULE_API}/casos/resolver`);
    expect(document.querySelector('[role="dialog"]')).toBeNull();

    resolver.flush(
      ok({ procesados: 2, pendientes: 0, validadoPor: 'Alexander Tipacoque', fechaValidacion: '2026-08-19' }),
    );
    await settle();
    expectDatos().flush(ok(pagina({ rows: DATOS_REGLA.rows.slice(2), totalRows: 8 })));
    await stable();

    // El dialog de spartan vive en el overlay de CDK, fuera del componente.
    const dialog = document.querySelector<HTMLElement>('[role="dialog"]')!;
    expect(dialog).not.toBeNull();
    expect(text(document.getElementById(dialog.getAttribute('aria-labelledby')!))).toBe(
      'Conciliación procesada',
    );
    expect(text(document.getElementById(dialog.getAttribute('aria-describedby')!))).toBe(
      'Los casos resueltos saldrán de la pantalla. Aquellos que requieran una nueva validación permanecerán en estado Pendiente.',
    );
    expect(
      [...dialog.querySelectorAll('dl > div')].map((item) => [
        text(item.querySelector('dt')),
        text(item.querySelector('dd')),
      ]),
    ).toEqual([
      ['Validado por:', 'Alexander Tipacoque'],
      ['Fecha de validación:', '19/08/2026'],
    ]);
    expect(dialog.querySelector('[aria-label="Cerrar"]')).not.toBeNull();
    expect(resolverBtn.hasAttribute('aria-busy')).toBe(false);
    expect(contador()).toBe('0 Seleccionados');
    expect(element.querySelectorAll('tbody tr')).toHaveLength(8);

    const volver = [...dialog.querySelectorAll('button')].find((b) => text(b) === 'Volver a la lista')!;
    volver.click();
    await stable();
    await new Promise((resolve) => setTimeout(resolve, 200));
    harness.detectChanges();
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    // Al volver a la lista, el foco queda en su título.
    expect(document.activeElement?.id).toBe('diferencias-title');
  });

  it('sin modal en la plantilla, anuncia el resultado con el mensaje de la acción', async () => {
    const [resolver] = PLANTILLA_REGLA.actions!;
    const sinModal: ViewTemplate = {
      ...PLANTILLA_REGLA,
      actions: [{ ...resolver, successDialog: undefined } as typeof resolver],
    };
    await navigate();
    flushNombres();
    expectPlantilla().flush(ok(sinModal));
    await settle();
    expectDatos().flush(ok(pagina()));
    await stable();

    rowCheckbox('Juan Pablo Rodríguez').click();
    await stable();
    button('Resolver diferencias').click();
    http.expectOne(`${RULE_API}/casos/resolver`).flush(ok({ procesados: 1 }));
    await settle();
    expectDatos().flush(ok(pagina()));
    await stable();

    expect(document.querySelector('[role="dialog"]')).toBeNull();
    expect(mensajes()[1]).toBe('Enviamos a resolver las diferencias seleccionadas (1).');
  });

  it('muestra el error de una acción y permite reintentarla', async () => {
    await cargar();
    rowCheckbox('Juan Pablo Rodríguez').click();
    await stable();

    button('Resolver diferencias').click();
    http
      .expectOne(`${RULE_API}/casos/resolver`)
      .flush(null, { status: 500, statusText: 'Server Error' });
    await stable();

    const error = element.querySelector('app-error-state');
    expect(error?.getAttribute('role')).toBe('alert');
    expect(text(error)).toContain('No pudimos completar "Resolver diferencias".');
    expect(contador()).toBe('1 Seleccionado');

    button('Reintentar').click();
    http.expectOne(`${RULE_API}/casos/resolver`).flush(ok({ procesados: 1 }));
    await settle();
    expectDatos().flush(ok(pagina()));
    await stable();
    expect(element.querySelector('app-error-state')).toBeNull();
  });

  it('ordena en el servidor desde el encabezado y guarda el orden en la URL', async () => {
    await cargar();
    const nombre = [...element.querySelectorAll('thead th')][1];
    expect(nombre.getAttribute('aria-sort')).toBe('none');

    const navegacion = nextNavigation();
    nombre.querySelector('button')!.click();
    await navegacion;
    await settle();

    expect(TestBed.inject(Router).url).toBe(`${BASE}?orden=nombreCliente:asc`);
    expectDatos(1, 'nombreCliente:asc').flush(ok(pagina()));
    await stable();
    expect(nombre.getAttribute('aria-sort')).toBe('ascending');
    // Las columnas sin orden (checks, acción) no anuncian aria-sort.
    expect([...element.querySelectorAll('thead th')][13].hasAttribute('aria-sort')).toBe(false);
  });

  it('pagina en el servidor y conserva la selección entre páginas', async () => {
    await cargar(pagina({ totalRows: 20, totalPages: 2 }));
    element.querySelector<HTMLButtonElement>(SELECT_ALL)!.click();
    await stable();
    expect(contador()).toBe('10 Seleccionados');

    const navegacion = nextNavigation();
    element.querySelector<HTMLButtonElement>('button[aria-label="Página siguiente"]')!.click();
    await navegacion;
    await settle();
    expect(TestBed.inject(Router).url).toBe(`${BASE}?pagina=2`);
    expectDatos(2).flush(ok(pagina({ pageNumber: 2, totalRows: 20, totalPages: 2, rows: otrasFilas() })));
    await stable();

    expect(contador()).toBe('10 Seleccionados');
    expect(element.querySelector(SELECT_ALL)?.getAttribute('aria-checked')).toBe('false');
    rowCheckbox('Juan Pablo Rodríguez').click();
    await stable();
    expect(contador()).toBe('11 Seleccionados');
  });

  it('descarga el reporte con el nombre de la plantilla', async () => {
    const createObjectURL = vi.fn(() => 'blob:reporte');
    const revokeObjectURL = vi.fn();
    Object.defineProperty(window.URL, 'createObjectURL', { configurable: true, value: createObjectURL });
    Object.defineProperty(window.URL, 'revokeObjectURL', { configurable: true, value: revokeObjectURL });
    const descargas: string[] = [];
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(function (this: HTMLAnchorElement) {
        descargas.push(this.download);
      });

    try {
      await cargar();
      button('Descargar reporte').click();
      const reporte = http.expectOne(`${RULE_API}/casos/reporte`);
      expect(reporte.request.responseType).toBe('blob');
      reporte.flush(new Blob(['Nombre del cliente;Estado'], { type: 'text/csv' }));
      await stable();

      expect(createObjectURL).toHaveBeenCalledTimes(1);
      // Sin tildes ni espacios: Chromium ignora `download` con caracteres no ASCII.
      expect(descargas).toEqual(['diferencias-cambio-de-estado-logistico.csv']);
      expect(mensajes()[1]).toBe('Descargamos el archivo diferencias-cambio-de-estado-logistico.csv.');
    } finally {
      click.mockRestore();
      delete (window.URL as { createObjectURL?: unknown }).createObjectURL;
      delete (window.URL as { revokeObjectURL?: unknown }).revokeObjectURL;
    }
  });

  it('muestra el estado vacío definido en la plantilla', async () => {
    await cargar(pagina({ totalRows: 0, totalPages: 0, rows: [], summary: { casosTotales: 0, montoAfectado: 0 } }));

    expect([...element.querySelectorAll('app-empty-state p')].map(text)).toEqual([
      'No hay diferencias por resolver en esta regla.',
      'Cuando se detecten diferencias aparecerán aquí.',
    ]);
    expect(element.querySelector('app-data-table')).toBeNull();
    expect(element.querySelector('app-paginator')).toBeNull();
  });

  it('muestra un error si la plantilla es de una versión no soportada y permite reintentar', async () => {
    await navigate();
    flushNombres();
    expectPlantilla().flush(ok({ ...PLANTILLA_REGLA, schemaVersion: '2.0.0' } satisfies ViewTemplate));
    await stable();

    const error = element.querySelector('app-error-state');
    expect(text(error)).toContain('No pudimos cargar las diferencias de esta regla.');

    button('Reintentar').click();
    await settle();
    expectPlantilla().flush(ok(PLANTILLA_REGLA));
    await settle();
    expectDatos().flush(ok(pagina()));
    await stable();
    expect(element.querySelector('app-error-state')).toBeNull();
    expect(element.querySelectorAll('tbody tr')).toHaveLength(10);
  });
});
