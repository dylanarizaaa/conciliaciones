import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
  type TestRequest,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import fuentesBack from '../../../../../docs/contrato-vista/ejemplos/back/fuentes-detalle.response.json';
import plantillaBack from '../../../../../docs/contrato-vista/ejemplos/back/plantilla-detalle.response.json';
import fuentesEjemplo from '../../../../../docs/contrato-vista/ejemplos/fuentes-detalle.response.json';
import historialEjemplo from '../../../../../docs/contrato-vista/ejemplos/detalle-historial.response.json';
import plantillaEjemplo from '../../../../../docs/contrato-vista/ejemplos/detalle-plantilla.response.json';
import { API_BASE_URL } from '../../../core/config/api-base-url';
import type { ProcesosResultado } from '../../../core/data-access/proceso.model';
import type { ProyectosResultado } from '../../../core/data-access/proyecto.model';
import type { ReglasPagina } from '../../../core/data-access/regla.model';
import type { SubprocesosResultado } from '../../../core/data-access/subproceso.model';
import type {
  AccordionBlock,
  FuentesDetalle,
  RegistrosPagina,
  ViewBlock,
  ViewTemplate,
} from '../../../core/data-access/vista.model';
import type { ApiResponse } from '../../../core/http/api-response';
import { Detail } from './detail';

/** Respuestas de ejemplo que debe devolver el back (`docs/contrato-vista/ejemplos`, forma del swagger). */
const PLANTILLA = (plantillaEjemplo as unknown as ApiResponse<ViewTemplate>).resultado;
/** Plantilla tal como la devuelve hoy el back (`docs/contrato-vista/ejemplos/back`). */
const PLANTILLA_BACK = (plantillaBack as unknown as ApiResponse<ViewTemplate>).resultado;
/** Respuesta correcta de `fuentes-detalle` para la plantilla del back (con los datos de una consulta real). */
const FUENTES_BACK = (fuentesBack as unknown as ApiResponse<FuentesDetalle>).resultado;
const FUENTES = (fuentesEjemplo as unknown as ApiResponse<FuentesDetalle>).resultado;
const HISTORIAL = (historialEjemplo as unknown as ApiResponse<RegistrosPagina>).resultado;

const REGLA_ID = 'r-cambio';
const CONCILIACION_ID = '8c20e2c1-408a-57a8-96bb-3b3705ea1341';
const RULE = `/plataformas/p1/categorias/c1/canales/s1/reglas/${REGLA_ID}`;
const BASE = `${RULE}/casos/${CONCILIACION_ID}`;
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
const REGLAS: ReglasPagina = {
  casosTotales: 10,
  montoAfectado: 4800000,
  pageNumber: 1,
  pageSize: 50,
  totalPages: 1,
  data: [{ idRegla: REGLA_ID, nombreRegla: 'Cambio de estado logístico', casos: 10, monto: 4800000 }],
};

/** Plantilla del ejemplo con cambios en su bloque de acordeones. */
function conAcordeon(cambios: Partial<AccordionBlock>, accordion: Partial<AccordionBlock['accordion']> = {}): ViewTemplate {
  return {
    ...PLANTILLA,
    blocks: PLANTILLA.blocks.map((block) =>
      block.type === 'accordion'
        ? { ...block, ...cambios, accordion: { ...block.accordion, ...accordion } }
        : block,
    ),
  };
}

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
            path: 'plataformas/:proyectoId/categorias/:procesoId/canales/:subProcesoId/reglas/:reglaId/casos/:conciliacionId',
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
    http
      .expectOne((req) => req.url === '/api/Conciliaciones/subprocesos/reglas')
      .flush(ok(REGLAS));
  }

  /** `GET /Conciliaciones/subprocesos-ui/plantilla?reglaId=&tipoBlock=2`. */
  const expectPlantilla = (): TestRequest =>
    http.expectOne(
      (req) =>
        req.url === '/api/Conciliaciones/subprocesos-ui/plantilla' &&
        req.params.get('reglaId') === REGLA_ID &&
        req.params.get('tipoBlock') === '2',
    );
  /** `GET /Conciliaciones/fuentes-detalle?conciliacionId=` (lo declara la plantilla). */
  const expectFuentes = (id = CONCILIACION_ID): TestRequest =>
    http.expectOne(
      (req) =>
        req.url === '/api/Conciliaciones/fuentes-detalle' && req.params.get('conciliacionId') === id,
    );
  /** Historial: propuesta, aún no está en el swagger. */
  const expectHistorial = (id = CONCILIACION_ID): TestRequest =>
    http.expectOne(
      (req) =>
        req.url === '/api/Conciliaciones/historial-cambios' && req.params.get('conciliacionId') === id,
    );

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

  /** Carga completa: nombres, plantilla, fuentes del caso e historial. */
  async function cargar(plantilla: ViewTemplate = PLANTILLA, fuentes: FuentesDetalle = FUENTES): Promise<void> {
    await navigate();
    flushNombres();
    expectPlantilla().flush(ok(plantilla));
    await settle();
    expectFuentes().flush(ok(fuentes));
    expectHistorial().flush(ok(HISTORIAL));
    await stable();
  }

  const trigger = (titulo: string) =>
    [...element.querySelectorAll<HTMLButtonElement>('hlm-accordion-trigger button')].find(
      (candidate) => text(candidate) === titulo,
    )!;
  const contenido = (titulo: string) =>
    element.querySelector(`#${trigger(titulo).getAttribute('aria-controls')}`)!;
  const datos = (titulo: string) =>
    [...contenido(titulo).querySelectorAll('dl > div')].map(
      (dato) => `${text(dato.querySelector('dt'))}: ${text(dato.querySelector('dd'))}`,
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
    expect(element.querySelector('app-view-accordion hlm-skeleton')).not.toBeNull();
    expect(element.querySelectorAll('thead th')).toHaveLength(6);
    expect(element.querySelectorAll('tbody tr[aria-hidden="true"]')).toHaveLength(3);

    expectFuentes().flush(ok(FUENTES));
    expectHistorial().flush(ok(HISTORIAL));
    await stable();

    expect(element.querySelectorAll('hlm-accordion-trigger')).toHaveLength(6);
    expect(filas()).toHaveLength(3);
  });

  it('pinta el encabezado fijo con la miga de pan hasta la regla (nombre del listado de reglas)', async () => {
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

  it('pinta un acordeón por fuente, cerrados y repartidos en dos columnas', async () => {
    await cargar();

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
    // El swagger no trae el nombre del cliente: sin `title` en la plantilla el subtítulo es solo
    // para lectores de pantalla y mantiene la jerarquía h1 > h2 > h3.
    const titulo = element.querySelector('app-view-accordion h2')!;
    expect(titulo.classList).toContain('sr-only');
    expect(text(titulo)).toBe('Información por aplicativo');
    expect(element.querySelector('app-view-accordion section')?.getAttribute('aria-labelledby')).toBe(
      titulo.id,
    );
  });

  it('abre un acordeón: título de la tarjeta con {campo} y columnas leídas de su fuente', async () => {
    await cargar();

    trigger('Recargas Pago en Casa').click();
    await stable();

    expect(trigger('Recargas Pago en Casa').getAttribute('aria-expanded')).toBe('true');
    const panel = contenido('Recargas Pago en Casa');
    expect(panel.hasAttribute('inert')).toBe(false);
    expect(panel.getAttribute('role')).toBe('region');
    expect(panel.getAttribute('aria-labelledby')).toBe(trigger('Recargas Pago en Casa').id);
    expect(text(panel.querySelector('[role="heading"]'))).toBe('Número de guía: 70002333336');
    // Cada columna lee el dato cuyo `nombre` es su `accessorKey`; la celda la pone la plantilla.
    expect(datos('Recargas Pago en Casa')).toEqual([
      'Estado: Entregado',
      'Recaudo: $ 6.200.000',
      'Diferencia: $ 3.100.000',
    ]);

    // `multiple`: abrir otro no cierra el primero.
    trigger('Recargas Controller').click();
    await stable();
    expect(trigger('Recargas Pago en Casa').getAttribute('aria-expanded')).toBe('true');
    expect(datos('Recargas Controller')).toEqual([
      'Concepto 1: Valor concepto 1',
      'Concepto 2: Valor concepto 2',
      'Concepto 3: Valor concepto 3',
    ]);

    trigger('Recargas Pago en Casa').click();
    await stable();
    expect(trigger('Recargas Pago en Casa').getAttribute('aria-expanded')).toBe('false');
  });

  it('sin `items` en la plantilla: un acordeón por fuente y la celda por defecto de cada tipo', async () => {
    await cargar(conAcordeon({}, { items: undefined, cellsByType: undefined, titleField: undefined }), {
      data: [
        {
          id: 'fuenteApp',
          // Sin `items`, el título y las etiquetas salen de la respuesta.
          nombre: 'Recargas APP',
          datos: [
            { id: 'numeroGuia', nombre: 'Número de guía', tipo: 'string', valor: '70002333336' },
            { id: 'recaudo', nombre: 'Recaudo', tipo: 'decimal', valor: 6200000.5 },
            { id: 'intentos', nombre: 'Intentos', tipo: 'integer', valor: 3 },
            { id: 'fecha', nombre: 'Fecha', tipo: 'date', valor: '2026-06-26' },
            { id: 'pagado', nombre: 'Pagado', tipo: 'boolean', valor: true },
            { id: 'nota', nombre: 'Nota', tipo: 'otro', valor: 'Revisar' },
          ],
        },
      ],
    });

    trigger('Recargas APP').click();
    await stable();

    expect(contenido('Recargas APP').querySelector('[role="heading"]')).toBeNull();
    expect(datos('Recargas APP')).toEqual([
      'Número de guía: 70002333336',
      'Recaudo: 6.200.000,5',
      'Intentos: 3',
      'Fecha: 26/06/2026',
      'Pagado: Sí',
      'Nota: Revisar',
    ]);
  });

  it('sin `items`: `titleField` va como título de la tarjeta y una fuente sin nombre usa su id', async () => {
    await cargar(
      conAcordeon({}, { items: undefined, cellsByType: undefined, titleField: 'NUMEROGUIA', type: undefined, layoutColumns: undefined }),
      {
        data: [
          {
            id: 'fuenteSinNombre',
            nombre: '',
            datos: [
              null as never,
              { id: 'numeroGuia', nombre: 'Número de guía', tipo: 'string', valor: '700' },
              // Un dato sin etiqueta usa su id; un objeto (fuera de contrato) cuenta como sin dato.
              { id: 'recaudo', nombre: '', tipo: 'decimal', valor: {} as never },
              { id: '', nombre: '', tipo: 'string', valor: 'sin id ni nombre' },
            ],
          },
          { id: '', nombre: '', datos: [{ id: 'numeroGuia', nombre: 'Número de guía', tipo: 'string', valor: '' }] },
        ],
      },
    );

    // Sin `layoutColumns` hay una sola columna; sin `type`, se pueden abrir varios a la vez.
    expect(element.querySelectorAll('[hlmAccordion] > div')).toHaveLength(1);
    trigger('fuenteSinNombre').click();
    trigger('Aplicativo 2').click();
    await stable();

    expect(text(contenido('fuenteSinNombre').querySelector('[role="heading"]'))).toBe('Número de guía: 700');
    expect(datos('fuenteSinNombre')).toEqual(['recaudo: —Sin dato']);
    // El dato del título llega vacío: no hay título y la fuente se muestra sin información.
    expect(contenido('Aplicativo 2').querySelector('[role="heading"]')).toBeNull();
    expect(trigger('fuenteSinNombre').getAttribute('aria-expanded')).toBe('true');
    expect(trigger('Aplicativo 2').getAttribute('aria-expanded')).toBe('true');
  });

  it('si no llegan los nombres, la miga de pan usa los nombres genéricos', async () => {
    await navigate();
    const falla = { status: 500, statusText: 'Error' };
    http.expectOne('/api/Conciliaciones/proyectos').flush(null, falla);
    http.expectOne((req) => req.url === '/api/Conciliaciones/procesos').flush(null, falla);
    http.expectOne((req) => req.url === '/api/Conciliaciones/subprocesos').flush(null, falla);
    http.expectOne((req) => req.url === '/api/Conciliaciones/subprocesos/reglas').flush(null, falla);
    expectPlantilla().flush(ok(PLANTILLA));
    await stable();

    expect([...element.querySelectorAll('nav[aria-label="Ruta de navegación"] li')].map(text)).toEqual(
      ['Conciliaciones', 'Plataforma', 'Categoría', 'Canal', 'Regla', 'Detalle'],
    );
    expect(element.querySelector('app-error-state')).not.toBeNull();
  });

  it('respeta el modo single de la plantilla', async () => {
    await cargar(conAcordeon({}, { type: 'single' }));

    trigger('Recargas Pago en Casa').click();
    await stable();
    trigger('Recargas Alcarrito').click();
    await stable();

    expect(trigger('Recargas Alcarrito').getAttribute('aria-expanded')).toBe('true');
    expect(trigger('Recargas Pago en Casa').getAttribute('aria-expanded')).toBe('false');
  });

  it('una fuente sin datos muestra el mensaje de la plantilla', async () => {
    await cargar();

    trigger('Recargas Novasoft').click();
    await stable();

    const panel = contenido('Recargas Novasoft');
    expect(text(panel)).toBe('Sin información en este aplicativo.');
    expect(panel.querySelector('dl')).toBeNull();
  });

  it('un dato sin valor (o que no llega) se muestra como "Sin dato"; sin el dato del título, no hay título', async () => {
    await cargar(PLANTILLA, {
      data: [
        {
          // Los ids no distinguen mayúsculas.
          id: 'FUENTEPAGOENCASA',
          nombre: null,
          datos: [
            { id: 'Estado', nombre: null, tipo: 'string', valor: null },
            { id: 'recaudo', nombre: null, tipo: 'currency', valor: 0 },
            // Fuera de contrato (un decimal mal serializado): se trata como dato vacío.
            { id: 'diferencia', nombre: null, tipo: 'currency', valor: {} as never },
          ],
        },
      ],
    });

    trigger('Recargas Pago en Casa').click();
    await stable();

    expect(contenido('Recargas Pago en Casa').querySelector('[role="heading"]')).toBeNull();
    expect(datos('Recargas Pago en Casa')).toEqual([
      'Estado: —Sin dato',
      'Recaudo: $ 0',
      'Diferencia: —Sin dato',
    ]);
  });

  it('un acordeón cuya fuente no llega muestra el mensaje de la plantilla', async () => {
    await cargar(PLANTILLA, { data: [] });

    // Con `items`, los acordeones salen de la plantilla aunque no lleguen fuentes.
    expect(element.querySelectorAll('hlm-accordion-trigger')).toHaveLength(6);
    trigger('Recargas APP').click();
    await stable();
    expect(text(contenido('Recargas APP'))).toBe('Sin información en este aplicativo.');
  });

  it('sin `items` ni fuentes muestra un estado vacío en lugar de los acordeones', async () => {
    await cargar(conAcordeon({}, { items: undefined }), { data: [] });

    expect(text(element.querySelector('app-view-accordion app-empty-state'))).toBe(
      'No hay información de los aplicativos para esta diferencia.',
    );
    expect(element.querySelector('hlm-accordion-trigger')).toBeNull();
  });

  it('abre al entrar los acordeones con `defaultOpen`', async () => {
    const [acordeones] = PLANTILLA.blocks;
    if (acordeones.type !== 'accordion') {
      throw new Error('El primer bloque del ejemplo debe ser el de acordeones.');
    }
    await cargar(
      conAcordeon(
        {},
        { items: acordeones.accordion.items!.map((item, index) => ({ ...item, defaultOpen: index === 3 })) },
      ),
    );

    expect(trigger('Recargas Controller').getAttribute('aria-expanded')).toBe('true');
    expect(trigger('Recargas Pago en Casa').getAttribute('aria-expanded')).toBe('false');
  });

  it('pinta la plantilla real del back con su respuesta correcta: une fuentes y datos por id', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    try {
      await navigate();
      flushNombres();
      expectPlantilla().flush(ok(PLANTILLA_BACK));
      await settle();
      // La plantilla trae una ruta vieja en `dataSource`; el front usa `fuentes-detalle`.
      // El orden de la respuesta no importa: se une por `id`.
      expectFuentes().flush(ok({ data: [...FUENTES_BACK.data!].reverse() }));
      await stable();

      expect(element.querySelector('app-error-state')).toBeNull();
      // El acordeón muestra el `title` de la plantilla tal cual (hoy el back manda el id técnico).
      expect([...element.querySelectorAll('hlm-accordion-trigger button')].map(text)).toEqual([
        'fuentePrepagoMovimientoDetalle',
        'fuentePrepagoMovimiento',
        'fuentePrepagoDetalleCuenta',
        'fuentePrepagoDetalleCliente',
        'fuenteControllerAdmision',
        'fuenteControllerGuiaFormaPago',
        'fuenteControllerFormasPago',
      ]);

      for (const titulo of [
        'fuentePrepagoMovimientoDetalle',
        'fuentePrepagoMovimiento',
        'fuentePrepagoDetalleCliente',
        'fuenteControllerAdmision',
        'fuenteControllerFormasPago',
      ]) {
        trigger(titulo).click();
      }
      await stable();

      const titulo = (acordeon: string) => text(contenido(acordeon).querySelector('[role="heading"]'));
      expect(titulo('fuentePrepagoMovimientoDetalle')).toBe('Código Producto: 240000143190');
      // La celda la decide la plantilla (CurrencyCell en un id) y "Valor Final" llega sin dato.
      expect(datos('fuentePrepagoMovimientoDetalle')).toEqual(
        expect.arrayContaining(['Id Movimiento: $ 19.957', 'Valor Final: —Sin dato']),
      );

      // "Id Movimiento Prepago" ya está en el título de la tarjeta: no se repite en la lista.
      expect(titulo('fuentePrepagoMovimiento')).toBe('Id Movimiento Prepago: 19957');
      expect(datos('fuentePrepagoMovimiento')).toEqual([
        'Id Prepago Cliente: 679',
        'Id Tipo Movimiento: 4',
        'Descripción Corta: Pago Inter Pay APP',
      ]);

      // La plantilla repite la columna "primerNombre": se pinta tal cual, sin errores.
      expect(titulo('fuentePrepagoDetalleCliente')).toBe('Id Prepago Cliente: 679');
      expect(datos('fuentePrepagoDetalleCliente')).toEqual([
        'Primer Nombre: Cristhian',
        'Primer Nombre: Cristhian',
        'Segundo Nombre: —Sin dato',
        'Primer Apellido: Pacheco',
        'Segundo Apellido: —Sin dato',
        'Número de Bolsillo: 4247181234',
        'Número Documento: 1000319549',
      ]);

      expect(text(contenido('fuenteControllerAdmision'))).toBe('Sin información en este aplicativo.');
      expect(titulo('fuenteControllerFormasPago')).toBe('Id Forma Pago: 2');
      expect(datos('fuenteControllerFormasPago')).toEqual(['Descripción Forma Pago: Crédito']);
      expect(warn).not.toHaveBeenCalled();
    } finally {
      warn.mockRestore();
    }
  });

  it('una respuesta sin `id` (fuera de contrato) no se asocia con ningún acordeón', async () => {
    await navigate();
    flushNombres();
    expectPlantilla().flush(ok(PLANTILLA_BACK));
    await settle();
    // Forma que devuelve hoy el back: el nombre de la conexión y las etiquetas, sin ids.
    expectFuentes().flush(
      ok({
        data: [
          {
            nombre: 'Pago de Servicios ConexionPrepago',
            datos: [{ nombre: 'Código Producto', tipo: 'string', valor: '240000143190' }],
          },
        ],
      }),
    );
    await stable();

    trigger('fuentePrepagoMovimientoDetalle').click();
    await stable();
    expect(text(contenido('fuentePrepagoMovimientoDetalle'))).toBe('Sin información en este aplicativo.');
  });

  it('el título de la sección admite {campo} de la respuesta de las fuentes', async () => {
    await cargar(conAcordeon({ title: '{nombreCliente}' }), { ...FUENTES, nombreCliente: 'Juan Pablo Rodríguez' });

    const titulo = element.querySelector('app-view-accordion h2')!;
    expect(text(titulo)).toBe('Juan Pablo Rodríguez');
    expect(element.querySelector('app-view-accordion section')?.getAttribute('aria-labelledby')).toBe(
      titulo.id,
    );
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
    expectFuentes().flush(ok(FUENTES));
    expectHistorial().flush(ok({ totalCount: 0, totalPages: 0, pageNumber: 1, pageSize: 0, data: [] }));
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
    expectFuentes().flush('error', { status: 500, statusText: 'Server Error' });
    expectHistorial().flush(ok(HISTORIAL));
    await stable();

    const error = element.querySelector('app-view-accordion app-error-state')!;
    expect(text(error)).toContain('No pudimos cargar esta información.');
    expect(filas()).toHaveLength(3);

    error.querySelector('button')!.click();
    await settle();
    expectFuentes().flush(ok(FUENTES));
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
    expectFuentes().flush(ok(FUENTES));
    expectHistorial().flush(ok(HISTORIAL));
    await stable();

    expect(element.querySelector('app-error-state')).toBeNull();
    expect(filas()).toHaveLength(3);
  });

  it('si la regla no tiene plantilla de detalle, muestra el error de la pantalla', async () => {
    await navigate();
    flushNombres();
    expectPlantilla().flush(ok({ plantilla: null }));
    await stable();

    expect(text(element.querySelector('app-error-state'))).toContain(
      'No pudimos cargar el detalle de esta diferencia.',
    );
  });

  it('al cambiar de caso reutiliza la plantilla y pide los datos del nuevo caso', async () => {
    await cargar();

    await navigate(`${RULE}/casos/otro-caso`);
    await settle();

    // La plantilla es por regla: no se vuelve a pedir.
    expectFuentes('otro-caso').flush(ok({ data: FUENTES.data!.slice(0, 1) }));
    expectHistorial('otro-caso').flush(ok({ ...HISTORIAL, data: HISTORIAL.data!.slice(0, 1), totalCount: 1 }));
    await stable();

    // Los acordeones son los de la plantilla; los datos, los del caso nuevo.
    trigger('Recargas Pago en Casa').click();
    trigger('Recargas Alcarrito').click();
    await stable();
    expect(datos('Recargas Pago en Casa')).toContain('Recaudo: $ 6.200.000');
    expect(text(contenido('Recargas Alcarrito'))).toBe('Sin información en este aplicativo.');
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
      expectFuentes().flush(ok(FUENTES));
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
