import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';

import { API_BASE_URL } from '../config/api-base-url';
import { ApiError, type ApiResponse } from '../http/api-response';
import type { ViewTemplate } from './vista.model';
import { FUENTES, TIPO_BLOCK, VistasService } from './vistas.service';

function ok<T>(resultado: T): ApiResponse<T> {
  return { codigoEstado: 200, respuestaEstado: true, mensaje: null, errores: [], mensajeError: null, resultado };
}

const PLANTILLA: ViewTemplate = {
  schemaVersion: '1.1.0',
  layout: { type: 'stack', items: [{ blockId: 'casos' }] },
  blocks: [{ id: 'casos', type: 'table', dataSource: {}, table: { rowId: 'id', columns: [] } }],
};

describe('VistasService', () => {
  let service: VistasService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: API_BASE_URL, useValue: '/api' }],
    });
    service = TestBed.inject(VistasService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  const expectPlantilla = (tipoBlock: number) =>
    http.expectOne(
      (req) =>
        req.url === '/api/Conciliaciones/subprocesos-ui/plantilla' &&
        req.params.get('reglaId') === 'r1' &&
        req.params.get('tipoBlock') === String(tipoBlock),
    );

  it('lee la plantilla guardada como texto JSON y no la vuelve a pedir para la misma regla', async () => {
    const primera = firstValueFrom(service.getPlantillaRegla('r1'));
    expectPlantilla(TIPO_BLOCK.regla).flush(ok({ plantilla: JSON.stringify(PLANTILLA) }));
    expect(await primera).toEqual(PLANTILLA);

    // Segunda vez: sale de la caché (`http.verify` falla si hubiera otra petición).
    expect(await firstValueFrom(service.getPlantillaRegla('r1'))).toEqual(PLANTILLA);
  });

  it('una plantilla con texto que no es JSON o sin plantilla es un error para la pantalla', async () => {
    const invalida = firstValueFrom(service.getPlantillaCaso('r1'));
    expectPlantilla(TIPO_BLOCK.detalle).flush(ok({ plantilla: '{ no es json' }));
    await expect(invalida).rejects.toEqual(new ApiError('La plantilla no es un JSON válido.', 0, []));

    const vacia = firstValueFrom(service.getPlantillaCaso('r1'));
    expectPlantilla(TIPO_BLOCK.detalle).flush(ok({ plantilla: null }));
    await expect(vacia).rejects.toEqual(new ApiError('La regla no tiene una plantilla configurada.', 0, []));
  });

  it('las fuentes sin `data` llegan como lista vacía', async () => {
    const fuentes = firstValueFrom(service.getFuentes(FUENTES.fuentesDetalle.path));
    http.expectOne('/api/Conciliaciones/fuentes-detalle').flush(ok(null));
    expect(await fuentes).toEqual({ data: [] });
  });

  it('una página sin `query` ni paginación solo envía el orden', async () => {
    const pagina = firstValueFrom(service.getPagina('/casos', { sort: [{ id: 'fecha', desc: true }] }));
    const req = http.expectOne((r) => r.url === '/api/casos');
    expect(req.request.params.keys()).toEqual(['sort']);
    req.flush(ok({ rows: [] }));
    expect((await pagina).rows).toEqual([]);
  });
});
