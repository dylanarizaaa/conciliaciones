import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { API_BASE_URL } from '../../core/config/api-base-url';
import type { ApiResponse } from '../../core/http/api-response';
import type { ProyectosResultado } from '../../core/data-access/proyecto.model';
import { Home } from './home';

const URL = '/api/Conciliaciones/proyectos';

function respuesta(data: ProyectosResultado['data']): ApiResponse<ProyectosResultado> {
  return {
    codigoEstado: 200,
    respuestaEstado: true,
    mensaje: null,
    errores: [],
    mensajeError: null,
    resultado: { data },
  };
}

describe('Home', () => {
  let fixture: ComponentFixture<Home>;
  let http: HttpTestingController;
  let element: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Home],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: '/api' },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Home);
    http = TestBed.inject(HttpTestingController);
    element = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  it('muestra el encabezado y skeletons mientras carga', () => {
    expect(element.querySelector('h1')?.textContent).toContain('Conciliaciones');
    expect(element.querySelector('h2')?.textContent).toContain('Plataformas');
    expect(element.querySelectorAll('app-status-card-skeleton').length).toBe(4);

    http.expectOne(URL).flush(respuesta([]));
  });

  it('renderiza una tarjeta por plataforma con sus métricas formateadas', async () => {
    http.expectOne(URL).flush(
      respuesta([
        { proyectoId: 'a', nombreProyecto: 'Inter Pay', monto: 13570000, cantidad: 50 },
        { proyectoId: 'b', nombreProyecto: 'Inter App', monto: 2300000, cantidad: 18 },
      ]),
    );
    await fixture.whenStable();

    const cards = element.querySelectorAll('app-status-card');
    expect(cards.length).toBe(2);
    expect(element.querySelector('app-status-card-skeleton')).toBeNull();

    const text = cards[0].textContent?.replace(/\s+/g, ' ');
    expect(text).toContain('Inter Pay');
    expect(text).toContain('50');
    expect(text).toContain('$ 13.570.000');
    expect(text).toContain('Monto afectado');
  });

  it('enlaza cada tarjeta con la pantalla de su plataforma', async () => {
    http.expectOne(URL).flush(
      respuesta([{ proyectoId: 'abc', nombreProyecto: 'Portal', monto: 0, cantidad: 0 }]),
    );
    await fixture.whenStable();

    const link = element.querySelector<HTMLAnchorElement>('app-status-card a')!;
    expect(link.textContent?.trim()).toBe('Portal');
    expect(link.getAttribute('href')).toBe('/plataformas/abc');
  });

  it('muestra el estado vacío cuando no hay plataformas', async () => {
    http.expectOne(URL).flush(respuesta([]));
    await fixture.whenStable();

    expect(element.textContent).toContain('No hay plataformas con diferencias.');
  });

  it('muestra un error con opción de reintentar', async () => {
    http.expectOne(URL).flush(null, { status: 500, statusText: 'Server Error' });
    await fixture.whenStable();

    expect(element.querySelector('[role="alert"]')?.textContent).toContain(
      'No pudimos cargar las plataformas.',
    );

    element.querySelector<HTMLButtonElement>('[role="alert"] button')!.click();
    fixture.detectChanges();

    http.expectOne(URL).flush(respuesta([]));
    await fixture.whenStable();
    expect(element.querySelector('[role="alert"]')).toBeNull();
  });
});
