import { Overlay, OverlayContainer, OverlayPositionBuilder } from '@angular/cdk/overlay';
import { Dialog } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, Injectable, type Provider } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { BrnDialogService } from '@spartan-ng/brain/dialog';
import { BrnOverlayService } from '@spartan-ng/brain/overlay';

/**
 * Clase del ámbito de estilos del micro front. Debe coincidir con `scope` en `.postcssrc.json`:
 * el build encierra toda la hoja global (`src/styles.css`) dentro de esta clase.
 */
export const MF_SCOPE_CLASS = 'mf-conciliaciones';

/**
 * Raíz de las rutas que expone el micro front: lleva la clase del ámbito, así sus estilos solo
 * aplican dentro de ella y no tocan al orquestador.
 */
@Component({
  selector: 'app-mf-scope',
  imports: [RouterOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: `${MF_SCOPE_CLASS} block` },
  template: '<router-outlet />',
})
export class MfScope { }

/**
 * Contenedor de overlays propio del micro front (select, calendario, modales). CDK los dibuja en el
 * `body`, fuera de `MfScope`; este contenedor lleva la clase del ámbito para que tengan sus estilos.
 */
@Injectable()
export class MfOverlayContainer extends OverlayContainer {
  protected override _createContainer(): void {
    super._createContainer();
    this._containerElement?.classList.add(MF_SCOPE_CLASS);
  }
}

/**
 * Proveedores de la ruta raíz del micro front. Los servicios de overlay de CDK y spartan se crean
 * de nuevo en esta ruta para que usen `MfOverlayContainer` y no el contenedor del orquestador.
 */
export function provideMfScope(): Provider[] {
  return [
    { provide: OverlayContainer, useClass: MfOverlayContainer },
    Overlay,
    OverlayPositionBuilder,
    Dialog,
    BrnOverlayService,
    BrnDialogService,
  ];
}
