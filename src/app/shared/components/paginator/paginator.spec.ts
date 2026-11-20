import { TestBed } from '@angular/core/testing';

import { Paginator } from './paginator';

async function crear(page: number, totalPages: number) {
  const fixture = TestBed.createComponent(Paginator);
  fixture.componentRef.setInput('page', page);
  fixture.componentRef.setInput('totalPages', totalPages);
  const emitidas: number[] = [];
  fixture.componentInstance.pageChange.subscribe((value) => emitidas.push(value));
  await fixture.whenStable();
  const element = fixture.nativeElement as HTMLElement;
  const input = element.querySelector('input') as HTMLInputElement;
  const escribir = async (value: string) => {
    input.value = value;
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    await fixture.whenStable();
  };
  return { element, input, emitidas, escribir };
}

describe('Paginator', () => {
  it('salta a la página escrita, acotada entre 1 y el total', async () => {
    const { input, emitidas, escribir } = await crear(2, 5);

    await escribir('9');
    expect(emitidas).toEqual([5]);
    expect(input.value).toBe('5');

    await escribir('0');
    expect(emitidas).toEqual([5, 1]);
  });

  it('un valor que no es un número restaura la página actual sin emitir', async () => {
    const { input, emitidas, escribir } = await crear(3, 5);

    await escribir('abc');
    expect(input.value).toBe('3');
    expect(emitidas).toEqual([]);
  });

  it('escribir la página actual no emite un cambio', async () => {
    const { emitidas, escribir } = await crear(3, 5);

    await escribir('3');
    expect(emitidas).toEqual([]);
  });

  it('las flechas se deshabilitan en los extremos', async () => {
    const { element } = await crear(1, 1);
    const [anterior, siguiente] = element.querySelectorAll('button');
    expect(anterior.disabled).toBe(true);
    expect(siguiente.disabled).toBe(true);
  });
});
