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
import type { SubprocesosResultado } from '../../core/data-access/subproceso.model';
import type {
  RegistrosPagina,
  TableRow,
  ViewTemplate,
} from '../../core/data-access/vista.model';
import type { ApiResponse } from '../../core/http/api-response';
import { formatDateTime } from '../../core/format/formatters';
import cambioEstadoEjemplo from '../../../../docs/contrato-vista/ejemplos/cambio-estado.response.json';
import plantillaBack from '../../../../docs/contrato-vista/ejemplos/back/plantilla-regla.response.json';
import plantillaEjemplo from '../../../../docs/contrato-vista/ejemplos/plantilla.response.json';
import registrosEjemplo from '../../../../docs/contrato-vista/ejemplos/registros.response.json';
import reporteEjemplo from '../../../../docs/contrato-vista/ejemplos/reporte.response.json';
import type {
  ReglasPagina,
  ReporteRespuesta,
  ResolucionDiferencias,
} from '../../core/data-access/regla.model';
import { Rule } from './rule';

/** Respuestas de ejemplo que debe devolver el back (`docs/contrato-vista/ejemplos`, forma del swagger). */
const PLANTILLA_REGLA = (plantillaEjemplo as unknown as ApiResponse<ViewTemplate>).resultado;
/** Plantilla tal como la devuelve hoy el back (`docs/contrato-vista/ejemplos/back`). */
const PLANTILLA_BACK = (plantillaBack as unknown as ApiResponse<ViewTemplate>).resultado;
const DATOS_REGLA = (registrosEjemplo as unknown as ApiResponse<RegistrosPagina>).resultado;
const FILAS = DATOS_REGLA.data as TableRow[];
const RESOLUCION = (cambioEstadoEjemplo as unknown as ApiResponse<ResolucionDiferencias>).resultado;
const REPORTE = (reporteEjemplo as unknown as ApiResponse<ReporteRespuesta>).resultado;

const REGLA_ID = 'r-cambio';
const BASE = `/plataformas/p1/categorias/c1/canales/s1/reglas/${REGLA_ID}`;
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
/** Listado de reglas del canal: de ahí sale el nombre de la regla (la URL trae su id). */
const REGLAS: ReglasPagina = {
  casosTotales: 10,
  montoAfectado: 4800000,
  pageNumber: 1,
  pageSize: 50,
  totalPages: 1,
  data: [{ idRegla: REGLA_ID, nombreRegla: 'Cambio de estado logístico', casos: 10, monto: 4800000 }],
};

function pagina(overrides: Partial<RegistrosPagina> = {}): RegistrosPagina {
  return { ...DATOS_REGLA, ...overrides };
}

/** Filas de otra página: mismos datos con otros ids. */
function otrasFilas(): TableRow[] {
  return FILAS.map((row, index) => ({ ...row, conciliacionId: `p2-${index}` }));
}

const idDe = (cliente: string) =>
  FILAS.find(
    (row) => (row['fuentePrepagoDetalleCliente'] as { nombreCompleto: string }).nombreCompleto === cliente,
  )!['conciliacionId'] as string;

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
              path: 'plataformas/:proyectoId/categorias/:procesoId/canales/:subProcesoId/reglas/:reglaId',
              component: Rule,
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
    await harness.navigateByUrl(url, Rule);
    element = harness.routeNativeElement!;
  }

  function flushNombres(): void {
    http.expectOne('/api/Conciliaciones/proyectos').flush(ok(PROYECTOS));
    http.expectOne((req) => req.url === '/api/Conciliaciones/procesos').flush(ok(PROCESOS));
    http.expectOne((req) => req.url === '/api/Conciliaciones/subprocesos').flush(ok(SUBPROCESOS));
    http
      .expectOne(
        (req) =>
          req.url === '/api/Conciliaciones/subprocesos/reglas' &&
          req.params.get('subProcesoId') === 's1' &&
          req.params.get('pageNumber') === '1',
      )
      .flush(ok(REGLAS));
  }

  /** `GET /Conciliaciones/subprocesos-ui/plantilla?reglaId=&tipoBlock=1`. */
  function expectPlantilla(): TestRequest {
    return http.expectOne(
      (req) =>
        req.url === '/api/Conciliaciones/subprocesos-ui/plantilla' &&
        req.params.get('reglaId') === REGLA_ID &&
        req.params.get('tipoBlock') === '1',
    );
  }

  /** `GET /Conciliaciones/subprocesos-registros/reglas` (ruta y `reglaId` los declara la plantilla). */
  function expectDatos(page = 1): TestRequest {
    return http.expectOne(
      (req) =>
        req.method === 'GET' &&
        req.url === '/api/Conciliaciones/subprocesos-registros/reglas' &&
        req.params.get('reglaId') === REGLA_ID &&
        req.params.get('pageNumber') === String(page) &&
        req.params.get('pageSize') === '10' &&
        // El swagger no admite orden: con `sorting.mode: "client"` no se envía.
        !req.params.has('sort'),
    );
  }

  const CAMBIO_ESTADO = '/api/Conciliaciones/cambio-estado';

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
  async function cargar(datos: RegistrosPagina = pagina()): Promise<void> {
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
    expect(detalle.getAttribute('href')).toBe(`${BASE}/casos/${idDe('Juan Pablo Rodríguez')}`);

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
    const resolver = http.expectOne(CAMBIO_ESTADO);
    expect(resolver.request.method).toBe('PUT');
    expect(resolver.request.body).toEqual({
      conciliacionId: [idDe('Juan Pablo Rodríguez'), idDe('Diego Alejandro Silva')],
    });

    // Cargando: conserva el texto y el foco, anuncia aria-busy e ignora más clics.
    expect(text(resolverBtn)).toBe('Resolver diferencias');
    expect(resolverBtn.getAttribute('aria-busy')).toBe('true');
    expect(resolverBtn.disabled).toBe(false);
    expect(resolverBtn.querySelector('ng-icon')).not.toBeNull();
    resolverBtn.click();
    http.expectNone(CAMBIO_ESTADO);
    expect(document.querySelector('[role="dialog"]')).toBeNull();

    resolver.flush(ok(RESOLUCION));
    await settle();
    expectDatos().flush(ok(pagina({ data: FILAS.slice(2), totalCount: 8 })));
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
      // El swagger no trae quién validó ni cuándo: la fecha es la de la respuesta.
      ['Fecha de validación:', formatDateTime(new Date(), { dateStyle: 'medium' })],
      ['Casos actualizados:', '2'],
      ['Casos no encontrados:', '1'],
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

  it('sin columna de checks en la plantilla, "Resolver diferencias" queda deshabilitado y se avisa', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const [bloque] = PLANTILLA_REGLA.blocks;
    if (bloque.type !== 'table') {
      throw new Error('El bloque del ejemplo de la regla debe ser una tabla.');
    }
    const sinSeleccion: ViewTemplate = {
      ...PLANTILLA_REGLA,
      blocks: [
        {
          ...bloque,
          table: {
            ...bloque.table,
            selection: undefined,
            columns: bloque.table.columns.filter((column) => column.id !== 'seleccion'),
          },
        },
      ],
    };
    try {
      await navigate();
      flushNombres();
      expectPlantilla().flush(ok(sinSeleccion));
      await settle();
      expectDatos().flush(ok(pagina()));
      await stable();

      expect(element.querySelector('button[role="checkbox"]')).toBeNull();
      expect(element.querySelector('p[aria-live="polite"]')).toBeNull();
      const resolver = button('Resolver diferencias');
      expect(resolver.disabled).toBe(true);
      resolver.click();
      http.expectNone(CAMBIO_ESTADO);
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('no trae selección de filas'));
      // La descarga no depende de la selección.
      expect(button('Descargar reporte').disabled).toBe(false);
    } finally {
      warn.mockRestore();
    }
  });

  it('muestra el error de una acción y permite reintentarla', async () => {
    await cargar();
    rowCheckbox('Juan Pablo Rodríguez').click();
    await stable();

    button('Resolver diferencias').click();
    http.expectOne(CAMBIO_ESTADO).flush(null, { status: 500, statusText: 'Server Error' });
    await stable();

    const error = element.querySelector('app-error-state');
    expect(error?.getAttribute('role')).toBe('alert');
    expect(text(error)).toContain('No pudimos completar "Resolver diferencias".');
    expect(contador()).toBe('1 Seleccionado');

    button('Reintentar').click();
    http
      .expectOne(CAMBIO_ESTADO)
      .flush(ok({ actualizados: [idDe('Juan Pablo Rodríguez')], noEncontrados: [], totalProcesados: 1 }));
    await settle();
    expectDatos().flush(ok(pagina()));
    await stable();
    expect(element.querySelector('app-error-state')).toBeNull();
  });

  it('ordena la página en el navegador (el swagger no admite orden) y guarda el orden en la URL', async () => {
    await cargar();
    const nombre = [...element.querySelectorAll('thead th')][1];
    expect(nombre.getAttribute('aria-sort')).toBe('none');

    const navegacion = nextNavigation();
    nombre.querySelector('button')!.click();
    await navegacion;
    await stable();

    expect(TestBed.inject(Router).url).toBe(`${BASE}?orden=nombreCliente:asc`);
    // `afterEach` comprueba que no se volvió a pedir la página.
    expect(nombre.getAttribute('aria-sort')).toBe('ascending');
    const nombres = [...element.querySelectorAll('tbody tr')].map((fila) =>
      text(fila.querySelectorAll('td')[1]),
    );
    expect(nombres).toEqual(
      [...nombres].sort((a, b) => (a.toLowerCase() < b.toLowerCase() ? -1 : a.toLowerCase() > b.toLowerCase() ? 1 : 0)),
    );
    expect(nombres[0]).not.toBe('Juan Pablo Rodríguez');
    // Las columnas sin orden (checks, acción) no anuncian aria-sort.
    expect([...element.querySelectorAll('thead th')][13].hasAttribute('aria-sort')).toBe(false);
  });

  it('pagina en el servidor y conserva la selección entre páginas', async () => {
    await cargar(pagina({ totalCount: 20, totalPages: 2 }));
    element.querySelector<HTMLButtonElement>(SELECT_ALL)!.click();
    await stable();
    expect(contador()).toBe('10 Seleccionados');

    const navegacion = nextNavigation();
    element.querySelector<HTMLButtonElement>('button[aria-label="Página siguiente"]')!.click();
    await navegacion;
    await settle();
    expect(TestBed.inject(Router).url).toBe(`${BASE}?pagina=2`);
    expectDatos(2).flush(ok(pagina({ pageNumber: 2, totalCount: 20, totalPages: 2, data: otrasFilas() })));
    await stable();

    expect(contador()).toBe('10 Seleccionados');
    expect(element.querySelector(SELECT_ALL)?.getAttribute('aria-checked')).toBe('false');
    rowCheckbox('Juan Pablo Rodríguez').click();
    await stable();
    expect(contador()).toBe('11 Seleccionados');
  });

  it('descarga el Excel del back con el nombre que propone', async () => {
    const blobs: Blob[] = [];
    const createObjectURL = jest.fn((blob: Blob) => {
      blobs.push(blob);
      return 'blob:reporte';
    });
    const revokeObjectURL = jest.fn();
    Object.defineProperty(window.URL, 'createObjectURL', { configurable: true, value: createObjectURL });
    Object.defineProperty(window.URL, 'revokeObjectURL', { configurable: true, value: revokeObjectURL });
    const descargas: string[] = [];
    const click = jest
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(function (this: HTMLAnchorElement) {
        descargas.push(this.download);
      });

    try {
      await cargar();
      button('Descargar reporte').click();
      const reporte = http.expectOne(
        (req) => req.url === '/api/Informes/export-excel' && req.params.get('reglaId') === REGLA_ID,
      );
      reporte.flush(ok(REPORTE));
      await stable();

      expect(createObjectURL).toHaveBeenCalledTimes(1);
      expect(blobs[0].type).toBe(REPORTE.contentType);
      // El base64 se decodifica a los bytes del archivo.
      expect(blobs[0].size).toBe(atob(REPORTE.archivoBase64!).length);
      expect(descargas).toEqual(['diferencias-cambio-de-estado-logistico.xlsx']);
      expect(mensajes()[1]).toBe('Descargamos el archivo diferencias-cambio-de-estado-logistico.xlsx.');

      // Sin nombre del back, se arma con el de la regla (sin tildes ni espacios).
      button('Descargar reporte').click();
      http
        .expectOne((req) => req.url === '/api/Informes/export-excel')
        .flush(ok({ ...REPORTE, nombreArchivo: null }));
      await stable();
      expect(descargas[1]).toBe('diferencias-cambio-de-estado-logistico.xlsx');
    } finally {
      click.mockRestore();
      delete (window.URL as { createObjectURL?: unknown }).createObjectURL;
      // La URL se libera 1 s después de la descarga: queda un stub para ese temporizador.
      Object.defineProperty(window.URL, 'revokeObjectURL', { configurable: true, value: () => undefined });
    }
  });

  it('si el reporte llega vacío, muestra el error de la acción', async () => {
    await cargar();
    button('Descargar reporte').click();
    http
      .expectOne((req) => req.url === '/api/Informes/export-excel')
      .flush(ok({ archivoBase64: null, nombreArchivo: null, contentType: null }));
    await stable();

    expect(text(element.querySelector('app-error-state'))).toContain('No pudimos completar "Descargar reporte".');
  });

  it('muestra el estado vacío definido en la plantilla', async () => {
    await cargar(pagina({ totalCount: 0, totalPages: 0, data: [], casosTotales: 0, montoAfectado: 0 }));

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

  it.each([
    ['dentro de `plantilla` (forma del swagger)', { plantilla: PLANTILLA_REGLA }],
    ['como texto JSON', { plantilla: JSON.stringify(PLANTILLA_REGLA) }],
  ])('acepta la plantilla %s', async (_, resultado) => {
    await navigate();
    flushNombres();
    expectPlantilla().flush(ok(resultado));
    await settle();
    expectDatos().flush(ok(pagina()));
    await stable();

    expect(element.querySelectorAll('tbody tr')).toHaveLength(10);
  });

  it('pinta la plantilla real del back: sin versión ni ruta de datos, con el título del diseño', async () => {
    await navigate();
    flushNombres();
    expectPlantilla().flush(ok(PLANTILLA_BACK));
    await settle();
    // La fuente de la tabla es fija del front aunque la plantilla no la declare.
    expectDatos().flush(
      ok(
        pagina({
          data: [
            {
              conciliacionId: 'u-1',
              primerNombre: 'Juan',
              segundoNombre: 'Pablo',
              primerApellido: 'Rodríguez',
              segundoApellido: null,
              numeroDocumento: 1045678902,
              numeroBolsillo: '321-765-4322',
              numeroGuia: '70002333336',
              fechaCreacion: '2026-11-11T10:00:00',
              idMovimiento: 3452,
              estado: 'Fallido',
            },
          ],
          totalCount: 1,
        }),
      ),
    );
    await stable();

    expect(element.querySelector('app-error-state')).toBeNull();
    // El bloque no trae `title`: el front usa el del diseño.
    expect(text(element.querySelector('h2'))).toBe('Diferencias por resolver');
    expect([...element.querySelectorAll('thead th')].map(text).slice(1, 3)).toEqual([
      'Primer Nombre',
      'Segundo Nombre',
    ]);
    const fila = [...element.querySelectorAll('tbody tr')[0].querySelectorAll('td')].map(text);
    expect(fila[1]).toBe('Juan');
    expect(fila[10]).toBe('Fallido');
    expect(element.querySelector('tbody a')?.getAttribute('href')).toBe(`${BASE}/conciliacionId/u-1`);
    expect(element.querySelector('button[aria-label="Seleccionar la diferencia de u-1"]')).not.toBeNull();
  });

  it('usa "Validado por" y la fecha del back si los envía', async () => {
    await cargar();
    rowCheckbox('Juan Pablo Rodríguez').click();
    await stable();
    button('Resolver diferencias').click();
    http.expectOne(CAMBIO_ESTADO).flush(
      ok({
        actualizados: [idDe('Juan Pablo Rodríguez')],
        noEncontrados: [],
        totalProcesados: 1,
        validadoPor: 'Alexander Tipacoque',
        fechaValidacion: '2026-08-19T11:35:00-05:00',
      }),
    );
    await settle();
    expectDatos().flush(ok(pagina()));
    await stable();

    const dialog = document.querySelector<HTMLElement>('[role="dialog"]')!;
    expect(
      [...dialog.querySelectorAll('dl > div')].map((item) => [
        text(item.querySelector('dt')),
        text(item.querySelector('dd')),
      ]),
    ).toEqual([
      ['Validado por:', 'Alexander Tipacoque'],
      ['Fecha de validación:', '19/08/2026'],
      ['Casos actualizados:', '1'],
    ]);
  });
});
