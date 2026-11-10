import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
  type TestRequest,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import casoEjemplo from '../../../../../docs/contrato-vista/ejemplos/detalle-caso.response.json';
import historialEjemplo from '../../../../../docs/contrato-vista/ejemplos/detalle-historial.response.json';
import plantillaEjemplo from '../../../../../docs/contrato-vista/ejemplos/detalle-plantilla.response.json';
import { API_BASE_URL } from '../../../core/config/api-base-url';
import type { ProcesosResultado } from '../../../core/data-access/proceso.model';
import type { ProyectosResultado } from '../../../core/data-access/proyecto.model';
import type { SubprocesosResultado } from '../../../core/data-access/subproceso.model';
import type {
  TablePage,
  ViewBlock,
  ViewRecord,
  ViewTemplate,
} from '../../../core/data-access/vista.model';
import type { ApiResponse } from '../../../core/http/api-response';
import { Detail } from './detail';

/** Respuestas de ejemplo que debe devolver el back (`docs/contrato-vista/ejemplos`). */
const PLANTILLA = (plantillaEjemplo as unknown as ApiResponse<ViewTemplate>).resultado;
const CASO = (casoEjemplo as unknown as ApiResponse<ViewRecord>).resultado;
const HISTORIAL = (historialEjemplo as unknown as ApiResponse<TablePage>).resultado;

const RULE = '/plataformas/p1/categorias/c1/canales/s1/reglas/Cambio%20de%20estado%20log%C3%ADstico';
const BASE = `${RULE}/casos/CASO-3452`;
const RULE_API = '/api/Conciliaciones/subprocesos/s1/reglas/Cambio%20de%20estado%20log%C3%ADstico';
const TAB_ID = 'brn-tabs-label-pestanas-historial';

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

const text = (element: Element | null | undefined) =>
  element?.textContent?.replace(/\s+/g, ' ').trim() ?? '';

describe('Detail', () => {
  let harness: RouterTestingHarness;
  let harnessCreated = false;
  let http: HttpTestingController;
  let element: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [
        provideRouter([
          {
            path: 'plataformas/:proyectoId/categorias/:procesoId/canales/:subProcesoId/reglas/:regla/casos/:casoId',
            component: Detail,
          },
        ]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: '/api' },
      ],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    harnessCreated = false;
  });

  afterEach(() => http.verify());

  async function navigate(url = BASE): Promise<void> {
    // Solo hay un arnés por prueba: una segunda navegación reutiliza el mismo.
    if (!harnessCreated) {
      harness = await RouterTestingHarness.create();
      harnessCreated = true;
    }
    await harness.navigateByUrl(url, Detail);
    element = harness.routeNativeElement!;
  }

  function flushNombres(): void {
    http.expectOne('/api/Conciliaciones/proyectos').flush(ok(PROYECTOS));
    http.expectOne((req) => req.url === '/api/Conciliaciones/procesos').flush(ok(PROCESOS));
    http.expectOne((req) => req.url === '/api/Conciliaciones/subprocesos').flush(ok(SUBPROCESOS));
  }

  const expectPlantilla = (): TestRequest => http.expectOne(`${RULE_API}/casos/plantilla`);
  const expectCaso = (id = 'CASO-3452'): TestRequest => http.expectOne(`${RULE_API}/casos/${id}`);
  const expectHistorial = (id = 'CASO-3452'): TestRequest =>
    http.expectOne((req) => req.url === `${RULE_API}/casos/${id}/historial`);

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

  /** Carga completa: nombres, plantilla, registro del caso e historial. */
  async function cargar(plantilla: ViewTemplate = PLANTILLA, caso: ViewRecord = CASO): Promise<void> {
    await navigate();
    flushNombres();
    expectPlantilla().flush(ok(plantilla));
    await settle();
    expectCaso().flush(ok(caso));
    expectHistorial().flush(ok(HISTORIAL));
    await stable();
  }

  const trigger = (titulo: string) =>
    [...element.querySelectorAll<HTMLButtonElement>('hlm-accordion-trigger button')].find(
      (candidate) => text(candidate) === titulo,
    )!;
  const contenido = (titulo: string) =>
    element.querySelector(`#${trigger(titulo).getAttribute('aria-controls')}`)!;
  const campos = (titulo: string) =>
    [...contenido(titulo).querySelectorAll('dl > div')].map(
      (campo) => `${text(campo.querySelector('dt'))}: ${text(campo.querySelector('dd'))}`,
    );
  const filas = () =>
    [...element.querySelectorAll('tbody tr:not([aria-hidden])')].map((fila) =>
      [...fila.querySelectorAll('td')].map(text),
    );
  const sortButton = (label: string) =>
    [...element.querySelectorAll<HTMLButtonElement>('thead th button')].find(
      (candidate) => text(candidate) === label,
    )!;

  it('muestra skeletons mientras llegan la plantilla y los datos de cada bloque', async () => {
    await navigate();

    expect(element.querySelector('app-page-header-skeleton')).not.toBeNull();
    expect(element.querySelector('app-view-block')).toBeNull();

    flushNombres();
    expectPlantilla().flush(ok(PLANTILLA));
    await settle();

    // Con la plantilla ya se conocen los bloques: cada uno pide sus datos y muestra su skeleton.
    expect(element.querySelector('hlm-accordion-trigger')).toBeNull();
    expect(element.querySelectorAll('thead th')).toHaveLength(6);
    expect(element.querySelectorAll('tbody tr[aria-hidden="true"]')).toHaveLength(3);

    expectCaso().flush(ok(CASO));
    expectHistorial().flush(ok(HISTORIAL));
    await stable();

    expect(element.querySelectorAll('hlm-accordion-trigger')).toHaveLength(6);
    expect(filas()).toHaveLength(3);
  });

  it('pinta el encabezado fijo de la pantalla con la miga de pan hasta la regla', async () => {
    await cargar();

    expect(text(element.querySelector('h1'))).toBe('Detalle de la diferencia');
    expect(text(element.querySelector('app-page-header p'))).toBe(
      'Compara la información de la diferencia detectada entre las diferentes plataformas',
    );
    expect([...element.querySelectorAll('nav[aria-label="Ruta de navegación"] li')].map(text)).toEqual(
      ['Conciliaciones', 'Inter Pay', 'Recargas', 'Pago en Casa', 'Cambio de estado logístico', 'Detalle'],
    );
    expect(
      element.querySelector('a[aria-label="Volver a Cambio de estado logístico"]')?.getAttribute('href'),
    ).toBe(RULE);
  });

  it('pide los datos de cada bloque en la ruta que declara la plantilla', async () => {
    await navigate();
    flushNombres();
    expectPlantilla().flush(ok(PLANTILLA));
    await settle();

    expectCaso().flush(ok(CASO));
    const historial = expectHistorial();
    // Sin paginación y con orden en el cliente no se envían parámetros.
    expect(historial.request.params.keys()).toEqual([]);
    historial.flush(ok(HISTORIAL));
    await stable();
  });

  it('pinta los acordeones de la plantilla cerrados y en dos columnas, con el título del registro', async () => {
    await cargar();

    const titulo = element.querySelector('app-view-accordion h2')!;
    expect(text(titulo)).toBe('Juan Pablo Rodríguez');
    expect(element.querySelector('app-view-accordion section')?.getAttribute('aria-labelledby')).toBe(
      titulo.id,
    );

    const columnas = [...element.querySelectorAll('[data-slot="accordion"] > div')].map((columna) =>
      [...columna.querySelectorAll('hlm-accordion-trigger button')].map(text),
    );
    expect(columnas).toEqual([
      ['Recargas Pago en Casa', 'Recargas Alcarrito', 'Recargas Novasoft'],
      ['Recargas Controller', 'Recargas Miti Miti', 'Recargas APP'],
    ]);
    for (const boton of element.querySelectorAll('hlm-accordion-trigger button')) {
      expect(boton.getAttribute('aria-expanded')).toBe('false');
      expect(boton.parentElement?.tagName).toBe('H3');
    }
    expect(contenido('Recargas Pago en Casa').hasAttribute('inert')).toBe(true);
  });

  it('abre un acordeón y muestra sus campos con las celdas del catálogo', async () => {
    await cargar();

    trigger('Recargas Pago en Casa').click();
    await stable();

    expect(trigger('Recargas Pago en Casa').getAttribute('aria-expanded')).toBe('true');
    const panel = contenido('Recargas Pago en Casa');
    expect(panel.hasAttribute('inert')).toBe(false);
    expect(panel.getAttribute('role')).toBe('region');
    expect(panel.getAttribute('aria-labelledby')).toBe(trigger('Recargas Pago en Casa').id);
    expect(text(panel.querySelector('[role="heading"]'))).toBe('Número de guía: 70002333336');
    expect(campos('Recargas Pago en Casa')).toEqual([
      'Estado: Entregado',
      'Recaudo: $ 6.200.000',
      'Diferencia: $ 3.100.000',
    ]);

    // `multiple`: abrir otro no cierra el primero.
    trigger('Recargas Controller').click();
    await stable();
    expect(trigger('Recargas Pago en Casa').getAttribute('aria-expanded')).toBe('true');
    expect(campos('Recargas Controller')).toEqual([
      'Concepto 1: Valor concepto 1',
      'Concepto 2: Valor concepto 2',
      'Concepto 3: Valor concepto 3',
    ]);

    trigger('Recargas Pago en Casa').click();
    await stable();
    expect(trigger('Recargas Pago en Casa').getAttribute('aria-expanded')).toBe('false');
  });

  it('respeta defaultOpen y el modo single de la plantilla', async () => {
    const [acordeones, ...resto] = PLANTILLA.blocks;
    if (acordeones.type !== 'accordion') {
      throw new Error('El primer bloque del ejemplo debe ser el de acordeones.');
    }
    const plantilla: ViewTemplate = {
      ...PLANTILLA,
      blocks: [
        {
          ...acordeones,
          accordion: {
            ...acordeones.accordion,
            type: 'single',
            items: acordeones.accordion.items.map((item, index) => ({ ...item, defaultOpen: index === 0 })),
          },
        },
        ...resto,
      ],
    };
    await cargar(plantilla);

    expect(trigger('Recargas Pago en Casa').getAttribute('aria-expanded')).toBe('true');

    trigger('Recargas Alcarrito').click();
    await stable();
    expect(trigger('Recargas Alcarrito').getAttribute('aria-expanded')).toBe('true');
    expect(trigger('Recargas Pago en Casa').getAttribute('aria-expanded')).toBe('false');
  });

  it('un aplicativo sin datos muestra el mensaje de la plantilla en lugar de campos vacíos', async () => {
    await cargar();

    trigger('Recargas Novasoft').click();
    await stable();

    const panel = contenido('Recargas Novasoft');
    expect(text(panel)).toBe('Sin información en este aplicativo.');
    expect(panel.querySelector('dl')).toBeNull();
  });

  it('un campo sin dato dentro de un aplicativo con datos se muestra como "Sin dato"', async () => {
    await cargar(PLANTILLA, { ...CASO, pagoEnCasa: { numeroGuia: '70002333336', estado: null, recaudo: 0 } });

    trigger('Recargas Pago en Casa').click();
    await stable();

    expect(campos('Recargas Pago en Casa')).toEqual([
      'Estado: —Sin dato',
      'Recaudo: $ 0',
      'Diferencia: —Sin dato',
    ]);
  });

  it('pinta la pestaña de la plantilla con su tabla, nombrada por la pestaña', async () => {
    await cargar();

    const pestanas = [...element.querySelectorAll('[role="tablist"] [role="tab"]')];
    expect(pestanas.map(text)).toEqual(['Historial de cambios']);
    expect(pestanas[0].id).toBe(TAB_ID);
    expect(pestanas[0].getAttribute('aria-selected')).toBe('true');

    const panel = element.querySelector('[role="tabpanel"]')!;
    expect(panel.getAttribute('aria-labelledby')).toBe(TAB_ID);
    expect(pestanas[0].getAttribute('aria-controls')).toBe(panel.id);
    // La pestaña ya nombra la tabla: no se repite el título del bloque.
    expect(panel.querySelector('h2')).toBeNull();
    expect(panel.querySelector('table')?.getAttribute('aria-labelledby')).toBe(TAB_ID);

    expect([...element.querySelectorAll('thead th')].map(text)).toEqual([
      'Regla',
      'Correo',
      'Medio de pago',
      'Valor',
      'Fecha de creación',
      'Fecha de aprobación',
    ]);
    expect(filas()[0]).toEqual([
      'Reverso por Pago en Casa duplicado',
      'usuario1@interrapidisimo.com',
      'Inter Pay Cliente',
      '$ 3.100.000',
      '26/06/2026',
      '27/06/2026',
    ]);
    // Sin paginación en la plantilla no hay paginador.
    expect(element.querySelector('app-paginator')).toBeNull();
  });

  it('ordena el historial en el navegador, sin volver a pedir los datos', async () => {
    await cargar();

    sortButton('Correo').click();
    await stable();
    sortButton('Correo').click();
    await stable();

    expect(sortButton('Correo').closest('th')?.getAttribute('aria-sort')).toBe('descending');
    expect(filas().map((fila) => fila[1])).toEqual([
      'usuario3@interrapidisimo.com',
      'usuario2@interrapidisimo.com',
      'usuario1@interrapidisimo.com',
    ]);
    // `afterEach` comprueba que no quedó ninguna petición sin atender.
  });

  it('muestra el estado vacío de la tabla que define la plantilla', async () => {
    await navigate();
    flushNombres();
    expectPlantilla().flush(ok(PLANTILLA));
    await settle();
    expectCaso().flush(ok(CASO));
    expectHistorial().flush(ok({ ...HISTORIAL, pageSize: 0, totalRows: 0, totalPages: 0, rows: [] }));
    await stable();

    expect([...element.querySelectorAll('app-empty-state p')].map(text)).toEqual([
      'Este caso aún no tiene cambios.',
      'Cuando se registre un cambio aparecerá aquí.',
    ]);
    expect(element.querySelector('table')).toBeNull();
  });

  it('si falla un bloque, muestra su error y deja reintentar sin afectar a los demás', async () => {
    await navigate();
    flushNombres();
    expectPlantilla().flush(ok(PLANTILLA));
    await settle();
    expectCaso().flush('error', { status: 500, statusText: 'Server Error' });
    expectHistorial().flush(ok(HISTORIAL));
    await stable();

    const error = element.querySelector('app-view-accordion app-error-state')!;
    expect(text(error)).toContain('No pudimos cargar esta información.');
    expect(filas()).toHaveLength(3);

    error.querySelector('button')!.click();
    await settle();
    expectCaso().flush(ok(CASO));
    await stable();

    expect(element.querySelector('app-error-state')).toBeNull();
    expect(element.querySelectorAll('hlm-accordion-trigger')).toHaveLength(6);
  });

  it('si falla la plantilla, muestra el error de la pantalla y deja reintentar', async () => {
    await navigate();
    flushNombres();
    expectPlantilla().flush(ok({ ...PLANTILLA, schemaVersion: '2.0.0' }));
    await stable();

    expect(text(element.querySelector('app-error-state'))).toContain(
      'No pudimos cargar el detalle de esta diferencia.',
    );
    expect(element.querySelector('app-view-block')).toBeNull();

    element.querySelector<HTMLButtonElement>('app-error-state button')!.click();
    await settle();
    expectPlantilla().flush(ok(PLANTILLA));
    await settle();
    expectCaso().flush(ok(CASO));
    expectHistorial().flush(ok(HISTORIAL));
    await stable();

    expect(element.querySelector('app-error-state')).toBeNull();
    expect(filas()).toHaveLength(3);
  });

  it('al cambiar de caso reutiliza la plantilla y pide los datos del nuevo caso', async () => {
    await cargar();

    await navigate(`${RULE}/casos/CASO-3453`);
    await settle();

    // La plantilla es por regla: no se vuelve a pedir.
    expectCaso('CASO-3453').flush(
      ok({ ...CASO, fuentePrepagoDetalleCliente: { nombreCompleto: 'Diego Alejandro Silva' } }),
    );
    expectHistorial('CASO-3453').flush(ok({ ...HISTORIAL, rows: HISTORIAL.rows.slice(0, 1), totalRows: 1 }));
    await stable();

    expect(text(element.querySelector('app-view-accordion h2'))).toBe('Diego Alejandro Silva');
    expect(filas()).toHaveLength(1);
  });

  it('pinta los bloques en el orden del layout', async () => {
    await cargar({
      ...PLANTILLA,
      layout: { type: 'stack', items: [{ blockId: 'pestanas' }, { blockId: 'aplicativos' }] },
    });

    const bloques = [...element.querySelectorAll(':scope > div > app-view-block')].map(
      (bloque) => bloque.firstElementChild?.tagName.toLowerCase(),
    );
    expect(bloques).toEqual(['app-view-tabs', 'app-view-accordion']);
  });

  it('omite los bloques que no entiende y las pestañas sin bloque, y lo avisa en consola', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const [acordeones, pestanas] = PLANTILLA.blocks;
    const plantilla: ViewTemplate = {
      ...PLANTILLA,
      layout: {
        type: 'stack',
        items: [{ blockId: 'aplicativos' }, { blockId: 'grafica' }, { blockId: 'pestanas' }],
      },
      // Sin el bloque `historial` que referencia la pestaña y con un tipo de una versión futura.
      blocks: [acordeones, { id: 'grafica', type: 'chart' } as unknown as ViewBlock, pestanas],
    };

    try {
      await navigate();
      flushNombres();
      expectPlantilla().flush(ok(plantilla));
      await settle();
      expectCaso().flush(ok(CASO));
      await stable();

      expect(element.querySelectorAll('hlm-accordion-trigger')).toHaveLength(6);
      expect([...element.querySelectorAll('[role="tab"]')].map(text)).toEqual(['Historial de cambios']);
      expect(element.querySelector('table')).toBeNull();
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('"chart"'));
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('"historial"'));
    } finally {
      warn.mockRestore();
    }
  });
});
