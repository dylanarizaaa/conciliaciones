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
import postcssConfig from '../../../../.postcssrc.json';
import { routes } from '../../app.routes';
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
    expect(MF_SCOPE_CLASS).toBe('mf-conciliaciones');
    expect(host.classList).toContain(MF_SCOPE_CLASS);
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
    expect(propio.getContainerElement().classList).toContain(MF_SCOPE_CLASS);
    // El del orquestador (raíz) sigue sin la clase.
    expect(TestBed.inject(OverlayContainer).getContainerElement().classList).not.toContain(
      MF_SCOPE_CLASS,
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

  it('la clase coincide con el ámbito con que el build encierra la hoja global', () => {
    const plugin = postcssConfig.plugins['./tools/postcss-mf-scope.cjs'];
    expect(plugin.scope).toBe(`.${MF_SCOPE_CLASS}`);
    expect(plugin.files).toEqual(['src/styles.css']);
  });

  it('las rutas expuestas se envuelven en el ámbito y cargan sus pantallas', async () => {
    const [raiz, ...otras] = routes;
    expect(otras).toHaveLength(0);
    expect(raiz.path).toBe('');
    expect(raiz.component).toBe(MfScope);
    expect(raiz.providers).toEqual(provideMfScope());

    const pantallas = (raiz.children ?? []).filter((ruta) => ruta.loadComponent);
    expect(pantallas.map((ruta) => ruta.title)).toEqual([
      'Conciliaciones',
      'Plataforma | Conciliaciones',
      'Categoría | Conciliaciones',
      'Canal | Conciliaciones',
      'Regla | Conciliaciones',
      'Detalle | Conciliaciones',
    ]);
    for (const pantalla of pantallas) {
      expect(await pantalla.loadComponent?.()).toBeDefined();
    }
  });
});
