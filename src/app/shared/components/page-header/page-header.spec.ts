import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { PageHeader } from './page-header';
import { PageHeaderActions } from './page-header-actions';

@Component({
  imports: [PageHeader, PageHeaderActions],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header title="Regla" [showBack]="true" (back)="volvio.set(true)">
      @if (conAcciones()) {
        <div appPageHeaderActions><button type="button">Resolver</button></div>
      }
    </app-page-header>
  `,
})
class Host {
  readonly conAcciones = signal(true);
  readonly volvio = signal(false);
}

describe('PageHeader', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
  });

  it('muestra la fila de acciones aunque no haya descripción', async () => {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('h1')?.textContent?.trim()).toBe('Regla');
    expect(element.querySelector('[appPageHeaderActions] button')?.textContent).toBe('Resolver');
    expect(element.querySelector('p')).toBeNull();
  });

  it('sin descripción ni acciones no pinta la fila', async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.conAcciones.set(false);
    await fixture.whenStable();

    expect((fixture.nativeElement as HTMLElement).querySelector('[appPageHeaderActions]')).toBeNull();
  });

  it('sin `backLink` la flecha emite `back`', async () => {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();

    const volver = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(
      'button[aria-label="Volver"]',
    );
    volver?.click();
    expect(fixture.componentInstance.volvio()).toBe(true);
  });
});
