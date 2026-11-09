import { ChangeDetectionStrategy, Component } from '@angular/core';

/** Celda sin dato: muestra "—" y lo anuncia como "Sin dato" a los lectores de pantalla. */
@Component({
  selector: 'app-empty-value',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span aria-hidden="true">—</span><span class="sr-only">Sin dato</span>`,
})
export class EmptyValue {}
