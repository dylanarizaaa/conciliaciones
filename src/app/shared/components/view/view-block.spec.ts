import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { API_BASE_URL } from '../../../core/config/api-base-url';
import type {
  TableBlock,
  TablePage,
  TabsBlock,
  ViewBlock,
} from '../../../core/data-access/vista.model';
import type { ApiResponse } from '../../../core/http/api-response';
import { ViewBlockOutlet } from './view-block';

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

const TABLA: TableBlock = {
  id: 'movimientos',
  type: 'table',
  title: 'Movimientos',
  dataSource: {
    path: '/casos/{casoId}/movimientos',
    pagination: { mode: 'server', defaultPageSize: 2 },
    sorting: { mode: 'server', default: [{ id: 'fecha', desc: true }] },
  },
  table: {
    rowId: 'id',
    columns: [
      {
        id: 'fecha',
        accessorKey: 'fecha',
        header: { component: 'SortIndicator', inputs: { label: 'Fecha' } },
        cell: { component: 'DateCell', inputs: { dateStyle: 'medium' } },
        enableSorting: true,
      },
      {
        id: 'valor',
        accessorKey: 'valor',
        header: { component: 'SortIndicator', inputs: { label: 'Valor' } },
        cell: { component: 'CurrencyCell' },
        enableSorting: true,
      },
    ],
  },
};

const PESTANAS: TabsBlock = {
  id: 'pestanas',
  type: 'tabs',
  defaultTab: 'movimientos',
  tabs: [
    { id: 'notas', label: 'Notas', blockId: 'notas' },
    { id: 'movimientos', label: 'Movimientos', blockId: 'movimientos' },
    { id: 'archivo', label: 'Archivo', blockId: 'movimientos', disabled: true },
  ],
};

const NOTAS: TableBlock = {
  id: 'notas',
  type: 'table',
  dataSource: { path: '/casos/{casoId}/notas', pagination: { mode: 'none' }, sorting: { mode: 'client' } },
  table: { rowId: 'id', columns: [{ id: 'nota', accessorKey: 'nota', header: 'Nota' }] },
};

function pagina(overrides: Partial<TablePage> = {}): TablePage {
  return {
    pageNumber: 1,
    pageSize: 2,
    totalRows: 3,
    totalPages: 2,
    rows: [
      { id: 'm1', fecha: '2026-06-26', valor: 1000 },
      { id: 'm2', fecha: '2026-06-25', valor: 2000 },
    ],
    ...overrides,
  };
}

@Component({
  imports: [ViewBlockOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<app-view-block [block]="block()" [blocks]="blocks()" [params]="params" />`,
})
class Host {
  readonly block = signal<ViewBlock>(TABLA);
  readonly blocks = signal<readonly ViewBlock[]>([TABLA, PESTANAS, NOTAS]);
  readonly params = { casoId: 'C 1' };
}

const text = (element: Element | null | undefined) =>
  element?.textContent?.replace(/\s+/g, ' ').trim() ?? '';

describe('ViewBlockOutlet', () => {
  let fixture: ComponentFixture<Host>;
  let http: HttpTestingController;
  let element: HTMLElement;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: '/api' },
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  async function render(block: ViewBlock = TABLA): Promise<void> {
    fixture = TestBed.createComponent(Host);
    fixture.componentInstance.block.set(block);
    element = fixture.nativeElement;
    await settle();
  }

  /** Deja correr efectos y microtareas sin esperar las peticiones que siguen pendientes. */
  async function settle(): Promise<void> {
    for (let i = 0; i < 3; i++) {
      TestBed.tick();
      await Promise.resolve();
    }
    fixture.detectChanges();
  }

  async function stable(): Promise<void> {
    await fixture.whenStable();
    fixture.detectChanges();
  }

  const expectMovimientos = (page: number, sort: string) =>
    http.expectOne(
      (req) =>
        req.url === '/api/casos/C%201/movimientos' &&
        req.params.get('pageNumber') === String(page) &&
        req.params.get('pageSize') === '2' &&
        req.params.get('sort') === sort,
    );
  const sortButton = (label: string) =>
    [...element.querySelectorAll<HTMLButtonElement>('thead th button')].find(
      (candidate) => text(candidate) === label,
    )!;
  const tab = (label: string) =>
    [...element.querySelectorAll<HTMLButtonElement>('[role="tab"]')].find(
      (candidate) => text(candidate) === label,
    )!;

  it('tabla de primer nivel: muestra su título y pagina y ordena en el servidor', async () => {
    await render();

    // Orden por defecto de la plantilla y tamaño de página declarado.
    expectMovimientos(1, 'fecha:desc').flush(ok(pagina()));
    await stable();

    const titulo = element.querySelector('h2')!;
    expect(text(titulo)).toBe('Movimientos');
    expect(element.querySelector('table')?.getAttribute('aria-labelledby')).toBe(titulo.id);
    expect(element.querySelectorAll('tbody tr:not([aria-hidden])')).toHaveLength(2);
    expect(text(element.querySelector('app-paginator'))).toContain('de 2');

    element.querySelector<HTMLButtonElement>('button[aria-label="Página siguiente"]')!.click();
    await settle();
    expectMovimientos(2, 'fecha:desc').flush(
      ok(pagina({ pageNumber: 2, rows: [{ id: 'm3', fecha: '2026-06-24', valor: 3000 }] })),
    );
    await stable();
    expect(element.querySelectorAll('tbody tr:not([aria-hidden])')).toHaveLength(1);

    // Al cambiar el orden se vuelve a la primera página.
    sortButton('Valor').click();
    await settle();
    expectMovimientos(1, 'valor:asc').flush(ok(pagina()));
    await stable();
    expect(sortButton('Valor').closest('th')?.getAttribute('aria-sort')).toBe('ascending');
  });

  it('tabla: si falla la carga muestra el error y deja reintentar', async () => {
    await render();
    expectMovimientos(1, 'fecha:desc').flush('error', { status: 500, statusText: 'Server Error' });
    await stable();

    expect(text(element.querySelector('app-error-state'))).toContain('No pudimos cargar esta tabla.');

    element.querySelector<HTMLButtonElement>('app-error-state button')!.click();
    await settle();
    expectMovimientos(1, 'fecha:desc').flush(ok(pagina()));
    await stable();
    expect(element.querySelectorAll('tbody tr:not([aria-hidden])')).toHaveLength(2);
  });

  it('pestañas: abre la indicada en defaultTab y crea cada contenido al abrirlo', async () => {
    await render(PESTANAS);

    expect(tab('Movimientos').getAttribute('aria-selected')).toBe('true');
    expect(tab('Notas').getAttribute('aria-selected')).toBe('false');
    expect(tab('Archivo').disabled).toBe(true);
    // Solo se piden los datos de la pestaña abierta.
    expectMovimientos(1, 'fecha:desc').flush(ok(pagina()));
    await stable();

    tab('Notas').click();
    await settle();
    http
      .expectOne((req) => req.url === '/api/casos/C%201/notas' && req.params.keys().length === 0)
      .flush(ok(pagina({ pageSize: 1, totalRows: 1, totalPages: 1, rows: [{ id: 'n1', nota: 'Revisado' }] })));
    await stable();

    expect(tab('Notas').getAttribute('aria-selected')).toBe('true');
    const paneles = [...element.querySelectorAll<HTMLElement>('[role="tabpanel"]')];
    expect(paneles.map((panel) => panel.hidden)).toEqual([false, true, true]);
    expect(text(paneles[0].querySelector('tbody td'))).toBe('Revisado');

    // Volver a una pestaña ya abierta no repite la petición (`afterEach` lo comprueba).
    tab('Movimientos').click();
    await stable();
    expect(paneles.map((panel) => panel.hidden)).toEqual([true, false, true]);
  });

  it('pestañas: sin defaultTab válido abre la primera habilitada', async () => {
    await render({
      ...PESTANAS,
      defaultTab: 'archivo',
      tabs: [{ ...PESTANAS.tabs[2] }, { ...PESTANAS.tabs[1] }],
    });

    expect(tab('Movimientos').getAttribute('aria-selected')).toBe('true');
    expectMovimientos(1, 'fecha:desc').flush(ok(pagina()));
    await stable();
  });

  it('pestañas: no pinta un bloque que se contiene a sí mismo', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const circular: TabsBlock = {
      id: 'pestanas',
      type: 'tabs',
      tabs: [{ id: 'yo', label: 'Yo', blockId: 'pestanas' }],
    };
    try {
      await render(circular);

      expect(element.querySelectorAll('[role="tab"]')).toHaveLength(1);
      expect(element.querySelector('[role="tabpanel"] app-view-block')).toBeNull();
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('se referencia a sí mismo'));
    } finally {
      warn.mockRestore();
    }
  });
});
