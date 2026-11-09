import { Component, signal } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { injectTable, type RowSelectionState } from '@tanstack/angular-table';
import type { TableDefinition, TableRow } from '../../../../core/data-access/vista.model';
import { DataTable } from '../data-table';
import { buildTemplateTable, DEFAULT_COLUMN_SIZE, TEMPLATE_TABLE_FEATURES } from './template-table';

const DEFINITION: TableDefinition = {
  rowId: 'id',
  selection: { mode: 'multi' },
  columns: [
    {
      id: 'sel',
      header: { component: 'SelectAllCheckbox', inputs: { ariaLabel: 'Seleccionar todo' } },
      cell: { component: 'RowCheckbox', inputs: { ariaLabel: 'Seleccionar a {cliente.nombre}' } },
      meta: { width: 56 },
      pin: 'start',
    },
    {
      id: 'nombre',
      accessorKey: 'cliente.nombre',
      header: { component: 'SortIndicator', inputs: { label: 'Cliente' } },
      cell: {
        component: 'TextCell',
        inputs: { emphasis: 'lead', secondaryAccessorKey: 'cliente.documento', truncate: true },
      },
      enableSorting: true,
      meta: { width: 200 },
      pin: 'start',
    },
    {
      id: 'valores',
      header: 'Valores',
      columns: [
        {
          id: 'monto',
          accessorKey: 'monto',
          header: 'Monto',
          cell: { component: 'CurrencyCell', inputs: { emphasis: 'highlight', currencyField: 'moneda' } },
          meta: { align: 'end' },
        },
        { id: 'tasa', accessorKey: 'tasa', header: 'Tasa', cell: { component: 'PercentCell' } },
      ],
    },
    {
      id: 'cantidad',
      accessorKey: 'cantidad',
      header: 'Cantidad',
      cell: { component: 'NumberCell', inputs: { maximumFractionDigits: 0 } },
    },
    {
      id: 'fecha',
      accessorKey: 'fecha',
      header: 'Fecha',
      cell: {
        component: 'DateCell',
        inputs: { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Bogota' },
      },
    },
    { id: 'activo', accessorKey: 'activo', header: 'Activo', cell: { component: 'BooleanCell' } },
    {
      id: 'estado',
      accessorKey: 'estado',
      header: 'Estado',
      cell: {
        component: 'BadgeCell',
        inputs: {
          variants: { P: { label: 'Pendiente', tone: 'danger' } },
          fallback: { label: 'Otro', tone: 'neutral' },
        },
      },
      pin: 'end',
    },
    { id: 'nota', accessorKey: 'nota', header: 'Nota', hidden: true },
    {
      id: 'accion',
      header: 'Acción',
      cell: {
        component: 'LinkCell',
        inputs: {
          label: 'Ver',
          ariaLabel: 'Ver el caso {id}',
          route: ['casos', '{id}'],
          visibleWhen: { field: 'estado', equals: 'P' },
        },
      },
      meta: { width: 'hug' },
      pin: 'end',
    },
  ],
};

const ROWS: TableRow[] = [
  {
    id: 'C1',
    cliente: { nombre: 'Ana', documento: 'CC 1' },
    monto: -50000,
    moneda: 'COP',
    tasa: 0.25,
    cantidad: 1200,
    fecha: '2026-04-19T17:00:00-05:00',
    activo: true,
    estado: 'P',
    nota: 'x',
  },
  {
    id: 'C2',
    cliente: { nombre: 'Luis', documento: null },
    monto: null,
    moneda: null,
    tasa: null,
    cantidad: null,
    fecha: 'no es fecha',
    activo: null,
    estado: 'Z',
    nota: null,
  },
];

const text = (element: Element | null | undefined) =>
  element?.textContent?.replace(/\s+/g, ' ').trim() ?? '';

@Component({
  imports: [DataTable],
  template: `<app-data-table [table]="table" labelledBy="titulo" />`,
})
class Host {
  readonly built = buildTemplateTable(DEFINITION);
  readonly selection = signal<RowSelectionState>({});
  readonly table = injectTable(() => ({
    features: TEMPLATE_TABLE_FEATURES,
    columns: this.built.columns,
    data: ROWS,
    getRowId: this.built.getRowId,
    state: {
      rowSelection: this.selection(),
      columnPinning: this.built.columnPinning,
      columnVisibility: this.built.columnVisibility,
    },
    onRowSelectionChange: (updater: RowSelectionState | ((old: RowSelectionState) => RowSelectionState)) =>
      this.selection.update((current) => (typeof updater === 'function' ? updater(current) : updater)),
    enableRowSelection: true,
  }));
}

describe('buildTemplateTable', () => {
  it('traduce pin, hidden y rowId al estado de TanStack', () => {
    const built = buildTemplateTable(DEFINITION);

    expect(built.columnPinning).toEqual({ start: ['sel', 'nombre'], end: ['estado', 'accion'] });
    expect(built.columnVisibility).toEqual({ nota: false });
    expect(built.selectable).toBe(true);
    expect(built.getRowId(ROWS[0], 0)).toBe('C1');
    expect(built.getRowId({}, 3)).toBe('fila-3');
  });

  it('arma columnas de datos y de presentación con su ancho y metadatos', () => {
    const [sel, nombre, valores, cantidad] = buildTemplateTable(DEFINITION).columns;

    expect(sel).not.toHaveProperty('accessorFn');
    expect(sel.enableSorting).toBe(false);
    expect(sel.meta).toEqual({ className: undefined, kind: 'selection' });
    expect(nombre.size).toBe(200);
    expect(nombre.enableSorting).toBe(true);
    const accessor = (nombre as unknown as { accessorFn: (row: TableRow, index: number) => unknown })
      .accessorFn;
    expect(accessor(ROWS[0], 0)).toBe('Ana');
    expect((valores as unknown as { columns: unknown[] }).columns).toHaveLength(2);
    expect(cantidad.size).toBe(DEFAULT_COLUMN_SIZE);
  });

  it('pinta como texto un componente fuera del catálogo y lo avisa en consola', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const built = buildTemplateTable({
      rowId: 'id',
      columns: [
        { id: 'x', accessorKey: 'x', header: 'X', cell: { component: 'HtmlCell' } as never },
      ],
    });

    expect(built.columns).toHaveLength(1);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('HtmlCell'));
    warn.mockRestore();
  });
});

describe('Tabla paramétrica (catálogo de celdas)', () => {
  let fixture: ComponentFixture<Host>;
  let element: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ providers: [provideRouter([])] }).compileComponents();
    fixture = TestBed.createComponent(Host);
    element = fixture.nativeElement;
    await fixture.whenStable();
  });

  const cells = (row: number) =>
    [...element.querySelectorAll(`tbody tr:nth-child(${row}) td`)] as HTMLTableCellElement[];

  it('pinta los encabezados en orden de columnas fijas, con grupos y sin las ocultas', () => {
    const [grupos, hojas] = [...element.querySelectorAll('thead tr')];

    expect([...grupos.querySelectorAll('th')].map(text)).toContain('Valores');
    expect(grupos.querySelector('th[colspan="2"]')).not.toBeNull();
    expect([...hojas.querySelectorAll('th')].map(text)).toEqual([
      '',
      'Cliente',
      'Monto',
      'Tasa',
      'Cantidad',
      'Fecha',
      'Activo',
      'Estado',
      'Acción',
    ]);
    expect(element.querySelector('colgroup')?.children).toHaveLength(9);
  });

  it('formatea cada tipo de celda según sus inputs', () => {
    const [, nombre, monto, tasa, cantidad, fecha, activo, estado, accion] = cells(1);

    const [principal, secundaria] = [...nombre.querySelectorAll('app-text-cell > span')];
    expect(text(principal)).toBe('Ana');
    expect(principal.className).toContain('font-semibold');
    expect(principal.getAttribute('title')).toBe('Ana');
    expect(text(secundaria)).toBe('CC 1');
    expect(secundaria.className).toContain('text-xs');
    expect(text(monto).replace(/ /g, ' ')).toBe('-$ 50.000');
    expect(monto.querySelector('span')?.className).toContain('text-acento');
    expect(monto.className).toContain('text-end');
    expect(text(tasa)).toBe('25%');
    expect(text(cantidad)).toBe('1.200');
    expect(text(fecha)).toBe('19/04/26 5:00 p.m.');
    expect(fecha.querySelector('time')?.getAttribute('datetime')).toBe('2026-04-19T22:00:00.000Z');
    expect(text(activo)).toBe('Sí');
    expect(text(estado)).toBe('Pendiente');
    expect(estado.querySelector('span')?.className).toContain('bg-badge-danger');

    const link = accion.querySelector('a')!;
    expect(text(link)).toBe('Ver');
    expect(link.getAttribute('href')).toBe('/casos/C1');
    expect(link.getAttribute('aria-label')).toBe('Ver el caso C1');
  });

  it('muestra "Sin dato", el valor crudo de fechas inválidas y el estado por defecto', () => {
    const [, nombre, monto, tasa, cantidad, fecha, activo, estado, accion] = cells(2);

    expect(text(nombre)).toBe('Luis');
    for (const cell of [monto, tasa, cantidad, activo]) {
      expect(cell.querySelector('[aria-hidden="true"]')?.textContent).toBe('—');
      expect(cell.querySelector('.sr-only')?.textContent).toBe('Sin dato');
    }
    expect(text(fecha)).toBe('no es fecha');
    expect(text(estado)).toBe('Otro');
    // `visibleWhen`: la acción solo aparece en filas con estado "P".
    expect(accion.querySelector('a')).toBeNull();
  });

  it('selecciona filas por rowId y refleja el estado intermedio en el encabezado', async () => {
    const todas = element.querySelector<HTMLButtonElement>('[aria-label="Seleccionar todo"]')!;
    const ana = element.querySelector<HTMLButtonElement>('[aria-label="Seleccionar a Ana"]')!;
    expect(todas.getAttribute('aria-checked')).toBe('false');

    ana.click();
    await fixture.whenStable();
    expect(fixture.componentInstance.selection()).toEqual({ C1: true });
    expect(ana.getAttribute('aria-checked')).toBe('true');
    expect(todas.getAttribute('aria-checked')).toBe('mixed');

    todas.click();
    await fixture.whenStable();
    expect(fixture.componentInstance.selection()).toEqual({ C1: true, C2: true });
    expect(todas.getAttribute('aria-checked')).toBe('true');

    todas.click();
    await fixture.whenStable();
    expect(fixture.componentInstance.selection()).toEqual({});
  });
});
