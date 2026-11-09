import { Component } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { injectTable, rowSortingFeature, tableFeatures } from '@tanstack/angular-table';
import type { TableDefinition, TableRow } from '../../../core/data-access/vista.model';
import { DataTable } from './data-table';
import { buildTemplateTable, TEMPLATE_TABLE_FEATURES } from './template/template-table';

/** jsdom no implementa ResizeObserver ni mide el layout: se simulan ambos. */
class FakeResizeObserver {
  constructor(private readonly callback: () => void) {}
  observe(): void {
    this.callback();
  }
  disconnect(): void {
    // nada que liberar
  }
}

let viewportWidth = 1240;
const SCROLL_WIDTH = 1500;
const isContainer = (element: HTMLElement) => element.getAttribute?.('data-slot') === 'table-container';

const DEFINITION: TableDefinition = {
  rowId: 'id',
  selection: { mode: 'multi' },
  columns: [
    {
      id: 'sel',
      header: { component: 'SelectAllCheckbox', inputs: { ariaLabel: 'Seleccionar todo' } },
      cell: { component: 'RowCheckbox', inputs: { ariaLabel: 'Seleccionar {id}' } },
      meta: { width: 56 },
      pin: 'start',
    },
    { id: 'nombre', accessorKey: 'nombre', header: 'Nombre', meta: { width: 200 }, pin: 'start' },
    { id: 'a', accessorKey: 'a', header: 'A' },
    { id: 'b', accessorKey: 'b', header: 'B' },
    { id: 'c', accessorKey: 'c', header: 'C' },
    { id: 'estado', accessorKey: 'estado', header: 'Estado', pin: 'end' },
    {
      id: 'accion',
      header: 'Acción',
      cell: { component: 'LinkCell', inputs: { label: 'Ver', ariaLabel: 'Ver {id}', route: ['{id}'] } },
      meta: { width: 120 },
      pin: 'end',
    },
  ],
};

const ROWS: TableRow[] = [{ id: 'C1', nombre: 'Ana', a: 1, b: 2, c: 3, estado: 'P' }];

@Component({
  imports: [DataTable],
  template: `<app-data-table [table]="table" labelledBy="titulo" density="compact" />`,
})
class PinnedHost {
  private readonly built = buildTemplateTable(DEFINITION);
  readonly table = injectTable(() => ({
    features: TEMPLATE_TABLE_FEATURES,
    columns: this.built.columns,
    data: ROWS,
    getRowId: this.built.getRowId,
    state: { columnPinning: this.built.columnPinning },
  }));
}

const basicFeatures = tableFeatures({ rowSortingFeature });

@Component({
  imports: [DataTable],
  template: `<app-data-table [table]="table" />`,
})
class AutoLayoutHost {
  readonly table = injectTable(() => ({
    features: basicFeatures,
    columns: [{ accessorKey: 'nombre', header: 'Nombre' }],
    data: [{ nombre: 'Ana' }],
  }));
}

const originalResizeObserver = globalThis.ResizeObserver;

describe('DataTable', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    globalThis.ResizeObserver = FakeResizeObserver as unknown as typeof ResizeObserver;
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
      configurable: true,
      get(this: HTMLElement) {
        return isContainer(this) ? viewportWidth : 0;
      },
    });
    Object.defineProperty(HTMLElement.prototype, 'scrollWidth', {
      configurable: true,
      get(this: HTMLElement) {
        return isContainer(this) ? SCROLL_WIDTH : 0;
      },
    });
  });

  afterEach(() => {
    globalThis.ResizeObserver = originalResizeObserver;
    // Vuelven las implementaciones de jsdom (heredadas de Element).
    delete (HTMLElement.prototype as { clientWidth?: number }).clientWidth;
    delete (HTMLElement.prototype as { scrollWidth?: number }).scrollWidth;
    viewportWidth = 1240;
  });

  async function render<T>(host: new () => T): Promise<ComponentFixture<T>> {
    const fixture = TestBed.createComponent(host);
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture;
  }

  const headers = (fixture: ComponentFixture<unknown>) =>
    [...(fixture.nativeElement as HTMLElement).querySelectorAll('th')] as HTMLTableCellElement[];

  it('fija las columnas start/end con sus desplazamientos y divisores', async () => {
    const fixture = await render(PinnedHost);
    const [sel, nombre, a, , , estado, accion] = headers(fixture);

    expect(sel.style.position).toBe('sticky');
    expect(sel.style.getPropertyValue('inset-inline-start')).toBe('0px');
    expect(nombre.style.getPropertyValue('inset-inline-start')).toBe('56px');
    expect(estado.style.getPropertyValue('inset-inline-end')).toBe('120px');
    expect(accion.style.getPropertyValue('inset-inline-end')).toBe('0px');
    expect(a.style.position).toBe('');

    // Divisores entre grupos fijos y centro; la columna de checks va unida a la siguiente.
    expect(sel.classList).not.toContain('border-e');
    expect(nombre.classList).toContain('border-e');
    expect(estado.classList).toContain('border-s');
    expect(accion.classList).toContain('border-s');
  });

  it('usa anchos fijos y hace la región desplazable accesible por teclado', async () => {
    const fixture = await render(PinnedHost);
    const element = fixture.nativeElement as HTMLElement;
    const container = element.querySelector<HTMLElement>('[data-slot=table-container]')!;
    const table = element.querySelector('table')!;

    // 56 + 200 + 3 × 160 + 160 + 120
    expect(table.style.width).toBe('1016px');
    expect(table.classList).toContain('table-fixed');
    expect([...element.querySelectorAll('col')].map((col) => col.style.width)).toEqual([
      '56px',
      '200px',
      '160px',
      '160px',
      '160px',
      '160px',
      '120px',
    ]);
    expect(container.getAttribute('role')).toBe('region');
    expect(container.getAttribute('tabindex')).toBe('0');
    // Nombre propio de la región (no repite el de la sección): título + "tabla con desplazamiento horizontal".
    const [titulo, pista] = container.getAttribute('aria-labelledby')!.split(' ');
    expect(titulo).toBe('titulo');
    expect(element.querySelector(`#${pista}`)?.textContent).toBe('tabla con desplazamiento horizontal');
    expect(container.classList).toContain('pb-2');
    // Densidad compacta: filas de 48px.
    expect(element.querySelector('td')?.classList).toContain('h-12');
  });

  it('desactiva las columnas fijas si no queda espacio para el centro', async () => {
    viewportWidth = 600;
    const fixture = await render(PinnedHost);

    for (const th of headers(fixture)) {
      expect(th.style.position).toBe('');
      expect(th.classList).not.toContain('border-e');
      expect(th.classList).not.toContain('border-s');
    }
  });

  it('sin anchos registrados mantiene el diseño automático y no fija nada', async () => {
    viewportWidth = 2000;
    const fixture = await render(AutoLayoutHost);
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('colgroup')).toBeNull();
    expect(element.querySelector('table')?.classList).not.toContain('table-fixed');
    expect(element.querySelector('[data-slot=table-container]')?.hasAttribute('role')).toBe(false);
  });
});
