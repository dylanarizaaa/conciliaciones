import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { routes } from './app.routes';
import { API_BASE_URL } from './core/config/api-base-url';

describe('Rutas', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: '/api' },
      ],
    });
  });

  it('lleva el "Ver detalle" de la plantilla actual del back (`conciliacionId/:id`) a la ruta del detalle', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/plataformas/p1/categorias/c1/canales/s1/reglas/r1/conciliacionId/u-1');

    expect(TestBed.inject(Router).url).toBe('/plataformas/p1/categorias/c1/canales/s1/reglas/r1/casos/u-1');
    // Las pantallas cuelgan de la raíz con el ámbito de estilos del micro front.
    expect(harness.routeNativeElement?.tagName.toLowerCase()).toBe('app-mf-scope');
    expect(harness.routeNativeElement?.querySelector('app-detail')).not.toBeNull();
  });
});
