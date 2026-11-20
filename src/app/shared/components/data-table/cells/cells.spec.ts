import { TestBed } from '@angular/core/testing';

import { toFiniteNumber, toText } from './cell-styles';
import { cellForType, valueCellResolver, type ValueCellView } from './value-cell';

/** Pinta la celda que devuelve el catálogo y entrega su texto visible. */
async function pintar({ component, inputs }: ValueCellView): Promise<HTMLElement> {
  const fixture = TestBed.createComponent(component);
  for (const [name, value] of Object.entries(inputs)) {
    fixture.componentRef.setInput(name, value);
  }
  await fixture.whenStable();
  return fixture.nativeElement as HTMLElement;
}

const text = (element: HTMLElement) => element.textContent?.replace(/\s+/g, ' ').trim() ?? '';

describe('Celdas del catálogo', () => {
  describe('valores de entrada', () => {
    it('solo acepta números finitos (también en texto)', () => {
      expect(toFiniteNumber(12.5)).toBe(12.5);
      expect(toFiniteNumber(Number.POSITIVE_INFINITY)).toBeNull();
      expect(toFiniteNumber(' 42 ')).toBe(42);
      expect(toFiniteNumber('12abc')).toBeNull();
      expect(toFiniteNumber('   ')).toBeNull();
      expect(toFiniteNumber(true)).toBeNull();
    });

    it('un texto vacío o solo con espacios cuenta como sin dato', () => {
      expect(toText('  ')).toBeNull();
      expect(toText(undefined)).toBeNull();
      expect(toText(0)).toBe('0');
    });
  });

  describe('BadgeCell', () => {
    const variants = { CONCILIADO: { label: 'Conciliado', tone: 'success' as const } };

    it('traduce el valor con su variante y su tono', async () => {
      const element = await pintar(
        valueCellResolver({ component: 'BadgeCell', inputs: { variants } })('CONCILIADO', {}),
      );
      expect(text(element)).toBe('Conciliado');
      expect(element.querySelector('span')?.className).toContain('bg-badge-success');
    });

    it('un valor sin variante usa `fallback` o, si no hay, el propio valor en tono neutro', async () => {
      const conFallback = await pintar(
        valueCellResolver({
          component: 'BadgeCell',
          inputs: { variants, fallback: { label: 'Sin estado', tone: 'warning' } },
        })('OTRO', {}),
      );
      expect(text(conFallback)).toBe('Sin estado');
      expect(conFallback.querySelector('span')?.className).toContain('bg-badge-warning');

      const sinFallback = await pintar(
        valueCellResolver({ component: 'BadgeCell', inputs: { variants } })('OTRO', {}),
      );
      expect(text(sinFallback)).toBe('OTRO');
      expect(sinFallback.querySelector('span')?.className).toContain('bg-badge-neutral');
    });

    it('un tono fuera del catálogo se pinta neutro y sin valor no hay badge', async () => {
      const tonoDesconocido = await pintar(
        valueCellResolver({
          component: 'BadgeCell',
          inputs: { variants: { X: { label: 'Equis', tone: 'morado' as never } } },
        })('X', {}),
      );
      expect(tonoDesconocido.querySelector('span')?.className).toContain('bg-badge-neutral');

      const vacio = await pintar(valueCellResolver({ component: 'BadgeCell', inputs: { variants } })(null, {}));
      expect(vacio.querySelector('app-empty-value')).not.toBeNull();
    });
  });

  describe('BooleanCell', () => {
    it('muestra "Sí" / "No" (o las etiquetas de la plantilla) y sin dato para otros valores', async () => {
      const celda = valueCellResolver({ component: 'BooleanCell' });
      expect(text(await pintar(celda(true, {})))).toBe('Sí');
      expect(text(await pintar(celda('false', {})))).toBe('No');
      expect((await pintar(celda('quizá', {}))).querySelector('app-empty-value')).not.toBeNull();

      const propia = valueCellResolver({
        component: 'BooleanCell',
        inputs: { trueLabel: 'Activo', falseLabel: 'Inactivo' },
      });
      expect(text(await pintar(propia(false, {})))).toBe('Inactivo');
    });
  });

  describe('DateCell', () => {
    it('una fecha que no se puede leer se muestra tal como llega', async () => {
      const element = await pintar(valueCellResolver({ component: 'DateCell' })('ayer', {}));
      expect(text(element)).toBe('ayer');
    });
  });

  describe('celdas numéricas', () => {
    it('NumberCell respeta los decimales de la plantilla y el énfasis', async () => {
      const element = await pintar(
        valueCellResolver({
          component: 'NumberCell',
          inputs: { maximumFractionDigits: 1, emphasis: 'lead' },
        })(1250.56, {}),
      );
      expect(text(element)).toBe('1.250,6');
      expect(element.querySelector('span')?.className).toContain('font-semibold');
    });

    it('un énfasis fuera del catálogo no agrega clases', async () => {
      const element = await pintar(
        valueCellResolver({ component: 'NumberCell', inputs: { emphasis: 'otro' as never } })(3, {}),
      );
      expect(element.querySelector('span')?.className.trim()).toBe('tabular-nums');
    });

    it('CurrencyCell con un código de moneda inválido muestra el número sin símbolo', async () => {
      const element = await pintar(
        valueCellResolver({ component: 'CurrencyCell', inputs: { currency: 'NO-ES-MONEDA' } })(900000, {}),
      );
      expect(text(element)).toBe('900.000');
    });

    it('CurrencyCell toma la moneda de la fila con `currencyField`', async () => {
      const element = await pintar(
        valueCellResolver({ component: 'CurrencyCell', inputs: { currencyField: 'moneda' } })(10, {
          moneda: 'USD',
        }),
      );
      expect(text(element)).toContain('US$');
    });
  });

  describe('TextCell', () => {
    it('un énfasis fuera del catálogo deja solo el ajuste de línea', async () => {
      const element = await pintar(
        valueCellResolver({ component: 'TextCell', inputs: { emphasis: 'otro' as never } })('Hola', {}),
      );
      expect(element.querySelector('span')?.className.trim()).toBe('truncate');
    });

    it('sin definición de celda se usa TextCell', async () => {
      expect(text(await pintar(valueCellResolver()('Hola', {})))).toBe('Hola');
    });
  });

  describe('cellForType', () => {
    it('la plantilla puede cambiar la celda de un tipo sin distinguir mayúsculas', () => {
      expect(cellForType(' Moneda ', { MONEDA: { component: 'NumberCell' } })).toEqual({
        component: 'NumberCell',
      });
      expect(cellForType('fecha', { moneda: { component: 'NumberCell' } })).toEqual({
        component: 'DateCell',
        inputs: { dateStyle: 'medium' },
      });
      expect(cellForType('desconocido')).toEqual({ component: 'TextCell' });
      expect(cellForType(null)).toEqual({ component: 'TextCell' });
    });
  });
});
