import { TestBed } from '@angular/core/testing';

import { SummaryCard } from './summary-card';

describe('SummaryCard', () => {
  it('sin fecha de actualización no muestra el bloque de la fecha', async () => {
    const fixture = TestBed.createComponent(SummaryCard);
    fixture.componentRef.setInput('metrics', [{ value: '3', label: 'Casos' }]);
    await fixture.whenStable();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.textContent).toContain('Casos');
    expect(element.querySelector('time')).toBeNull();
  });

  it('con fecha la muestra legible y en ISO para las tecnologías de asistencia', async () => {
    const fixture = TestBed.createComponent(SummaryCard);
    const fecha = new Date(2026, 10, 20, 9, 5);
    fixture.componentRef.setInput('lastUpdate', fecha);
    await fixture.whenStable();

    const time = (fixture.nativeElement as HTMLElement).querySelector('time');
    expect(time?.getAttribute('datetime')).toBe(fecha.toISOString());
    expect(time?.textContent).toContain('Última actualización');
  });
});
