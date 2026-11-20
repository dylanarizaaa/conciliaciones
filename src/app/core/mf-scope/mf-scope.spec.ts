import { Dialog } from '@angular/cdk/dialog';
import { Overlay, OverlayContainer, OverlayPositionBuilder } from '@angular/cdk/overlay';
import {
  Component,
  createEnvironmentInjector,
  EnvironmentInjector,
  type ProviderToken,
} from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, type Route, Router } from '@angular/router';
import { BrnDialogService } from '@spartan-ng/brain/dialog';
import { BrnOverlayService } from '@spartan-ng/brain/overlay';
import { routes as ventasRoutes } from '../../features/discount-sales/discount-sales.routes';
import { routes as movilizadosRoutes } from '../../features/mobilized/mobilized.routes';
import { MF_SCOPE_CLASS, MfOverlayContainer, MfScope, provideMfScope } from './mf-scope';

@Component({ template: '<p>pantalla</p>' })
class Pantalla {}

describe('Ámbito de estilos del micro front', () => {
  afterEach(() => {
    document.querySelectorAll('.cdk-overlay-container').forEach((el) => el.remove());
  });

  it('la raíz de las rutas lleva la clase del ámbito y muestra la pantalla hija', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: '', component: MfScope, children: [{ path: '', component: Pantalla }] },
        ]),
      ],
    });
    const fixture = TestBed.createComponent(MfScope);
    await TestBed.inject(Router).navigateByUrl('/');
    await fixture.whenStable();

    const host = fixture.nativeElement as HTMLElement;
    expect(MF_SCOPE_CLASS).toBe('mf-reportes');
    expect(host.classList).toContain('mf-reportes');
    expect(host.textContent).toContain('pantalla');
  });

  it('los overlays se dibujan en un contenedor propio con la clase del ámbito', () => {
    TestBed.configureTestingModule({});
    const routeInjector = createEnvironmentInjector(
      provideMfScope(),
      TestBed.inject(EnvironmentInjector),
    );

    const propio = routeInjector.get(OverlayContainer);
    expect(propio).toBeInstanceOf(MfOverlayContainer);
    expect(propio.getContainerElement().classList).toContain('mf-reportes');
    // El del orquestador (raíz) sigue sin la clase.
    expect(TestBed.inject(OverlayContainer).getContainerElement().classList).not.toContain(
      'mf-reportes',
    );

    // Los servicios de overlay se crean de nuevo en la ruta para usar el contenedor propio.
    const servicios: ProviderToken<unknown>[] = [
      Overlay,
      OverlayPositionBuilder,
      Dialog,
      BrnOverlayService,
      BrnDialogService,
    ];
    for (const token of servicios) {
      expect(routeInjector.get(token)).not.toBe(TestBed.inject(token));
    }
    const overlayRef = routeInjector.get(Overlay).create();
    expect(overlayRef.hostElement.parentElement).toBe(propio.getContainerElement());
    overlayRef.dispose();
  });

  it.each([
    ['ventas con descuento', ventasRoutes, 'Ventas con descuento'],
    ['movilizados por cliente', movilizadosRoutes, 'Movilizados por cliente'],
  ])('las rutas expuestas de %s se envuelven en el ámbito', async (_, routes, title) => {
    const [raiz] = routes as Route[];
    expect(raiz.component).toBe(MfScope);
    expect(raiz.providers).toEqual(provideMfScope());
    const [pantalla] = raiz.children ?? [];
    expect(pantalla.title).toBe(title);
    expect(await pantalla.loadComponent?.()).toBeDefined();
  });
});
